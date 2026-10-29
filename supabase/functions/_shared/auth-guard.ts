import { EDGE_POLICIES, type EdgePolicy } from './edge-policies.ts';

/** A publishable/anon JWT is not an authenticated user. Never decode a JWT
 * locally and trust its role; validate human tokens with Supabase Auth. */
export type GuardDependencies = {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-job-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function denied(status: number, error: string, retryAfter?: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) },
  });
}

export function equalSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function bearer(req: Request, name: string): string {
  const auth = req.headers.get('authorization') ?? '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  // Browser WebSockets cannot set Authorization. Keep the user token out of
  // URLs, and select only hq-realtime (not the credential) on upgrade.
  if (name === 'openai-realtime-proxy') {
    const protocol = (req.headers.get('sec-websocket-protocol') ?? '')
      .split(',').map((value) => value.trim()).find((value) => value.startsWith('hq-auth.'));
    return protocol?.slice('hq-auth.'.length) ?? '';
  }
  return '';
}

async function bucketHash(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function forwardedAddress(req: Request): string {
  // Supabase ingress appends the observed peer to X-Forwarded-For. Never trust
  // a visitor-controlled leftmost entry. The global ceiling is a second bound
  // even if the ingress header changes or an attacker rotates addresses.
  const chain = (req.headers.get('x-forwarded-for') ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  return (chain.at(-1) ?? req.headers.get('cf-connecting-ip') ?? 'unknown').slice(0, 200);
}

type JsonObject = Record<string, unknown>;
async function boundedJson(req: Request): Promise<JsonObject | null> {
  if (req.method === 'GET') return {};
  if (Number(req.headers.get('content-length') ?? '0') > 131_072) return null;
  const reader = req.clone().body?.getReader();
  if (!reader) return {};
  let count = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    count += value.byteLength;
    if (count > 131_072) { void reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes) || '{}');
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch { return {}; } // The endpoint's schema returns its normal input error.
}

/** Return a denial/preflight response, or null after the request is authorized.
 * All credentials and protected queries fail closed. No request body is consumed. */
export async function guardEdgeRequest(
  req: Request,
  functionName: string,
  dependencies?: GuardDependencies,
): Promise<Response | null> {
  const deps = dependencies ?? {
    env: (name: string) => (globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined } } }).Deno.env.get(name),
    fetch: globalThis.fetch.bind(globalThis),
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const policy: EdgePolicy | undefined = EDGE_POLICIES[functionName];
  if (!policy) return denied(503, 'Endpoint authorization is not configured');
  if (!(policy.methods ?? ['POST']).includes(req.method)) return denied(405, 'Method not allowed');
  // The webhook handler owns verification over the *raw* body. Do not parse it
  // or treat any bearer credential as a substitute for its required signature.
  if (policy.mode === 'signed-webhook') return null;

  const url = deps.env('SUPABASE_URL');
  const service = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  const anon = deps.env('SUPABASE_ANON_KEY');
  if (!url || !service || !anon) return denied(503, 'Authorization service unavailable');
  const token = bearer(req, functionName);
  if (equalSecret(token, service)) return null;

  async function rpc(name: string, payload: JsonObject, jwt = service!): Promise<unknown> {
    const response = await deps.fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { apikey: jwt === service ? service! : anon!, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Authorization dependency returned ${response.status}`);
    return response.json();
  }

  async function consume(scope: string, key: string, limit: number, seconds: number): Promise<Response | null> {
    const result = await rpc('consume_public_rate_limit', {
      p_scope: scope, p_key: await bucketHash(key, service!), p_limit: limit, p_window_seconds: seconds,
    }) as { allowed?: boolean; retry_after?: number };
    if (result?.allowed !== true) return denied(429, 'Too many requests. Please try again later.', Math.max(1, Number(result?.retry_after) || seconds));
    return null;
  }

  try {
    const jobToken = req.headers.get('x-job-token') ?? '';
    if (policy.mode !== 'public' && jobToken.length >= 32 && jobToken.length <= 512) {
      if (await rpc('hq_verify_job_token', { p_function: functionName, p_token: jobToken }) === true) return null;
      // Keep the already deployed, function-specific checkout job credential.
      if (functionName === 'reconcile-checkouts' &&
        await rpc('verify_job_token', { p_job: 'reconcile-checkouts', p_token: jobToken }) === true) return null;
      return denied(401, 'Invalid job credential');
    }

    if (policy.mode === 'public') {
      const body = await boundedJson(req);
      if (body === null) return denied(413, 'Request body too large');
      const ipLimit = await consume(functionName, `ip:${forwardedAddress(req)}`, policy.limit!, policy.windowSeconds!);
      if (ipLimit) return ipLimit;
      const globalLimit = await consume(`${functionName}:daily`, 'global', policy.dailyGlobalLimit!, 86_400);
      if (globalLimit) return globalLimit;
      // A rotating caller must not turn the acknowledgement into an email bomb.
      if (functionName === 'submit-inbound-lead' && typeof body.email === 'string' && body.email.length <= 255) {
        return consume(`${functionName}:recipient`, body.email.trim().toLowerCase(), 3, 86_400);
      }
      return null;
    }

    if (!token || equalSecret(token, anon!)) return denied(401, 'Sign in required');
    const authResponse = await deps.fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon!, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000),
    });
    if (authResponse.status === 401 || authResponse.status === 403) return denied(401, 'Invalid or expired session');
    if (!authResponse.ok) return denied(503, 'Authorization service unavailable');
    const user = await authResponse.json() as { id?: string; is_anonymous?: boolean };
    if (!user.id || !UUID.test(user.id) || user.is_anonymous) return denied(401, 'Sign in required');
    const roleResponse = await deps.fetch(`${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&select=role`, {
      headers: { apikey: service!, Authorization: `Bearer ${service}` }, signal: AbortSignal.timeout(10_000),
    });
    if (!roleResponse.ok) return denied(503, 'Authorization service unavailable');
    const rows = await roleResponse.json() as Array<{ role?: string }>;
    if (!Array.isArray(rows)) return denied(503, 'Authorization service unavailable');
    const roles = rows.map((row) => row.role);
    if (roles.includes('admin')) return null;
    if (policy.mode === 'admin') return denied(403, 'Administrator permission required');
    if (roles.includes('client') || !roles.some((role) => ['owner', 'gm', 'manager', 'lead', 'shift_lead', 'staff', 'foh', 'boh'].includes(role ?? ''))) {
      return denied(403, 'Team permission required');
    }
    if (policy.mode === 'member') {
      return consume(`${functionName}:user`, user.id, functionName === 'openai-realtime-proxy' ? 6 : 60, 3600);
    }

    const body = await boundedJson(req);
    if (body === null) return denied(413, 'Request body too large');
    let projectId = policy.field ? body[policy.field] : null;
    if (policy.resource) {
      const id = body[policy.resource.field];
      if (typeof id !== 'string' || !UUID.test(id)) return denied(400, 'A valid resource ID is required');
      const resource = await deps.fetch(`${url}/rest/v1/${policy.resource.table}?id=eq.${id}&select=${policy.resource.projectColumn}&limit=1`, {
        headers: { apikey: service!, Authorization: `Bearer ${service}` }, signal: AbortSignal.timeout(10_000),
      });
      if (!resource.ok) return denied(503, 'Authorization service unavailable');
      const matches = await resource.json() as JsonObject[];
      projectId = matches[0]?.[policy.resource.projectColumn];
    }
    if (typeof projectId !== 'string' || !UUID.test(projectId)) return denied(403, 'Project management permission required');
    const allowed = await rpc('user_can_manage_project', { _project_id: projectId }, token);
    return allowed === true ? null : denied(403, 'Project management permission required');
  } catch {
    // Log only the dependency category; never request bodies, tokens or raw URLs.
    console.error(`[auth-guard:${functionName}] authorization or limiter dependency failed`);
    return denied(503, 'Authorization service unavailable');
  }
}

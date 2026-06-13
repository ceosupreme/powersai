// Toast Analytics API helper — OAuth2 client credentials + async report
// pattern (POST → reportRequestGuid → poll GET until 200).
//
// All endpoints live on https://ws-api.toasttab.com/era/v1/...
// Headers: Authorization: Bearer <token>. Do NOT send Toast-Restaurant-ID —
// Analytics endpoints operate at the management group level and reject it.
// Restaurant filter goes in the request body via `restaurantIds: [...]`.

export const TOAST_ANALYTICS_HOST = 'https://ws-api.toasttab.com';

interface AnalyticsAuthResponse {
  status?: string;
  token?: { accessToken: string; tokenType: string; expiresIn: number };
  message?: string;
}

// Per-credential token cache. Keyed by `cacheKey` (e.g. "shared", "sycamore").
// Each set of credentials gets its own cached token so multiple Toast
// management groups can run in the same edge-function instance.
interface CachedToken { token: string; expiresAt: number; }
const tokenCache = new Map<string, CachedToken>();

export interface AnalyticsAuthOptions {
  /** Override client ID. Defaults to env TOAST_ANALYTICS_CLIENT_ID. */
  clientId?: string;
  /** Override client secret. Defaults to env TOAST_ANALYTICS_CLIENT_SECRET. */
  clientSecret?: string;
  /** Cache key for this credential set. Defaults to "shared". */
  cacheKey?: string;
}

export async function getAnalyticsToken(opts: AnalyticsAuthOptions = {}): Promise<string> {
  const cacheKey = opts.cacheKey ?? 'shared';
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  // Refresh 60s before expiry to be safe.
  if (cached && now < cached.expiresAt - 60_000) return cached.token;

  const clientId = opts.clientId ?? Deno.env.get('TOAST_ANALYTICS_CLIENT_ID');
  const clientSecret = opts.clientSecret ?? Deno.env.get('TOAST_ANALYTICS_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error(`Toast Analytics credentials missing for cacheKey="${cacheKey}"`);
  }

  const res = await fetch(`${TOAST_ANALYTICS_HOST}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  });

  const text = await res.text();
  let parsed: AnalyticsAuthResponse;
  try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }

  if (!res.ok || parsed.status !== 'SUCCESS' || !parsed.token?.accessToken) {
    throw new Error(`Toast Analytics auth failed for "${cacheKey}" (HTTP ${res.status}): ${parsed.message ?? text.slice(0, 200)}`);
  }

  const token = parsed.token.accessToken;
  tokenCache.set(cacheKey, { token, expiresAt: now + (parsed.token.expiresIn * 1000) });
  return token;
}

function authHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export interface SubmitJobOptions {
  /** Path under /era/v1, e.g. 'metrics/day', 'labor/day', 'menu/day'. */
  path: string;
  /** Restaurant GUIDs to scope the report to. */
  restaurantIds: string[];
  /** YYYY-MM-DD (will be converted to YYYYMMDD integer for the API). */
  startBusinessDate: string;
  /** YYYY-MM-DD (will be converted to YYYYMMDD integer for the API). */
  endBusinessDate: string;
  /** Optional groupBy array, e.g. ['MENU_GROUP']. */
  groupBy?: string[];
  /** Optional excludedRestaurantIds. */
  excludedRestaurantIds?: string[];
  /** Tenant cache key (e.g. 'shared' | 'sycamore'). Drives advisory-lock scope. */
  tenantKey?: string;
}

function isoToCompact(d: string): number {
  // "2026-04-15" → 20260415
  return Number(d.replace(/-/g, ''));
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Per-path submit spacing (Phase B + cross-worker coordination) ─────
// Shared Toast management group rate-limits at the report-type level.
// Two layers:
//   1. Per-isolate `lastSubmitByPath` Map — fast-path local spacing so
//      sequential submits inside one worker don't hammer the DB lock.
//   2. pg_advisory_xact_lock per (tenantKey, path) via `toast_submit_lock`
//      RPC — atomic cross-isolate serialization so parallel workers on the
//      same Toast tenant don't collide. The lock is held while pg_sleep
//      enforces minimum spacing, then auto-released at txn end.
// check/day is the heaviest report → longest spacing.
const PATH_MIN_SPACING_MS: Record<string, number> = {
  'metrics/day': 750,
  'labor/day': 750,
  'menu/day': 750,
  'check/day': 2000,
};
const lastSubmitByPath = new Map<string, number>();

// Lazily-created supabase client for the advisory-lock RPC. Module-scoped so
// repeated submitJob calls reuse one client.
let _lockSupabase: any = null;
async function getLockClient(): Promise<any | null> {
  if (_lockSupabase) return _lockSupabase;
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return null;
    const mod = await import('https://esm.sh/@supabase/supabase-js@2');
    _lockSupabase = mod.createClient(url, key);
    return _lockSupabase;
  } catch (e) {
    console.warn(`[toast-analytics] could not init lock client: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// Stable 32-bit signed hash → fits safely in JS number AND postgres int8.
function hashSubmitKey(tenantKey: string, path: string): number {
  const s = tenantKey + ':' + path;
  let h = 5381 | 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) | 0; // force int32
  }
  return h;
}

async function awaitSubmitSlot(tenantKey: string, path: string): Promise<void> {
  const minSpacing = PATH_MIN_SPACING_MS[path] ?? 500;

  // Layer 1: local fast-path spacing — keeps a single isolate from
  // hammering the DB lock when it's iterating many days in a row.
  const last = lastSubmitByPath.get(path) ?? 0;
  const since = Date.now() - last;
  if (since < minSpacing) await delay(minSpacing - since);

  // Layer 2: cross-worker advisory lock. If the RPC is unreachable (network /
  // RLS / etc.) we still proceed — local spacing is the floor, not the only
  // protection. Toast's own 429 backoff catches anything that slips through.
  const client = await getLockClient();
  if (client) {
    try {
      const { error } = await client.rpc('toast_submit_lock', {
        p_key: hashSubmitKey(tenantKey, path),
        p_spacing_ms: minSpacing,
      });
      if (error) {
        console.warn(`[toast-analytics] submit-lock rpc failed (${tenantKey}/${path}): ${error.message} — local spacing only`);
      }
    } catch (e) {
      console.warn(`[toast-analytics] submit-lock rpc threw (${tenantKey}/${path}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const submittedAt = Date.now();
  lastSubmitByPath.set(path, submittedAt);
  console.log(`[TOAST-SUBMIT] tenant=${tenantKey} path=${path} spacing_ms=${minSpacing} t_iso=${new Date(submittedAt).toISOString()}`);
}

/**
 * Submit a Toast Analytics report request.
 * Returns the reportRequestGuid for later polling.
 */
export async function submitJob(token: string, opts: SubmitJobOptions): Promise<string> {
  await awaitSubmitSlot(opts.tenantKey ?? 'shared', opts.path);
  const url = `${TOAST_ANALYTICS_HOST}/era/v1/${opts.path}`;
  const body: Record<string, unknown> = {
    startBusinessDate: isoToCompact(opts.startBusinessDate),
    endBusinessDate: isoToCompact(opts.endBusinessDate),
    restaurantIds: opts.restaurantIds,
    excludedRestaurantIds: opts.excludedRestaurantIds ?? [],
  };
  if (opts.groupBy && opts.groupBy.length > 0) body.groupBy = opts.groupBy;

  // Retry on 429 with exponential backoff capped at 64s. 6 attempts total
  // (1s, 2s, 4s, 8s, 16s, 32s waits between attempts) so a single submit can
  // ride out a ~63s management-group rate-limit window without failing.
  let res: Response;
  let text = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    const backoff = Math.min(64_000, 1000 * Math.pow(2, attempt));
    console.warn(`[toast-analytics] 429 on submit ${opts.path}, retrying in ${backoff}ms (attempt ${attempt + 1}/6)`);
    await delay(backoff);
  }
  text = await res!.text();
  if (!res!.ok) {
    throw new Error(`submitJob ${opts.path} failed (HTTP ${res!.status}): ${text.slice(0, 300)}`);
  }

  // Toast may return either { reportRequestGuid: "..." } or a bare string GUID.
  let guid: string | null = null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') {
      guid = parsed;
    } else if (parsed && typeof parsed === 'object') {
      guid = parsed.reportRequestGuid ?? parsed.guid ?? parsed.id ?? null;
    }
  } catch {
    // Bare unquoted string — treat the body as the GUID directly.
    guid = text.trim().replace(/^"+|"+$/g, '');
  }

  if (!guid) {
    throw new Error(`submitJob ${opts.path}: no reportRequestGuid in response: ${text.slice(0, 200)}`);
  }
  return guid;
}

/**
 * Poll a Toast Analytics report by reportRequestGuid.
 * Loops up to maxAttempts × delayMs, returning parsed JSON when 200 arrives.
 * Handles 202 (still processing) by retrying, and 409 (re-submit) by throwing
 * a typed error so the caller can re-submit if desired.
 */
export async function pollJob<T = unknown>(
  token: string,
  pathBase: string,
  reportRequestGuid: string,
  opts: { maxAttempts?: number; delayMs?: number; maxWallMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 20;
  const delayMs = opts.delayMs ?? 2000;
  const maxWallMs = opts.maxWallMs ?? 0; // 0 = unlimited (attempts-only)
  const startedAt = Date.now();
  // Toast retrieve URL pattern is /era/v1/{type}/{guid} — caller passes the
  // type segment (e.g. 'metrics', 'labor', 'menu') as pathBase.
  const url = `${TOAST_ANALYTICS_HOST}/era/v1/${pathBase}/${reportRequestGuid}`;

  let lastStatus = 0;
  let lastBody = '';
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (maxWallMs > 0 && Date.now() - startedAt > maxWallMs) {
      throw new Error(`pollJob ${pathBase} wall-clock timeout after ${Math.round((Date.now()-startedAt)/1000)}s (last status ${lastStatus}) — likely tenant rate-limit pressure`);
    }
    const res = await fetch(url, { method: 'GET', headers: authHeaders(token) });
    lastStatus = res.status;
    if (res.status === 200) {
      const text = await res.text();
      try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
    }
    if (res.status === 202) {
      // Still processing — wait and retry.
      await delay(delayMs);
      continue;
    }
    if (res.status === 429) {
      // Rate limited — exponential backoff but don't consume an attempt.
      const backoff = Math.min(8000, 1000 * Math.pow(2, attempt));
      console.warn(`[toast-analytics] 429 on poll ${pathBase}, backing off ${backoff}ms`);
      await delay(backoff);
      continue;
    }
    if (res.status === 409) {
      // Toast asks us to resubmit. Caller can catch and re-POST.
      const text = await res.text();
      throw new Error(`pollJob ${pathBase} got 409 (resubmit required): ${text.slice(0, 200)}`);
    }
    lastBody = await res.text();
    throw new Error(`pollJob ${pathBase} failed (HTTP ${res.status}): ${lastBody.slice(0, 300)}`);
  }
  throw new Error(`pollJob ${pathBase} timed out after ${maxAttempts} attempts (last status ${lastStatus})`);
}

/**
 * Convenience: submit + poll in one call. Uses the type segment of the path
 * (everything before the first slash) as the polling base.
 */
export async function runReport<T = unknown>(
  token: string,
  opts: SubmitJobOptions,
  pollOpts?: { maxAttempts?: number; delayMs?: number; maxWallMs?: number },
): Promise<T> {
  const guid = await submitJob(token, opts);
  const pollBase = opts.path.split('/')[0]; // 'metrics/day' → 'metrics'
  return pollJob<T>(token, pollBase, guid, pollOpts);
}

// ── Beverage classification (shared with sync-toast-metrics) ──────────
// Mirrors the existing classifier so the menu-day endpoint can split
// food vs beverage by menu group name.
export function isBeverageGroup(name: string): boolean {
  const c = (name || '').toLowerCase();
  return (
    c.includes('beverage') || c.includes('drink') || c.includes('beer') ||
    c.includes('wine') || c.includes('cocktail') || c.includes('spirit') ||
    c.includes('bar') || c.includes('alcohol') || c.includes('liquor') ||
    c.includes('draft') || c.includes('bottle') || c.includes('seltzer') ||
    c.includes('cider') || c.includes('shot') || c.includes('mixed') ||
    c.includes('margarita') || c.includes('on tap') || c.includes('n/a bev') ||
    c.includes('non-alc')
  );
}

// businessDate from Toast comes back as a string like "20260330" — convert
// to ISO YYYY-MM-DD for daily_metrics.
export function compactToIso(compact: string | number): string {
  const s = String(compact);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// ── /check/day report shape ──────────────────────────────────────────
// Per-check rows used to derive tips, gratuity, unpaid totals, and an
// approximate dine-in turn time. Field names per Toast Reporting API.
//
// IMPORTANT: tips & gratuity may be reported in EITHER:
//   - top-level checkTipAmount / checkGratuityAmount (some configs), OR
//   - nested payments[].tipAmount + serviceCharges[].chargeAmount (newer)
// We sum across both shapes defensively.
export interface CheckDayPayment {
  tipAmount?: number | string;
  gratuityAmount?: number | string;
  amount?: number | string;
  paymentStatus?: string;
  [k: string]: unknown;
}

export interface CheckDayServiceCharge {
  chargeAmount?: number | string;
  amount?: number | string;
  gratuity?: boolean;
  serviceChargeCategory?: string; // 'GRATUITY' | 'AUTO_GRATUITY' | etc.
  name?: string;
  [k: string]: unknown;
}

export interface CheckDayRow {
  restaurantGuid: string;
  businessDate: string | number;
  checkGuid?: string;
  checkStatus?: string; // 'OPEN' | 'CLOSED' | 'PAID' | etc.
  checkTotalAmount?: number | string;
  checkTipAmount?: number | string;
  checkGratuityAmount?: number | string;
  checkPaidAmount?: number | string;
  payments?: CheckDayPayment[];
  serviceCharges?: CheckDayServiceCharge[];
  orderOpenDate?: string;       // ISO timestamp
  checkOpenedDate?: string;     // alt naming
  checkPaidDateTime?: string;   // ISO timestamp
  checkClosedDate?: string;     // alt naming
  diningOption?: string;
  diningOptionName?: string;
  [k: string]: unknown;
}

/**
 * Convenience wrapper: submit + poll /era/v1/check/day for a date range
 * scoped to one or more restaurant GUIDs.
 */
export async function runCheckDayReport(
  token: string,
  opts: { restaurantIds: string[]; startBusinessDate: string; endBusinessDate: string; debugCheckDay?: boolean; tenantKey?: string },
): Promise<CheckDayRow[]> {
  const data = await runReport<unknown>(token, {
    path: 'check/day',
    restaurantIds: opts.restaurantIds,
    startBusinessDate: opts.startBusinessDate,
    endBusinessDate: opts.endBusinessDate,
    tenantKey: opts.tenantKey,
  }, { maxAttempts: 60, delayMs: 2000, maxWallMs: 120_000 });
  const rows = Array.isArray(data) ? data as CheckDayRow[] : [];

  if (opts.debugCheckDay && rows.length > 0) {
    const sample = rows[0];
    console.log('[DEBUG-CHECK-DAY] row count:', rows.length);
    console.log('[DEBUG-CHECK-DAY] keys:', JSON.stringify(Object.keys(sample as Record<string, unknown>)));
    console.log('[DEBUG-CHECK-DAY] full first row:', JSON.stringify(sample));
    if (rows[1]) console.log('[DEBUG-CHECK-DAY] row[1]:', JSON.stringify(rows[1]));
    const midIdx = Math.floor(rows.length / 2);
    if (midIdx > 1 && rows[midIdx]) {
      console.log('[DEBUG-CHECK-DAY] mid row:', JSON.stringify(rows[midIdx]));
    }
  }
  return rows;
}

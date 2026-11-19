import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { equalSecret, guardEdgeRequest } from '../_shared/auth-guard.ts';
import { AI_MODELS, callAI } from '../_shared/ai-models.ts';
import { runStudioTask, studioTaskId, StudioWorkerError } from './core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function boundedJson(response: Response | Request, maxBytes: number): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new StudioWorkerError(400, 'A JSON request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { void reader.cancel(); throw new StudioWorkerError(413, 'The response or request exceeds this bounded run.'); }
    chunks.push(value);
  }
  const combined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(combined)); }
  catch { throw new StudioWorkerError(400, 'Valid JSON is required.'); }
}

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'content-studio-run');
  if (__authDenied) return __authDenied;

  try {
    const taskId = studioTaskId(await boundedJson(req, 4096));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authorization = req.headers.get('Authorization') ?? '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!/^Bearer\s+/i.test(authorization) || !token || equalSecret(token, anonKey)) return json(401, { error: 'Sign in required.' });
    const serviceCaller = equalSecret(token, serviceKey);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const searchKey = (Deno.env.get('PERPLEXITY_API_KEY') ?? '').trim();
    const model = AI_MODELS.user_facing_narrative;
    const modelKey = (Deno.env.get(model.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'LOVABLE_API_KEY') ?? '').trim();
    const result = await runStudioTask(taskId, {
      admin,
      canAccessProject: async (projectId) => {
        if (serviceCaller) return true;
        const { data, error } = await caller.rpc('hq_studio_can_access', { p_project_id: projectId });
        return !error && data === true;
      },
      search: searchKey ? async (query) => {
        // Fixed provider endpoint: never fetch a client-supplied or model-generated URL.
        // API contract: https://docs.perplexity.ai/api-reference/search-post
        const response = await fetch('https://api.perplexity.ai/search', {
          method: 'POST', headers: { Authorization: `Bearer ${searchKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, max_results: 6 }), signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new StudioWorkerError(502, 'The search provider could not return evidence. No research was applied.');
        return boundedJson(response, 150_000);
      } : undefined,
      generate: modelKey ? async ({ projectId, system, user }) => {
        const generated = await callAI({ taskType: 'user_facing_narrative', functionName: 'content-studio-run',
          venueId: projectId, promptVersion: 'studio-v1', system, messages: [{ role: 'user', content: user }],
          maxTokens: 4500, temperature: 0.4, signal: AbortSignal.timeout(70_000) });
        return { text: generated.text, modelId: generated.modelId, provider: generated.provider };
      } : undefined,
    });
    return json(200, result);
  } catch (error) {
    const known = error instanceof StudioWorkerError;
    return json(known ? error.status : 503, { error: known ? error.message : 'Content Studio could not start this task. Refresh its status before retrying.' });
  }
});

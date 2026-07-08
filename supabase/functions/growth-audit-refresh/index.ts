// growth-audit-refresh
// Real audit engine. Dispatches to all registered analyzers for a venue,
// catches per-analyzer failures, persists a summary row in growth_audit_runs.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { ALL_ANALYZERS, COLD_SAFE_ANALYZER_IDS } from '../_shared/analyzers/index.ts';
import { setActorService } from '../_shared/findings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  let runId: string | null = null;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const { venue_id, triggered_by, cold_only } = body ?? {};
    if (!venue_id || typeof venue_id !== 'string') {
      return json({ error: 'venue_id required' }, 400);
    }

    const analyzers = cold_only
      ? ALL_ANALYZERS.filter((a) => COLD_SAFE_ANALYZER_IDS.has(a.id))
      : ALL_ANALYZERS;

    // 1) Open the run row.
    const { data: runRow, error: runErr } = await supabase
      .from('growth_audit_runs')
      .insert({
        venue_id,
        triggered_by: triggered_by ?? null,
        status: 'running',
        notes: 'analyzer dispatch in progress',
      })
      .select('id')
      .single();
    if (runErr) {
      console.error('[growth-audit-refresh] failed to open run row:', JSON.stringify(runErr));
      throw new Error(runErr.message ?? 'failed to open run row');
    }
    runId = runRow.id;

    // 2) Tag downstream writes with actor for the audit trigger.
    await setActorService(supabase, 'growth-audit-engine', `run=${runId}`);

    // 3) Run analyzers sequentially. Each catches its own errors internally,
    //    but we still wrap defensively so one throw can't kill the loop.
    const perAnalyzer: Record<string, unknown> = {};
    let totalErrors = 0, totalSuccess = 0;
    for (const analyzer of analyzers) {
      try {
        const r = await analyzer.run(supabase, venue_id);
        perAnalyzer[analyzer.id] = r;
        if (r.errors.length === 0) totalSuccess += 1; else totalErrors += 1;
      } catch (e) {
        totalErrors += 1;
        const msg = e instanceof Error ? e.message : String(e);
        perAnalyzer[analyzer.id] = { errors: [msg], inserted: 0, updated: 0, resolved: 0, skipped: 0, ms: 0 };
        console.error(`[growth-audit-refresh] analyzer ${analyzer.id} threw:`, msg);
      }
    }

    const status =
      totalErrors === 0 ? 'success' :
      totalSuccess === 0 ? 'failed' : 'partial';
    const duration_ms = Date.now() - t0;
    const summary = { analyzers: perAnalyzer, totalErrors, totalSuccess };

    await supabase.from('growth_audit_runs').update({
      status,
      completed_at: new Date().toISOString(),
      duration_ms,
      summary,
      notes: `${analyzers.length} analyzers run${cold_only ? ' (cold_only)' : ''}; ${totalErrors} with errors`,
    }).eq('id', runId);

    return json({ ok: true, run_id: runId, status, duration_ms, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
    console.error('[growth-audit-refresh]', msg);
    if (runId) {
      try {
        await supabase.from('growth_audit_runs').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - t0,
          notes: `engine error: ${msg}`,
        }).eq('id', runId);
      } catch { /* best-effort */ }
    }
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

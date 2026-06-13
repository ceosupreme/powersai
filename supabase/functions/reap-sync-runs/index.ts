// Standalone reaper for sync_runs hygiene.
//
// Phase 2 companion to sync-toast-metrics' per-cycle reaper. This runs on a
// */30 minute cron and ONLY marks stale rows failed. It deliberately does NOT
// re-enqueue work — that is the dispatcher reaper's job. The point here is
// status hygiene so Admin Sync / sync-health dashboards don't show ghost
// "running" rows indefinitely when an isolate dies without firing
// beforeunload/unhandledrejection.

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stale threshold: a worker that hasn't updated its row in this many minutes
// is presumed dead (isolate hard cap is 300s; we add a generous buffer).
const STALE_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const reaped: Array<{ id: string; sync_type: string; bar_id: string | null; started_at: string }> = [];
  let errorMessage: string | null = null;

  try {
    // Sweep ALL sync_types that participate in the Toast pipeline plus any
    // dispatcher rows. We intentionally widen beyond just toast_metrics so
    // toast_metrics_dispatch rows (and any future sync types that follow the
    // same pattern) are covered.
    const { data: stalled, error } = await supabase
      .from('sync_runs')
      .select('id, sync_type, bar_id, started_at, metadata')
      .eq('status', 'running')
      .lt('started_at', cutoff)
      .order('started_at', { ascending: true })
      .limit(200);

    if (error) throw error;

    if (stalled && stalled.length > 0) {
      console.log(`[REAP-SYNC-RUNS] Found ${stalled.length} stalled run(s) older than ${STALE_MINUTES}min`);
      for (const run of stalled) {
        const { error: updErr } = await supabase
          .from('sync_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `standalone-reaper: no terminal update in >${STALE_MINUTES}min`,
          })
          .eq('id', run.id)
          .eq('status', 'running'); // conditional: don't clobber a row that just completed
        if (updErr) {
          console.error(`[REAP-SYNC-RUNS] failed to mark ${run.id} (${run.sync_type}) failed: ${updErr.message}`);
        } else {
          reaped.push({ id: run.id, sync_type: run.sync_type, bar_id: run.bar_id, started_at: run.started_at });
          console.log(`[REAP-SYNC-RUNS] marked failed: ${run.sync_type} run=${run.id} bar=${run.bar_id} started=${run.started_at}`);
        }
      }
    } else {
      console.log(`[REAP-SYNC-RUNS] No stalled runs older than ${STALE_MINUTES}min`);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[REAP-SYNC-RUNS] fatal:', errorMessage);
  }

  return new Response(
    JSON.stringify({
      ok: errorMessage === null,
      stale_minutes: STALE_MINUTES,
      reaped_count: reaped.length,
      reaped,
      error: errorMessage,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: errorMessage ? 500 : 200 },
  );
});

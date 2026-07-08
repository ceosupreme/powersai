// foundation-audit-refresh
// Runs every registered foundation check for a venue, upserts auto-source
// statuses into venue_foundation_item_status without clobbering manual rows,
// and records the run in foundation_audit_runs.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { ALL_FOUNDATION_CHECKS, COLD_SAFE_FOUNDATION_IDS } from '../_shared/foundation-checks/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

    const checks = cold_only
      ? ALL_FOUNDATION_CHECKS.filter((c) => COLD_SAFE_FOUNDATION_IDS.has(c.id))
      : ALL_FOUNDATION_CHECKS;

    const { data: runRow, error: runErr } = await supabase
      .from('foundation_audit_runs')
      .insert({
        venue_id,
        triggered_by: triggered_by ?? null,
        status: 'running',
        notes: 'foundation checks dispatch in progress',
      })
      .select('id')
      .single();
    if (runErr) throw new Error(runErr.message ?? 'failed to open run row');
    runId = runRow.id;

    const { data: existing } = await supabase
      .from('venue_foundation_item_status')
      .select('item_key,source')
      .eq('venue_id', venue_id);
    const manualKeys = new Set(
      (existing ?? []).filter((r: any) => r.source === 'manual').map((r: any) => r.item_key),
    );

    const perCheck: Record<string, unknown> = {};
    let inserted = 0, updated = 0, skipped = 0, errors = 0, totalSuccess = 0;

    for (const check of checks) {
      const cStart = Date.now();
      try {
        if (manualKeys.has(check.itemKey)) {
          skipped += 1;
          perCheck[check.id] = { skipped: 'manual override present', ms: 0 };
          continue;
        }
        const r = await check.run(supabase, venue_id);
        if (!r) {
          skipped += 1;
          perCheck[check.id] = { skipped: 'no signal', ms: Date.now() - cStart };
          continue;
        }
        const detected = r.detected_at ?? new Date().toISOString();
        const { error: upErr, data: upData } = await supabase
          .from('venue_foundation_item_status')
          .upsert(
            {
              venue_id,
              item_key: check.itemKey,
              status: r.status,
              evidence_url: r.evidence_url ?? null,
              notes: r.notes ?? null,
              source: 'auto',
              detected_at: detected,
            },
            { onConflict: 'venue_id,item_key' },
          )
          .select('id,created_at,updated_at')
          .single();
        if (upErr) {
          errors += 1;
          perCheck[check.id] = { error: upErr.message, ms: Date.now() - cStart };
          continue;
        }
        const wasInsert = upData && upData.created_at === upData.updated_at;
        if (wasInsert) inserted += 1; else updated += 1;
        totalSuccess += 1;
        perCheck[check.id] = { status: r.status, ms: Date.now() - cStart };
      } catch (e) {
        errors += 1;
        const msg = e instanceof Error ? e.message : String(e);
        perCheck[check.id] = { error: msg, ms: Date.now() - cStart };
      }
    }

    const status =
      errors === 0 ? 'success' :
      totalSuccess === 0 ? 'failed' : 'partial';
    const duration_ms = Date.now() - t0;
    const summary = { checks: perCheck, totalSuccess, totalErrors: errors };

    await supabase.from('foundation_audit_runs').update({
      status,
      completed_at: new Date().toISOString(),
      duration_ms,
      inserted,
      updated,
      skipped,
      errors,
      summary,
      notes: `${checks.length} checks ran${cold_only ? ' (cold_only)' : ''}; ${errors} with errors; ${skipped} skipped`,
    }).eq('id', runId);

    return json({ ok: true, run_id: runId, status, duration_ms, inserted, updated, skipped, errors, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[foundation-audit-refresh]', msg);
    if (runId) {
      try {
        await supabase.from('foundation_audit_runs').update({
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
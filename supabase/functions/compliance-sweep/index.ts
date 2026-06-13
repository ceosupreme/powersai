// ============================================================================
// compliance-sweep — daily rolling labor compliance pass
// ============================================================================
// Wraps the existing detectors with a wider lens than the per-date daily pass:
//   • Re-scans last `windowDays` business dates (default 7) for late/missed
//     meal + no-clockout. Catches Toast time entries that synced AFTER their
//     daily-insights pass already ran.
//   • Runs Weekly OT for current + previous ISO week. Was Monday-only; now
//     mid-week OT accumulation surfaces within 24h.
//   • Runs Multi-location for current ISO week (once per cycle, first venue).
//   • Runs new meal-break tracking config-gap detector per venue per week.
//
// All detectors are idempotent via dedupe_hash + the partial unique index on
// insights, so safe to re-run.
//
// Modes:
//   POST {} → process all active venues, windowDays=7
//   POST { venue_id, window_days?, anchor_date? } → single venue
//   POST { backfill_30d: true } → all venues, windowDays=30, anchor=today
//
// Triggered by:
//   • cron (daily) — see migration
//   • Admin → Compliance Audit "Run sweep" button
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { runRollingComplianceSweep } from '../_shared/labor-compliance-alerts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let venueId: string | null = null;
    let windowDays = 7;
    let anchorDate: string | undefined;
    let backfill30d = false;
    try {
      const body = await req.json();
      if (typeof body.venue_id === 'string') venueId = body.venue_id;
      if (typeof body.window_days === 'number') windowDays = Math.min(60, Math.max(1, body.window_days));
      if (typeof body.anchor_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.anchor_date)) {
        anchorDate = body.anchor_date;
      }
      if (body.backfill_30d === true) {
        backfill30d = true;
        windowDays = 30;
      }
    } catch { /* defaults */ }

    // Resolve venues
    let venues: { id: string; name: string }[];
    if (venueId) {
      const { data } = await supabase.from('venues').select('id, name').eq('id', venueId);
      venues = data || [];
    } else {
      const { data } = await supabase.from('venues').select('id, name').eq('is_active', true);
      venues = data || [];
    }

    if (venues.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No venues to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[compliance-sweep] starting: venues=${venues.length} window=${windowDays}d backfill=${backfill30d}`);

    const results: any[] = [];
    let multiLocAlreadyRun = false;
    for (const v of venues) {
      const syncRun = await supabase.from('sync_runs').insert({
        bar_id: v.id, sync_type: 'compliance_sweep', status: 'running',
      }).select('id').single();

      try {
        const r = await runRollingComplianceSweep(supabase, v.id, {
          windowDays,
          runMultiLocation: !multiLocAlreadyRun,
          anchorDate,
        });
        if (!multiLocAlreadyRun) multiLocAlreadyRun = true;

        const totalInserted =
          r.lateMeal + r.missedMeal + r.noClockout +
          r.overtimeCurrent + r.overtimePrevious +
          r.multiLocation + r.configGap + (r.mealRollup || 0);

        if (syncRun.data?.id) {
          await supabase.from('sync_runs').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            records_created: totalInserted,
            metadata: {
              window_days: windowDays,
              backfill_30d: backfill30d,
              anchor_date: anchorDate || null,
              late_meal: r.lateMeal,
              missed_meal: r.missedMeal,
              no_clockout: r.noClockout,
              overtime_current: r.overtimeCurrent,
              overtime_previous: r.overtimePrevious,
              multi_location: r.multiLocation,
              meal_tracking_gap: r.configGap,
              meal_break_weekly_rollup: r.mealRollup || 0,
              error_count: r.errors.length,
            },
          }).eq('id', syncRun.data.id);
        }

        results.push({ venue_id: v.id, venue_name: v.name, ...r, total: totalInserted });
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.error(`[compliance-sweep] venue=${v.name} crashed: ${msg}`);
        if (syncRun.data?.id) {
          await supabase.from('sync_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: msg,
          }).eq('id', syncRun.data.id);
        }
        results.push({ venue_id: v.id, venue_name: v.name, error: msg });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      window_days: windowDays,
      backfill_30d: backfill30d,
      venues_processed: venues.length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('[compliance-sweep] failed:', e?.message || e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

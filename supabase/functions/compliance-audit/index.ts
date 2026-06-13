// ============================================================================
// compliance-audit — read-only diagnostic for Admin UI
// ============================================================================
// Returns per-venue counts comparing raw Toast time-entry signals against
// detected compliance insights. Used by the Admin → Compliance Audit tab to
// surface "detector running but should have fired" gaps.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function pacificToday(): string {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function shiftDate(d: string, delta: number): string {
  const [y, m, dd] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days')) || 30));
    const today = pacificToday();
    const since = shiftDate(today, -days);

    const { data: venues } = await supabase
      .from('venues').select('id, name').eq('is_active', true).order('name');

    const rows: any[] = [];
    for (const v of (venues || []) as { id: string; name: string }[]) {
      // Time-entry signals
      const { data: entries } = await supabase
        .from('time_entries')
        .select('id, in_date, out_date, overtime_hours, auto_clocked_out, time_entry_breaks ( id, missed )')
        .eq('venue_id', v.id).eq('deleted', false)
        .gte('business_date', since).lte('business_date', today);

      let noClockoutTe = 0, otTeEmpsWeek = new Map<string, Map<string, number>>(); // emp -> week -> ot
      let longShifts = 0, longShiftsNoBreak = 0, missedFlags = 0;
      for (const e of (entries || []) as any[]) {
        if (e.out_date == null || e.auto_clocked_out === true) noClockoutTe++;
        const breaks = (e.time_entry_breaks || []) as any[];
        const dur = e.in_date && e.out_date
          ? (new Date(e.out_date).getTime() - new Date(e.in_date).getTime()) / 3600000
          : null;
        if (dur != null && dur >= 6) {
          longShifts++;
          if (breaks.length === 0) longShiftsNoBreak++;
        }
        for (const b of breaks) if (b.missed === true) missedFlags++;
      }

      // OT: count distinct (employee, ISO week) pairs hitting >=4h sum
      const { data: otRows } = await supabase
        .from('time_entries')
        .select('employee_id, business_date, overtime_hours')
        .eq('venue_id', v.id).eq('deleted', false)
        .gte('business_date', since).lte('business_date', today)
        .gt('overtime_hours', 0);
      const empWeek = new Map<string, number>();
      for (const r of (otRows || []) as any[]) {
        if (!r.employee_id || !r.business_date) continue;
        const [yy, mm, dd] = (r.business_date as string).split('-').map(Number);
        const dt = new Date(Date.UTC(yy, mm - 1, dd));
        const dow = dt.getUTCDay();
        dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
        const wk = dt.toISOString().slice(0, 10);
        const k = `${r.employee_id}|${wk}`;
        empWeek.set(k, (empWeek.get(k) || 0) + (Number(r.overtime_hours) || 0));
      }
      let qualifyingOtEmpWeeks = 0;
      for (const v2 of empWeek.values()) if (v2 >= 4) qualifyingOtEmpWeeks++;

      // Insights since `since`
      const { data: ins } = await supabase
        .from('insights')
        .select('source_metric')
        .eq('bar_id', v.id)
        .eq('generated_by', 'deterministic_trigger')
        .gte('source_date', since);
      let insNoClock = 0, insOt = 0, insLate = 0, insMissed = 0, insMulti = 0, insGap = 0;
      for (const i of (ins || []) as any[]) {
        switch (i.source_metric) {
          case 'no_clockout': insNoClock++; break;
          case 'weekly_overtime': insOt++; break;
          case 'late_meal': insLate++; break;
          case 'missed_meal': insMissed++; break;
          case 'multi_location': insMulti++; break;
          case 'meal_tracking_gap': insGap++; break;
        }
      }

      rows.push({
        venue_id: v.id, venue_name: v.name,
        no_clockout_te: noClockoutTe, no_clockout_insights: insNoClock,
        qualifying_ot_emp_weeks: qualifyingOtEmpWeeks, ot_insights: insOt,
        late_meal_insights: insLate, missed_meal_insights: insMissed,
        multi_location_insights: insMulti, meal_tracking_gap_insights: insGap,
        long_shifts: longShifts, long_shifts_no_break: longShiftsNoBreak,
        missed_break_flags: missedFlags,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      window_days: days,
      since,
      today,
      rows,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

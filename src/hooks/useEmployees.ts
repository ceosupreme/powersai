import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  COMPLIANCE_WINDOW_DAYS,
  NO_CLOCKOUT_WINDOW_DAYS,
} from '@/components/employees/constants';

export interface EmployeeRow {
  id: string;
  display_name: string;
  employee_name: string;
  preferred_name: string | null;
  role_primary: string | null;
  role_secondary: string | null;
  is_active: boolean;
  employment_status: string | null;
  hire_date: string | null;
  last_shift_date: string | null;
  hourly_wage: number | null;
  additional_venues: string[] | null;
  // Derived
  tenure_days: number | null;
  hours_90d: number;
  weekly_hours: number[]; // sequence of weekly hours (oldest -> newest, last 13 weeks)
  weekly_hours_keys: string[]; // matching Monday YYYY-MM-DD keys
  weekly_hours_mean: number | null;
  weekly_hours_sd: number | null;
  violations_90d: number;
  violations_breakdown: Record<string, number>;
  violations_week: number;
  violations_week_breakdown: Record<string, number>;
  no_clockout_30d: number;
  wins_90d: number;
  concerns_90d: number;
}

export interface UseEmployeesOptions {
  weekStart?: string | null;
  weekEnd?: string | null;
}

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const parseISODate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));

// Returns Monday-anchored YYYY-MM-DD bucket key (UTC)
const weekKey = (iso: string): string => {
  const d = parseISODate(iso);
  if (!d) return iso;
  const dow = d.getUTCDay(); // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};

export const useEmployees = (
  venueId: string | null | undefined,
  opts: UseEmployeesOptions = {},
) => {
  const weekStart = opts.weekStart ?? null;
  const weekEnd = opts.weekEnd ?? null;
  return useQuery({
    queryKey: ['employees-list', venueId, weekStart, weekEnd],
    enabled: !!venueId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<EmployeeRow[]> => {
      if (!venueId) return [];

      const since90 = isoDaysAgo(COMPLIANCE_WINDOW_DAYS);
      const since30 = isoDaysAgo(NO_CLOCKOUT_WINDOW_DAYS);
      const today = new Date();

      // Profiles for venue (primary) — include cross-venue employees who list this venue in additional_venues
      const [profilesPrimary, profilesAdditional, timeEntries, insightsRes, sentimentRes, sentimentJunction] = await Promise.all([
        supabase
          .from('employee_profiles')
          .select('id, employee_name, preferred_name, role_primary, role_secondary, is_active, employment_status, hire_date, last_shift_date, hourly_wage, additional_venues, venue_id')
          .eq('venue_id', venueId)
          .eq('is_vendor_account', false),
        supabase
          .from('employee_profiles')
          .select('id, employee_name, preferred_name, role_primary, role_secondary, is_active, employment_status, hire_date, last_shift_date, hourly_wage, additional_venues, venue_id')
          .contains('additional_venues', [venueId])
          .eq('is_vendor_account', false),
        supabase
          .from('time_entries')
          .select('employee_id, business_date, regular_hours, overtime_hours, auto_clocked_out')
          .eq('venue_id', venueId)
          .gte('business_date', since90)
          .neq('deleted', true),
        supabase
          .from('insights')
          .select('employee_id, source_metric, source_date')
          .eq('venue_id', venueId)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', since90)
          .not('employee_id', 'is', null),
        supabase
          .from('insights')
          .select('id, employee_id, sentiment')
          .eq('venue_id', venueId)
          .gte('source_date', since90)
          .in('sentiment', ['positive', 'negative'])
          .not('employee_id', 'is', null),
        // Junction-tagged sentiment events — captures multi-employee insights
        supabase
          .from('insight_employees')
          .select('insight_id, employee_id, insights:insight_id!inner(sentiment, source_date, venue_id)')
          .eq('insights.venue_id', venueId)
          .gte('insights.source_date', since90)
          .in('insights.sentiment', ['positive', 'negative']),
      ]);

      // Optional week-scoped violations roll-up
      const weekInsAgg = new Map<string, { count: number; breakdown: Record<string, number> }>();
      if (weekStart && weekEnd) {
        const { data: weekIns, error: weekErr } = await supabase
          .from('insights')
          .select('employee_id, source_metric, source_date')
          .eq('venue_id', venueId)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', weekStart)
          .lte('source_date', weekEnd)
          .not('employee_id', 'is', null);
        if (weekErr) throw weekErr;
        for (const ins of weekIns ?? []) {
          const eid = ins.employee_id as string;
          if (!eid) continue;
          let row = weekInsAgg.get(eid);
          if (!row) { row = { count: 0, breakdown: {} }; weekInsAgg.set(eid, row); }
          row.count += 1;
          const m = ins.source_metric || 'unknown';
          row.breakdown[m] = (row.breakdown[m] || 0) + 1;
        }
      }

      if (profilesPrimary.error) throw profilesPrimary.error;
      if (timeEntries.error) throw timeEntries.error;
      if (insightsRes.error) throw insightsRes.error;
      if (sentimentRes.error) throw sentimentRes.error;
      if (sentimentJunction.error) throw sentimentJunction.error;

      // Roll up sentiment-classified insights per employee.
      // De-dupe by (employee_id, insight_id) across legacy + junction so we don't double-count.
      const sentAgg = new Map<string, { wins: number; concerns: number }>();
      const countedSent = new Set<string>();
      for (const ins of sentimentRes.data ?? []) {
        const eid = ins.employee_id as string;
        const iid = (ins as any).id as string | undefined;
        if (!eid || !iid) continue;
        const key = `${eid}|${iid}`;
        if (countedSent.has(key)) continue;
        countedSent.add(key);
        let row = sentAgg.get(eid);
        if (!row) { row = { wins: 0, concerns: 0 }; sentAgg.set(eid, row); }
        if (ins.sentiment === 'positive') row.wins += 1;
        else if (ins.sentiment === 'negative') row.concerns += 1;
      }
      for (const j of (sentimentJunction.data ?? []) as any[]) {
        const eid = j.employee_id as string;
        const ij = j.insights;
        if (!eid || !ij) continue;
        const key = `${eid}|${j.insight_id}`;
        if (countedSent.has(key)) continue;
        countedSent.add(key);
        let row = sentAgg.get(eid);
        if (!row) { row = { wins: 0, concerns: 0 }; sentAgg.set(eid, row); }
        if (ij.sentiment === 'positive') row.wins += 1;
        else if (ij.sentiment === 'negative') row.concerns += 1;
      }

      // De-dupe profiles
      const profileMap = new Map<string, any>();
      for (const p of profilesPrimary.data ?? []) profileMap.set(p.id, p);
      for (const p of profilesAdditional.data ?? []) if (!profileMap.has(p.id)) profileMap.set(p.id, p);

      // Roll up time entries: hours per employee, weekly bucket, no-clockout-30d
      type Agg = {
        hours_90d: number;
        weeks: Map<string, number>;
        no_clockout_30d: number;
        first_te: string | null;
      };
      const agg = new Map<string, Agg>();
      for (const te of timeEntries.data ?? []) {
        if (!te.employee_id) continue;
        let row = agg.get(te.employee_id);
        if (!row) {
          row = { hours_90d: 0, weeks: new Map(), no_clockout_30d: 0, first_te: null };
          agg.set(te.employee_id, row);
        }
        const h = (Number(te.regular_hours) || 0) + (Number(te.overtime_hours) || 0);
        row.hours_90d += h;
        const wk = weekKey(te.business_date);
        row.weeks.set(wk, (row.weeks.get(wk) || 0) + h);
        if (te.auto_clocked_out && te.business_date >= since30) {
          row.no_clockout_30d += 1;
        }
        if (!row.first_te || te.business_date < row.first_te) row.first_te = te.business_date;
      }

      // Roll up insights: total + breakdown
      const insAgg = new Map<string, { count: number; breakdown: Record<string, number> }>();
      for (const ins of insightsRes.data ?? []) {
        const eid = ins.employee_id as string;
        if (!eid) continue;
        let row = insAgg.get(eid);
        if (!row) { row = { count: 0, breakdown: {} }; insAgg.set(eid, row); }
        row.count += 1;
        const m = ins.source_metric || 'unknown';
        row.breakdown[m] = (row.breakdown[m] || 0) + 1;
      }

      const rows: EmployeeRow[] = [];
      for (const p of profileMap.values()) {
        const a = agg.get(p.id);
        const ins = insAgg.get(p.id);

        // Tenure
        const hire = parseISODate(p.hire_date);
        const firstTE = parseISODate(a?.first_te ?? null);
        const tenureSrc = hire ?? firstTE;
        const tenureDays = tenureSrc ? daysBetween(tenureSrc, today) : null;

        // Weekly stats — sort week keys, take ordered values
        const weekEntries = a
          ? Array.from(a.weeks.entries()).sort((x, y) => x[0].localeCompare(y[0]))
          : [];
        const weeklyHours = weekEntries.map(e => e[1]);
        const weeklyHoursKeys = weekEntries.map(e => e[0]);
        const mean = weeklyHours.length ? weeklyHours.reduce((s, v) => s + v, 0) / weeklyHours.length : null;
        let sd: number | null = null;
        if (weeklyHours.length >= 2 && mean !== null) {
          const variance = weeklyHours.reduce((s, v) => s + (v - mean) ** 2, 0) / (weeklyHours.length - 1);
          sd = Math.sqrt(variance);
        }

        rows.push({
          id: p.id,
          display_name: (p.preferred_name || p.employee_name || '').trim(),
          employee_name: p.employee_name,
          preferred_name: p.preferred_name,
          role_primary: p.role_primary,
          role_secondary: p.role_secondary,
          is_active: !!p.is_active,
          employment_status: p.employment_status,
          hire_date: p.hire_date,
          last_shift_date: p.last_shift_date,
          hourly_wage: p.hourly_wage,
          additional_venues: p.additional_venues,
          tenure_days: tenureDays,
          hours_90d: Math.round(a?.hours_90d ?? 0),
          weekly_hours: weeklyHours,
          weekly_hours_keys: weeklyHoursKeys,
          weekly_hours_mean: mean,
          weekly_hours_sd: sd,
          violations_90d: ins?.count ?? 0,
          violations_breakdown: ins?.breakdown ?? {},
          violations_week: weekInsAgg.get(p.id)?.count ?? 0,
          violations_week_breakdown: weekInsAgg.get(p.id)?.breakdown ?? {},
          no_clockout_30d: a?.no_clockout_30d ?? 0,
          wins_90d: sentAgg.get(p.id)?.wins ?? 0,
          concerns_90d: sentAgg.get(p.id)?.concerns ?? 0,
        });
      }

      rows.sort((a, b) => a.display_name.localeCompare(b.display_name));
      return rows;
    },
  });
};

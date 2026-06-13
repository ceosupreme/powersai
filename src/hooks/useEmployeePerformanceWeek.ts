import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpPerfViolator {
  id: string;
  preferredName: string | null;
  employeeName: string;
}

export interface EmpPerfCurrent {
  activeEmployees: number;
  hoursWorked: number;
  otHours: number;
  violations: number;
  exposure: number;
  missingWageAlerts: number;
  topOffenders: Array<{ id: string; name: string; count: number; breakdown: Record<string, number> }>;
  violatorIndex: EmpPerfViolator[];
}

export interface EmpPerfTrendPoint {
  weekStart: string;   // YYYY-MM-DD Monday
  weekLabel: string;   // e.g. "Apr 22"
  breakdown: Record<string, number>;
  total: number;
}

interface WeekLike {
  id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
}

interface Args {
  supabaseBarId: string | undefined | null;
  currentWeek: WeekLike | null;
  venueName?: string;
}

const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const labelOf = (iso: string) => {
  const d = parseISO(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

export function useEmployeePerformanceWeek({ supabaseBarId, currentWeek, venueName }: Args) {
  const weekStart = currentWeek?.week_start || null;
  const weekEnd = currentWeek?.week_end || null;
  const weekId = currentWeek?.id || null;

  const dataQuery = useQuery({
    queryKey: ['emp-perf-week', supabaseBarId, weekStart, weekEnd],
    enabled: !!supabaseBarId && !!weekStart && !!weekEnd,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<{
      current: EmpPerfCurrent;
      previous: { violations: number };
      trend4: EmpPerfTrendPoint[];
    }> => {
      const wsDate = parseISO(weekStart!);
      const weDate = parseISO(weekEnd!);
      const prevStart = isoOf(addDays(wsDate, -7));
      const prevEnd = isoOf(addDays(wsDate, -1));
      const trendStart = isoOf(addDays(wsDate, -21)); // 3 weeks before review week start
      const trendEnd = weekEnd!;

      const [profilesPrimary, profilesAdditional, timeEntries, weekIns, prevIns, trendIns] = await Promise.all([
        supabase
          .from('employee_profiles')
          .select('id, employee_name, preferred_name, is_active, hourly_wage, additional_venues, venue_id')
          .eq('venue_id', supabaseBarId!)
          .eq('is_vendor_account', false),
        supabase
          .from('employee_profiles')
          .select('id, employee_name, preferred_name, is_active, hourly_wage, additional_venues, venue_id')
          .contains('additional_venues', [supabaseBarId!])
          .eq('is_vendor_account', false),
        supabase
          .from('time_entries')
          .select('regular_hours, overtime_hours')
          .eq('venue_id', supabaseBarId!)
          .gte('business_date', weekStart!)
          .lte('business_date', weekEnd!)
          .neq('deleted', true),
        supabase
          .from('insights')
          .select('id, employee_id, source_metric, source_date')
          .eq('venue_id', supabaseBarId!)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', weekStart!)
          .lte('source_date', weekEnd!),
        supabase
          .from('insights')
          .select('id')
          .eq('venue_id', supabaseBarId!)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', prevStart)
          .lte('source_date', prevEnd),
        supabase
          .from('insights')
          .select('source_metric, source_date')
          .eq('venue_id', supabaseBarId!)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', trendStart)
          .lte('source_date', trendEnd),
      ]);

      // Profile dedupe
      const profMap = new Map<string, any>();
      for (const p of profilesPrimary.data ?? []) profMap.set(p.id, p);
      for (const p of profilesAdditional.data ?? []) if (!profMap.has(p.id)) profMap.set(p.id, p);
      const profiles = Array.from(profMap.values());
      const activeProfiles = profiles.filter(p => p.is_active);

      // Hours
      let hoursWorked = 0;
      let otHours = 0;
      for (const te of timeEntries.data ?? []) {
        const reg = Number(te.regular_hours) || 0;
        const ot = Number(te.overtime_hours) || 0;
        hoursWorked += reg + ot;
        otHours += ot;
      }

      // Violations + per-employee aggregate
      const violations = (weekIns.data || []).length;
      const perEmp = new Map<string, { count: number; breakdown: Record<string, number> }>();
      let exposure = 0;
      let missingWageAlerts = 0;
      for (const ins of weekIns.data || []) {
        const eid = ins.employee_id as string | null;
        if (eid) {
          let row = perEmp.get(eid);
          if (!row) { row = { count: 0, breakdown: {} }; perEmp.set(eid, row); }
          row.count += 1;
          const m = ins.source_metric || 'unknown';
          row.breakdown[m] = (row.breakdown[m] || 0) + 1;
        }
        if (ins.source_metric === 'missed_meal' || ins.source_metric === 'late_meal') {
          if (eid) {
            const prof = profMap.get(eid);
            const wage = prof?.hourly_wage;
            if (wage == null) missingWageAlerts += 1;
            else exposure += Number(wage) || 0;
          } else {
            missingWageAlerts += 1;
          }
        }
      }

      const allViolators = Array.from(perEmp.entries())
        .map(([eid, v]) => {
          const p = profMap.get(eid);
          const name = (p?.preferred_name || p?.employee_name || 'Unknown').trim();
          return { id: eid, name, count: v.count, breakdown: v.breakdown };
        })
        .sort((a, b) => b.count - a.count);
      const topOffenders = allViolators.slice(0, 3);

      const violatorIndex: EmpPerfViolator[] = Array.from(perEmp.keys())
        .map(eid => {
          const p = profMap.get(eid);
          if (!p) return null;
          return {
            id: eid,
            preferredName: (p.preferred_name || '').trim() || null,
            employeeName: (p.employee_name || '').trim(),
          };
        })
        .filter((v): v is EmpPerfViolator => !!v && !!v.employeeName);

      // 4-week trend buckets (review week + 3 prior)
      const buckets: EmpPerfTrendPoint[] = [];
      for (let i = 3; i >= 0; i--) {
        const ws = isoOf(addDays(wsDate, -7 * i));
        buckets.push({ weekStart: ws, weekLabel: labelOf(ws), breakdown: {}, total: 0 });
      }
      const bucketByStart = new Map(buckets.map(b => [b.weekStart, b]));
      for (const ins of trendIns.data || []) {
        if (!ins.source_date) continue;
        // bucket = the Monday on/before source_date that lies within our 4 weeks
        const sd = parseISO(ins.source_date);
        // Find which bucket: bucket.weekStart <= sd <= bucket.weekStart+6
        for (const b of buckets) {
          const bs = parseISO(b.weekStart);
          const be = addDays(bs, 6);
          if (sd >= bs && sd <= be) {
            const m = ins.source_metric || 'unknown';
            b.breakdown[m] = (b.breakdown[m] || 0) + 1;
            b.total += 1;
            break;
          }
        }
      }

      return {
        current: {
          activeEmployees: activeProfiles.length,
          hoursWorked: Math.round(hoursWorked),
          otHours: Math.round(otHours * 10) / 10,
          violations,
          exposure: Math.round(exposure * 100) / 100,
          missingWageAlerts,
          topOffenders,
          violatorIndex,
        },
        previous: { violations: (prevIns.data || []).length },
        trend4: buckets,
      };
    },
  });

  // AI brief
  const [shortBrief, setShortBrief] = useState('');
  const [longBrief, setLongBrief] = useState('');
  const [isQuiet, setIsQuiet] = useState(false);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);

  const current = dataQuery.data?.current;
  const previous = dataQuery.data?.previous;
  const trend4 = dataQuery.data?.trend4;

  const briefKey = useMemo(
    () => current ? `${supabaseBarId}|${weekId}|${current.violations}|${current.otHours}|${current.exposure}` : '',
    [supabaseBarId, weekId, current?.violations, current?.otHours, current?.exposure],
  );

  useEffect(() => {
    if (!current || !previous || !trend4 || !supabaseBarId || !weekId) {
      setShortBrief(''); setLongBrief(''); setIsQuiet(false);
      return;
    }
    let cancelled = false;
    setIsLoadingBrief(true);
    (async () => {
      // Client-side quiet derivation: no violations, no exposure, OT delta within 10%
      const prevOt = 0; // no prior OT in payload; treat as quiet when current is also low
      const otDeltaPct = current.otHours <= 1 ? 0 : Math.abs(current.otHours - prevOt) / Math.max(current.otHours, 1);
      const localQuiet =
        current.violations === 0 &&
        current.exposure === 0 &&
        otDeltaPct <= 0.10;

      try {
        const { data, error } = await supabase.functions.invoke('generate-employee-performance-brief', {
          body: {
            barId: supabaseBarId,
            weekId,
            venueName,
            weekStart,
            weekEnd,
            current,
            previous,
            trend4,
          },
        });
        if (cancelled) return;
        if (error) {
          console.warn('[useEmployeePerformanceWeek] brief error', error);
          setShortBrief(''); setLongBrief(''); setIsQuiet(localQuiet);
        } else {
          setShortBrief((data?.short_brief as string) || '');
          setLongBrief((data?.long_brief as string) || '');
          setIsQuiet(!!data?.is_quiet || localQuiet);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[useEmployeePerformanceWeek] brief invoke failed', e);
          setShortBrief(''); setLongBrief(''); setIsQuiet(localQuiet);
        }
      } finally {
        if (!cancelled) setIsLoadingBrief(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefKey]);

  return {
    current: current || null,
    previous: previous || null,
    trend4: trend4 || [],
    isLoading: dataQuery.isLoading,
    shortBrief,
    longBrief,
    isQuiet,
    isLoadingBrief,
  };
}

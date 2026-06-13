import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export interface EmployeeKpis {
  current30Count: number;        // distinct employees with ≥1 Labor deterministic insight in last 30d
  prior30Count: number;           // same, days 31-60 ago
  missedMealCounts: Map<string, number>; // active missed_meal alerts per employee, last 90d
}

export const useEmployeeKpis = (venueId: string | null | undefined) => {
  return useQuery({
    queryKey: ['employee-kpis', venueId],
    enabled: !!venueId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<EmployeeKpis> => {
      if (!venueId) {
        return { current30Count: 0, prior30Count: 0, missedMealCounts: new Map() };
      }
      const today = isoDaysAgo(0);
      const since30 = isoDaysAgo(30);
      const since60 = isoDaysAgo(60);
      const since31 = isoDaysAgo(31);
      const since90 = isoDaysAgo(90);

      const [cur, prior, mm] = await Promise.all([
        supabase
          .from('insights')
          .select('employee_id')
          .eq('venue_id', venueId)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', since30)
          .lte('source_date', today)
          .not('employee_id', 'is', null),
        supabase
          .from('insights')
          .select('employee_id')
          .eq('venue_id', venueId)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .gte('source_date', since60)
          .lte('source_date', since31)
          .not('employee_id', 'is', null),
        supabase
          .from('insights')
          .select('employee_id, status')
          .eq('venue_id', venueId)
          .eq('pillar', 'Labor')
          .eq('generated_by', 'deterministic_trigger')
          .eq('source_metric', 'missed_meal')
          .gte('source_date', since90)
          .not('employee_id', 'is', null),
      ]);
      if (cur.error) throw cur.error;
      if (prior.error) throw prior.error;
      if (mm.error) throw mm.error;

      const curSet = new Set<string>();
      for (const r of cur.data ?? []) if (r.employee_id) curSet.add(r.employee_id as string);
      const priorSet = new Set<string>();
      for (const r of prior.data ?? []) if (r.employee_id) priorSet.add(r.employee_id as string);

      const missedMealCounts = new Map<string, number>();
      for (const r of mm.data ?? []) {
        const eid = r.employee_id as string | null;
        if (!eid) continue;
        if (r.status === 'Dismissed' || r.status === 'Resolved') continue;
        missedMealCounts.set(eid, (missedMealCounts.get(eid) || 0) + 1);
      }

      return {
        current30Count: curSet.size,
        prior30Count: priorSet.size,
        missedMealCounts,
      };
    },
  });
};

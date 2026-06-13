import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmployeeInsight = {
  id: string;
  title: string;
  summary: string | null;
  pillar: string | null;
  severity: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  source_date: string | null;
  created_at: string;
  bar_id: string;
  status: string;
};

export type EmployeeInsightsResult = {
  wins: EmployeeInsight[];
  concerns: EmployeeInsight[];
  neutral: EmployeeInsight[];
  approvedWins: EmployeeInsight[];
  approvedConcerns: EmployeeInsight[];
};

/**
 * Fetch insights tagged to an employee in the last `windowDays` days,
 * grouped by sentiment. Pulls from BOTH the legacy single `insights.employee_id`
 * column AND the new `insight_employees` junction table so multi-employee
 * recognitions surface on every tagged person's profile.
 */
export function useEmployeeInsights(
  employeeId: string | undefined,
  windowDays: number = 90,
) {
  return useQuery<EmployeeInsightsResult>({
    queryKey: ['employee-insights', employeeId, windowDays],
    enabled: !!employeeId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - windowDays * 86400_000)
        .toISOString()
        .slice(0, 10);

      const cols =
        'id,title,summary,pillar,severity,sentiment,source_date,created_at,bar_id,status';

      const [legacy, junction] = await Promise.all([
        supabase
          .from('insights')
          .select(cols)
          .eq('employee_id', employeeId!)
          .gte('source_date', since)
          .order('source_date', { ascending: false })
          .limit(200),
        supabase
          .from('insight_employees')
          .select(`insight_id, insights:insight_id(${cols})`)
          .eq('employee_id', employeeId!),
      ]);

      if (legacy.error) throw legacy.error;
      if (junction.error) throw junction.error;

      const seen = new Set<string>();
      const rows: EmployeeInsight[] = [];
      for (const r of (legacy.data || []) as EmployeeInsight[]) {
        if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
      }
      for (const j of (junction.data || []) as any[]) {
        const r = j.insights as EmployeeInsight | null;
        if (!r || !r.source_date || r.source_date < since) continue;
        if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
      }
      rows.sort((a, b) => (b.source_date || '').localeCompare(a.source_date || ''));

      const wins = rows.filter((r) => r.sentiment === 'positive');
      const concerns = rows.filter((r) => r.sentiment === 'negative');
      const neutral = rows.filter((r) => r.sentiment === 'neutral');
      const approvedWins = wins.filter((r) => r.status === 'Actioned');
      const approvedConcerns = concerns.filter((r) => r.status === 'Actioned');

      return { wins, concerns, neutral, approvedWins, approvedConcerns };
    },
  });
}

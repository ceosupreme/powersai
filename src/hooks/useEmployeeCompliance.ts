import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceInsight {
  id: string;
  title: string;
  summary: string | null;
  detail: string | null;
  severity: string | null;
  status: string | null;
  source_metric: string | null;
  source_date: string | null;
  source_value: string | null;
  source_log_id: string | null;
  estimated_impact: string | null;
  generated_at: string | null;
}

export const useEmployeeCompliance = (
  employeeId: string | undefined,
  venueId: string | null | undefined,
  windowDays: number = 90,
) => {
  return useQuery({
    queryKey: ['employee-compliance', employeeId, venueId, windowDays],
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ComplianceInsight[]> => {
      if (!employeeId) return [];
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - windowDays);
      const sinceISO = since.toISOString().slice(0, 10);

      let q = supabase
        .from('insights')
        .select('id, title, summary, detail, severity, status, source_metric, source_date, source_value, source_log_id, estimated_impact, generated_at')
        .eq('employee_id', employeeId)
        .eq('pillar', 'Labor')
        .eq('generated_by', 'deterministic_trigger')
        .gte('source_date', sinceISO)
        .order('source_date', { ascending: false });
      if (venueId) q = q.eq('venue_id', venueId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ComplianceInsight[];
    },
  });
};

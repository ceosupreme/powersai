import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SentimentEvent {
  id: string;
  title: string;
  summary: string | null;
  source_date: string;
  sentiment: 'positive' | 'negative';
  pillar: string | null;
}

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export const useEmployeeSentimentEvents = (employeeId: string | null | undefined, windowDays = 90) => {
  return useQuery({
    queryKey: ['employee-sentiment-events', employeeId, windowDays],
    enabled: !!employeeId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SentimentEvent[]> => {
      if (!employeeId) return [];
      const since = isoDaysAgo(windowDays);

      // Pull from BOTH legacy single-employee column and the new junction table
      const cols = 'id, title, summary, source_date, sentiment, pillar, status';
      // Show all non-Dismissed sentiment-tagged insights. The previous
      // status='approved' filter matched zero rows because no such status
      // exists (valid values: New / Consolidated / Actioned / Dismissed).
      const VISIBLE_STATUSES = ['New', 'Actioned', 'Consolidated'];
      const [legacy, junction] = await Promise.all([
        supabase
          .from('insights')
          .select(cols)
          .eq('employee_id', employeeId)
          .in('sentiment', ['positive', 'negative'])
          .in('status', VISIBLE_STATUSES)
          .gte('source_date', since)
          .order('source_date', { ascending: false }),
        supabase
          .from('insight_employees')
          .select(`insight_id, insights:insight_id(${cols})`)
          .eq('employee_id', employeeId),
      ]);

      if (legacy.error) throw legacy.error;
      if (junction.error) throw junction.error;

      const seen = new Set<string>();
      const rows: any[] = [];
      for (const r of legacy.data || []) {
        if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
      }
      for (const j of (junction.data || []) as any[]) {
        const r = j.insights;
        if (!r) continue;
        if (!VISIBLE_STATUSES.includes(r.status)) continue;
        if (!['positive', 'negative'].includes(r.sentiment)) continue;
        if (!r.source_date || r.source_date < since) continue;
        if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
      }
      rows.sort((a, b) => (b.source_date || '').localeCompare(a.source_date || ''));

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        source_date: r.source_date,
        sentiment: r.sentiment,
        pillar: r.pillar,
      }));
    },
  });
};

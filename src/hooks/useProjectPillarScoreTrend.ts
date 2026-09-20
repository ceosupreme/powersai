import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EffectivePillar } from '@/lib/effectivePillars';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';

export interface TrendPoint {
  week_start: string;
  score: number | null;
}

/** Last 12 calendar weeks of overall weighted score from project_pillar_scores. */
export function useProjectPillarScoreTrend(
  projectId: string | null | undefined,
  pillars: EffectivePillar[],
) {
  const weeks: string[] = [];
  const { week_start } = currentWeekRange();
  const [y, m, d] = week_start.split('-').map(Number);
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(y, m - 1, d - i * 7);
    weeks.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
    );
  }

  const weightByKey = new Map(pillars.map((p) => [p.pillar_key, Number(p.weight || 0)]));

  return useQuery({
    queryKey: ['project-pillar-score-trend', projectId, weeks[0], pillars.length],
    enabled: !!projectId,
    queryFn: async (): Promise<TrendPoint[]> => {
      const { data } = await supabase
        .from('project_pillar_scores')
        .select('week_start,pillar_key,score')
        .eq('project_id', projectId!)
        .gte('week_start', weeks[0])
        .lte('week_start', weeks[weeks.length - 1]);

      const byWeek = new Map<string, { sum: number; weight: number }>();
      for (const row of (data ?? []) as any[]) {
        if (row.score == null) continue;
        const w = weightByKey.get(row.pillar_key);
        if (w == null) continue;
        const acc = byWeek.get(row.week_start) ?? { sum: 0, weight: 0 };
        acc.sum += Number(row.score) * w;
        acc.weight += w;
        byWeek.set(row.week_start, acc);
      }

      return weeks.map((wk) => {
        const acc = byWeek.get(wk);
        return {
          week_start: wk,
          score: acc && acc.weight > 0 ? acc.sum / acc.weight : null,
        };
      });
    },
  });
}

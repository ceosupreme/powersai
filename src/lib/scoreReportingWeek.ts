import { supabase } from '@/integrations/supabase/client';
import { fetchRowsIn } from '@/lib/batchFetch';

/** Completed periods keep their dates; current-week setup is the initial fallback. */
export function selectScoreReportingWeek(currentWeek: string, availableWeeks: (string | null | undefined)[]): string {
  return availableWeeks
    .filter((week): week is string => !!week && /^\d{4}-\d{2}-\d{2}$/.test(week) && week < currentWeek)
    .sort().pop() ?? currentWeek;
}

export function priorScoreWeek(week: string): string {
  const date = new Date(`${week}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

export async function fetchScoreReportingWeek(projectId: string, currentWeek: string): Promise<string> {
  const [values, scores] = await Promise.all([
    supabase.from('project_kpi_values').select('week_start')
      .eq('project_id', projectId).not('actual', 'is', null)
      .lt('week_start', currentWeek).order('week_start', { ascending: false }).limit(1),
    supabase.from('project_pillar_scores').select('week_start')
      .eq('project_id', projectId).not('score', 'is', null)
      .lt('week_start', currentWeek).order('week_start', { ascending: false }).limit(1),
  ]);
  if (values.error) throw values.error;
  if (scores.error) throw scores.error;
  return selectScoreReportingWeek(currentWeek, [values.data?.[0]?.week_start, scores.data?.[0]?.week_start]);
}

/** fetchScoreReportingWeek for many projects at once: two requests in total instead of two per project. */
export async function fetchScoreReportingWeeksBatch(projectIds: string[], currentWeek: string): Promise<Map<string, string>> {
  const [values, scores] = await Promise.all([
    fetchRowsIn('project_kpi_values', 'project_id,week_start', 'project_id', projectIds,
      (q) => q.not('actual', 'is', null).lt('week_start', currentWeek)),
    fetchRowsIn('project_pillar_scores', 'project_id,week_start', 'project_id', projectIds,
      (q) => q.not('score', 'is', null).lt('week_start', currentWeek)),
  ]);
  const latest = (rows: { project_id: string; week_start: string | null }[]) => {
    const out = new Map<string, string>();
    for (const r of rows) {
      const seen = out.get(r.project_id);
      if (r.week_start && (!seen || r.week_start > seen)) out.set(r.project_id, r.week_start);
    }
    return out;
  };
  const fromValues = latest(values);
  const fromScores = latest(scores);
  return new Map(
    projectIds.map((id) => [id, selectScoreReportingWeek(currentWeek, [fromValues.get(id), fromScores.get(id)])]),
  );
}

export const scoreReportingWeekKey = (projectId: string | null | undefined, currentWeek: string) =>
  ['project-score-week', projectId, currentWeek] as const;

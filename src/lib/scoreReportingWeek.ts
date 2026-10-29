import { supabase } from '@/integrations/supabase/client';

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

export const scoreReportingWeekKey = (projectId: string | null | undefined, currentWeek: string) =>
  ['project-score-week', projectId, currentWeek] as const;

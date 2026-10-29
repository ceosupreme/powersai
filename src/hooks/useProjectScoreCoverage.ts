import { useMemo } from 'react';
import { useProjectKpis, useProjectKpiValues } from '@/hooks/useProjectKpis';
import { useProjectPillarScores } from '@/hooks/useProjectPillarScores';
import { deriveScoreCoverage } from '@/lib/scoreCoverage';

export function useProjectScoreCoverage(
  projectId: string | null | undefined,
  weekStart: string,
  pillars: { pillar_key: string }[],
  unavailable = false,
) {
  const definitions = useProjectKpis(projectId);
  const values = useProjectKpiValues(projectId, weekStart);
  const scores = useProjectPillarScores(projectId, weekStart);
  const coverage = useMemo(() => deriveScoreCoverage(
    definitions.data ?? [], values.data ?? [], pillars, scores.data ?? [],
    unavailable || definitions.isError || values.isError || scores.isError, weekStart,
  ), [definitions.data, values.data, pillars, scores.data, definitions.isError, values.isError, scores.isError, unavailable, weekStart]);
  return { coverage, isLoading: !!projectId && (definitions.isLoading || values.isLoading || scores.isLoading) };
}

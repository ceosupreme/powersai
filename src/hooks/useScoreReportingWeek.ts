import { useQuery } from '@tanstack/react-query';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { fetchScoreReportingWeek, scoreReportingWeekKey } from '@/lib/scoreReportingWeek';

export function useScoreReportingWeek(projectId: string | null | undefined) {
  const currentWeek = currentWeekRange().week_start;
  const query = useQuery({
    queryKey: scoreReportingWeekKey(projectId, currentWeek),
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: () => fetchScoreReportingWeek(projectId!, currentWeek),
  });
  return { ...query, weekStart: query.data ?? currentWeek };
}

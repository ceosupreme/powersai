import { useQuery } from '@tanstack/react-query';
import {
  fetchEffectiveLeakVectors,
  EffectiveLeakVector,
} from '@/lib/effectiveLeakVectors';
import type { ProjectType } from '@/lib/effectivePillars';

export function useEffectiveLeakVectors(
  projectId: string | null | undefined,
  projectType: ProjectType | undefined,
) {
  return useQuery({
    queryKey: ['effective-leak-vectors', projectId, projectType],
    enabled: !!projectId && !!projectType,
    queryFn: () => fetchEffectiveLeakVectors(projectId!, projectType!),
    staleTime: 60_000,
  });
}

export type { EffectiveLeakVector };
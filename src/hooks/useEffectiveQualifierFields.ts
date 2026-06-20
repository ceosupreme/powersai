import { useQuery } from '@tanstack/react-query';
import {
  fetchEffectiveQualifierFields,
  fetchQualifierConfig,
  EffectiveQualifierField,
  QualifierConfig,
} from '@/lib/effectiveQualifierFields';
import type { ProjectType } from '@/lib/effectivePillars';

export function useEffectiveQualifierFields(
  projectId: string | null | undefined,
  projectType: ProjectType | undefined,
) {
  return useQuery({
    queryKey: ['effective-qualifier-fields', projectId, projectType],
    enabled: !!projectType,
    queryFn: () => fetchEffectiveQualifierFields(projectId ?? null, projectType!),
    staleTime: 60_000,
  });
}

export function useQualifierConfig(projectType: ProjectType | undefined) {
  return useQuery({
    queryKey: ['qualifier-config', projectType],
    enabled: !!projectType,
    queryFn: () => fetchQualifierConfig(projectType!),
    staleTime: 60_000,
  });
}

export type { EffectiveQualifierField, QualifierConfig };
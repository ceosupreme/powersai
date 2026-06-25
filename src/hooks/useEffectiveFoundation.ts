import { useQuery } from '@tanstack/react-query';
import {
  fetchEffectiveFoundationCategories,
  fetchEffectiveFoundationItems,
  type EffectiveFoundationCategory,
  type EffectiveFoundationItem,
} from '@/lib/effectiveFoundation';

export function useEffectiveFoundationCategories(
  projectId: string | null | undefined,
  projectType: string | null | undefined,
) {
  return useQuery({
    queryKey: ['effective-foundation-categories', projectId, projectType],
    enabled: !!projectId && !!projectType,
    queryFn: () => fetchEffectiveFoundationCategories(projectId!, projectType!),
    staleTime: 60_000,
  });
}

export function useEffectiveFoundationItems(
  projectId: string | null | undefined,
  projectType: string | null | undefined,
) {
  return useQuery({
    queryKey: ['effective-foundation-items', projectId, projectType],
    enabled: !!projectId && !!projectType,
    queryFn: () => fetchEffectiveFoundationItems(projectId!, projectType!),
    staleTime: 60_000,
  });
}

export type { EffectiveFoundationCategory, EffectiveFoundationItem };
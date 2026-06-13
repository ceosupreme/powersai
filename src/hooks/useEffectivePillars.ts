import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchEffectivePillars,
  EffectivePillar,
  ProjectType,
} from '@/lib/effectivePillars';

/** Read project_type for a venue (defaults to 'client' if row missing). */
export function useProjectType(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project-type', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectType> => {
      const { data } = await supabase
        .from('venues')
        .select('project_type')
        .eq('id', projectId!)
        .maybeSingle();
      return ((data as any)?.project_type ?? 'client') as ProjectType;
    },
    staleTime: 60_000,
  });
}

export function useEffectivePillars(
  projectId: string | null | undefined,
  projectType: ProjectType | undefined,
) {
  return useQuery({
    queryKey: ['effective-pillars', projectId, projectType],
    enabled: !!projectId && !!projectType,
    queryFn: () => fetchEffectivePillars(projectId!, projectType!),
    staleTime: 60_000,
  });
}

export type { EffectivePillar };
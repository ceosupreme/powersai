import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectType } from '@/lib/effectivePillars';

export interface ProjectTypeRow {
  id: ProjectType;
  label: string;
  description: string | null;
  sort_order: number;
  is_vertical: boolean;
  slug: string;
}

/** Read the project_types lookup table (drives admin dropdowns). */
export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: async (): Promise<ProjectTypeRow[]> => {
      const { data, error } = await (supabase as any)
        .from('project_types')
        .select('id,label,description,sort_order,is_vertical,slug')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ProjectTypeRow[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Look up a single project_type by its public slug (data-driven /qualify/[slug]). */
export function useProjectTypeBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['project-type-by-slug', slug],
    enabled: !!slug,
    queryFn: async (): Promise<ProjectTypeRow | null> => {
      const { data, error } = await (supabase as any)
        .from('project_types')
        .select('id,label,description,sort_order,is_vertical,slug')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return (data as ProjectTypeRow) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}
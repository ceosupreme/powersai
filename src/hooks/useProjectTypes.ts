import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectType } from '@/lib/effectivePillars';

export interface ProjectTypeRow {
  id: ProjectType;
  label: string;
  description: string | null;
  sort_order: number;
  is_vertical: boolean;
}

/** Read the project_types lookup table (drives admin dropdowns). */
export function useProjectTypes() {
  return useQuery({
    queryKey: ['project-types'],
    queryFn: async (): Promise<ProjectTypeRow[]> => {
      const { data, error } = await (supabase as any)
        .from('project_types')
        .select('id,label,description,sort_order,is_vertical')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ProjectTypeRow[];
    },
    staleTime: 5 * 60_000,
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KpiDef, KpiValue } from '@/lib/kpiScoring';

/** Active KPI definitions for a project, ordered for display. */
export function useProjectKpis(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project-kpis', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<KpiDef[]> => {
      const { data, error } = await supabase
        .from('project_kpis')
        .select('pillar_key,kpi_key,kpi_label,weight,direction,target,unit,source,sort_order')
        .eq('project_id', projectId!)
        .eq('is_active', true)
        .order('pillar_key', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        weight: Number(r.weight ?? 0),
        target: r.target == null ? null : Number(r.target),
      })) as KpiDef[];
    },
    staleTime: 60_000,
  });
}

/** Weekly KPI values for a project. */
export function useProjectKpiValues(
  projectId: string | null | undefined,
  weekStart: string | null | undefined,
) {
  return useQuery({
    queryKey: ['project-kpi-values', projectId, weekStart],
    enabled: !!projectId && !!weekStart,
    queryFn: async (): Promise<KpiValue[]> => {
      const { data, error } = await supabase
        .from('project_kpi_values')
        .select('pillar_key,kpi_key,actual,score,note')
        .eq('project_id', projectId!)
        .eq('week_start', weekStart!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        actual: r.actual == null ? null : Number(r.actual),
        score: r.score == null ? null : Number(r.score),
      })) as KpiValue[];
    },
  });
}

export function useUpsertProjectKpiValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      week_start: string;
      pillar_key: string;
      kpi_key: string;
      actual: number | null;
      score: number | null;
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_kpi_values')
        .upsert(
          {
            project_id: input.project_id,
            week_start: input.week_start,
            pillar_key: input.pillar_key,
            kpi_key: input.kpi_key,
            actual: input.actual,
            score: input.score,
            note: input.note ?? null,
            updated_by: user?.id ?? null,
          },
          { onConflict: 'project_id,week_start,pillar_key,kpi_key' },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['project-kpi-values', v.project_id, v.week_start] });
    },
  });
}

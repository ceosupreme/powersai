import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectPillarScoreRow {
  pillar_key: string;
  score: number | null;
  note: string | null;
  updated_at: string;
}

export function useProjectPillarScores(
  projectId: string | null | undefined,
  weekStart: string | null | undefined,
) {
  return useQuery({
    queryKey: ['project-pillar-scores', projectId, weekStart],
    enabled: !!projectId && !!weekStart,
    queryFn: async (): Promise<ProjectPillarScoreRow[]> => {
      const { data } = await supabase
        .from('project_pillar_scores')
        .select('pillar_key,score,note,updated_at')
        .eq('project_id', projectId!)
        .eq('week_start', weekStart!);
      return (data || []) as ProjectPillarScoreRow[];
    },
  });
}

export function useUpsertProjectPillarScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      week_start: string;
      pillar_key: string;
      score: number | null;
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('project_pillar_scores')
        .upsert(
          {
            project_id: input.project_id,
            week_start: input.week_start,
            pillar_key: input.pillar_key,
            score: input.score,
            note: input.note ?? null,
            updated_by: user?.id ?? null,
          },
          { onConflict: 'project_id,week_start,pillar_key' },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: ['project-pillar-scores', v.project_id, v.week_start],
      });
    },
  });
}
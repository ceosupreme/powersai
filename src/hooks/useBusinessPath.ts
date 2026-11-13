import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { businessPathProgress, savedPathRow, validatePathProof, type PathStage, type PathStep, type PathStatusRow, type SettingsDraft, type StepDraft } from '@/lib/businessPath';

async function allRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}
export function useBusinessPath(projectId: string) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['business-path', user?.id, projectId];
  const query = useQuery({
    queryKey, enabled: !!projectId && !!user,
    queryFn: async () => {
      const [stages, steps, settings, statuses] = await Promise.all([
        allRows<PathStage>((from, to) => supabase.from('business_path_stages').select('*').eq('is_active', true).order('sort_order').order('key').range(from, to)),
        allRows<PathStep>((from, to) => supabase.from('business_path_steps').select('*').eq('is_active', true).order('stage_key').order('sort_order').order('key').range(from, to)),
        supabase.from('brand_path_settings').select('*').eq('venue_id', projectId).maybeSingle(),
        allRows<PathStatusRow>((from, to) => supabase.from('brand_path_step_status').select('*').eq('venue_id', projectId).order('id').range(from, to)),
      ]);
      if (settings.error) throw settings.error;
      return { settings: settings.data, hasSavedStatus: statuses.length > 0, ...businessPathProgress(stages, steps, settings.data, statuses) };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey });
  const stepMutation = useMutation({
    mutationFn: async ({ stepKey, draft }: { stepKey: string; draft: StepDraft }) => {
      if (!user) throw new Error('Sign in to save this step.');
      validatePathProof(draft);
      const { data, error } = await supabase.from('brand_path_step_status').upsert({
        venue_id: projectId, step_key: stepKey, status: draft.status,
        note: draft.note?.trim() || null, evidence_url: draft.evidence_url?.trim() || null, updated_by: user.id,
      }, { onConflict: 'venue_id,step_key' }).select('*').maybeSingle();
      return savedPathRow(data, error);
    }, onSuccess: refresh,
  });
  const settingsMutation = useMutation({
    mutationFn: async (draft: SettingsDraft) => {
      if (!user || !isAdmin) throw new Error('Only admins can change path settings.');
      const { data, error } = await supabase.from('brand_path_settings').upsert({
        ...draft, venue_id: projectId, updated_by: user.id,
      }, { onConflict: 'venue_id' }).select('*').maybeSingle();
      return savedPathRow(data, error);
    }, onSuccess: refresh,
  });
  return { ...query, saveStep: (stepKey: string, draft: StepDraft) => stepMutation.mutateAsync({ stepKey, draft }),
    saveSettings: settingsMutation.mutateAsync, savingStep: stepMutation.isPending, savingSettings: settingsMutation.isPending };
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutoApproveConfig {
  enabled: boolean;
  severity_thresholds: { Low: number; Medium: number };
  repeat_matching: { enabled: boolean; window_weeks: number; similarity_threshold: number };
  pillar_overrides: Record<string, boolean>;
}

const DEFAULT_CONFIG: AutoApproveConfig = {
  enabled: false,
  severity_thresholds: { Low: 80, Medium: 90 },
  repeat_matching: { enabled: true, window_weeks: 12, similarity_threshold: 85 },
  pillar_overrides: { Revenue: true, Labor: true, Operations: true, 'Guest Experience': true },
};

export const useAutoApproveConfig = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['auto-approve-config'],
    queryFn: async (): Promise<AutoApproveConfig> => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'auto_approve')
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...(data.value as Record<string, unknown>) } as AutoApproveConfig;
    },
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (config: AutoApproveConfig) => {
      const { error } = await supabase
        .from('app_config')
        .upsert([{ key: 'auto_approve', value: JSON.parse(JSON.stringify(config)), updated_at: new Date().toISOString() }], { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto-approve-config'] }),
  });

  return {
    config: query.data ?? DEFAULT_CONFIG,
    isLoading: query.isLoading,
    updateConfig: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
};

export interface AutoApproveLogEntry {
  id: string;
  action_item_id: string;
  bar_id: string;
  action_title: string;
  pillar: string;
  rule_triggered: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
}

export const useAutoApproveLog = () => {
  return useQuery({
    queryKey: ['auto-approve-log'],
    queryFn: async (): Promise<AutoApproveLogEntry[]> => {
      const { data, error } = await supabase
        .from('auto_approve_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AutoApproveLogEntry[];
    },
    staleTime: 30_000,
  });
};

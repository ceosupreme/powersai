import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeakStackInput {
  name: string;
  value?: number;
  source?: 'signal' | 'override' | 'vertical_default' | 'fallback';
  caveat?: string;
  unresolved?: boolean;
}
export interface LeakStackResult {
  name: string;
  severity: 'headline' | 'supporting';
  benchmark: string | null;
  risk_type: 'captured_revenue' | 'avoided_loss';
  risk_multiplier?: number;
  monthly_dollars: number | null;
  reason?: string;
  inputs: LeakStackInput[];
}
export interface LeakStackRun {
  id: string;
  venue_id: string;
  computed_at: string;
  total_monthly_dollars: number;
  total_risk_exposure_dollars: number;
  top_leak_key: string | null;
  results: LeakStackResult[];
  inputs_basis: Record<string, any>;
}

export function useLatestLeakStackRun(venueId: string | null) {
  return useQuery({
    queryKey: ['leak-stack-run', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leak_stack_runs')
        .select('*')
        .eq('venue_id', venueId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as LeakStackRun) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useLeakStackHistory(venueId: string | null) {
  return useQuery({
    queryKey: ['leak-stack-history', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leak_stack_runs')
        .select('id,computed_at,total_monthly_dollars,total_risk_exposure_dollars,top_leak_key')
        .eq('venue_id', venueId)
        .order('computed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Pick<LeakStackRun, 'id' | 'computed_at' | 'total_monthly_dollars' | 'total_risk_exposure_dollars' | 'top_leak_key'>[];
    },
    staleTime: 30_000,
  });
}

export function useRunLeakStack(venueId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!venueId) throw new Error('project required');
      const { data, error } = await supabase.functions.invoke('compute-leak-stack', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).run as LeakStackRun;
    },
    onSuccess: () => {
      toast.success('Leak stack computed');
      qc.invalidateQueries({ queryKey: ['leak-stack-run', venueId] });
      qc.invalidateQueries({ queryKey: ['leak-stack-history', venueId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to compute'),
  });
}
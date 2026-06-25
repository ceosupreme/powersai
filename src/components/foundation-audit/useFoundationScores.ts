import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveFoundationCategories, useEffectiveFoundationItems } from '@/hooks/useEffectiveFoundation';
import { useProjectType } from '@/hooks/useEffectivePillars';
import {
  deriveFoundationScores,
  type FoundationScoreResult,
  type VenueFoundationItemStatus,
} from './deriveFoundationScores';

export const foundationStatusKey = (venueId: string | null | undefined) =>
  ['foundation-audit', 'status', venueId ?? 'none'] as const;

export const foundationRunsKey = (venueId: string | null | undefined) =>
  ['foundation-audit', 'runs', venueId ?? 'none'] as const;

function useFoundationStatuses(venueId: string | null | undefined) {
  return useQuery({
    queryKey: foundationStatusKey(venueId),
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_foundation_item_status')
        .select('item_key,status,evidence_url,notes,source,detected_at,updated_at')
        .eq('venue_id', venueId!);
      if (error) throw error;
      return (data ?? []) as VenueFoundationItemStatus[];
    },
    staleTime: 30_000,
  });
}

function useLastFoundationRun(venueId: string | null | undefined) {
  return useQuery({
    queryKey: foundationRunsKey(venueId),
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foundation_audit_runs')
        .select('id,triggered_at,completed_at,status,duration_ms,summary,notes')
        .eq('venue_id', venueId!)
        .order('triggered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export interface FoundationScoresHookResult {
  isLoading: boolean;
  error: unknown;
  result: FoundationScoreResult | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  projectType: string | null;
}

export function useFoundationScores(
  venueId: string | null | undefined,
): FoundationScoresHookResult {
  const projectType = useProjectType(venueId);
  const categories = useEffectiveFoundationCategories(venueId, projectType.data);
  const items = useEffectiveFoundationItems(venueId, projectType.data);
  const statuses = useFoundationStatuses(venueId);
  const lastRun = useLastFoundationRun(venueId);

  const result = useMemo(() => {
    if (!categories.data || !items.data) return null;
    return deriveFoundationScores(categories.data, items.data, statuses.data ?? []);
  }, [categories.data, items.data, statuses.data]);

  return {
    isLoading:
      projectType.isLoading || categories.isLoading || items.isLoading || statuses.isLoading,
    error: categories.error ?? items.error ?? statuses.error,
    result,
    lastRunAt: lastRun.data?.triggered_at ?? null,
    lastRunStatus: lastRun.data?.status ?? null,
    projectType: projectType.data ?? null,
  };
}

export function useRefreshFoundationAudit(venueId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!venueId) throw new Error('No project selected');
      const { data, error } = await supabase.functions.invoke('foundation-audit-refresh', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: foundationStatusKey(venueId) });
      qc.invalidateQueries({ queryKey: foundationRunsKey(venueId) });
    },
  });
}
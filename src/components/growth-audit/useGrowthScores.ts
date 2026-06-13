// Bundled hook: pulls findings + last audit run, derives all Overview metrics.
// Components consume one hook instead of stitching three queries.

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFindings, findingsKey } from './findings/useFindings';
import { useGbpStatus } from './data-sources/useGbpStatus';
import { useReputationStatus } from './data-sources/useReputationStatus';
import { useWebsiteStatus } from './data-sources/useWebsiteStatus';
import { useMapPackSummary } from './data-sources/useMapPackSummary';
import { useAiSearchSummary } from './data-sources/useAiSearchSummary';
import {
  useIsHospitalityProject,
  HOSPITALITY_ONLY_CATEGORIES,
} from '@/hooks/useIsHospitalityProject';
import {
  deriveCategoryScores,
  derivePrimaryMetrics,
  deriveTopPriorities,
  deriveQuickStats,
  type CategoryScore,
  type PrimaryMetrics,
  type Priority,
  type QuickStats,
} from './deriveScores';

export const runsKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'runs', venueId ?? 'none'] as const;

function useLastAuditRun(venueId: string | null | undefined) {
  return useQuery({
    queryKey: runsKey(venueId),
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('growth_audit_runs')
        .select('id, triggered_at, status, notes')
        .eq('venue_id', venueId!)
        .order('triggered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export type GrowthScoresResult = {
  isLoading: boolean;
  error: unknown;
  primary: PrimaryMetrics;
  categories: CategoryScore[];
  priorities: Priority[];
  quickStats: QuickStats;
  lastRunAt: string | null;
};

export function useGrowthScores(venueId: string | null | undefined): GrowthScoresResult {
  const findings = useFindings(venueId);
  const runs = useLastAuditRun(venueId);
  const gbp = useGbpStatus(venueId);
  const reputation = useReputationStatus(venueId);
  const website = useWebsiteStatus(venueId);
  const mapPack = useMapPackSummary(venueId);
  const aiSearch = useAiSearchSummary(venueId);
  const hospitalityQ = useIsHospitalityProject(venueId);
  const isHospitality = hospitalityQ.data ?? false;

  const lastRunAt = runs.data?.triggered_at ?? null;
  const gbpSnap = gbp.data?.snapshot ?? null;
  const rep = reputation.data ?? null;
  const web = website.data ?? null;
  const mp = mapPack.data ?? null;
  const ai = aiSearch.data ?? null;

  const { primary, categories, priorities, quickStats } = useMemo(() => {
    const raw = findings.data ?? [];
    // For non-hospitality projects, hide findings from the 4 hospitality-only
    // categories so they don't leak into Top Priorities, quickStats, etc.
    const list = isHospitality
      ? raw
      : raw.filter(
          (f) => !(HOSPITALITY_ONLY_CATEGORIES as readonly string[]).includes(f.category),
        );
    const cats = deriveCategoryScores(list, gbpSnap, rep, web, mp, ai, isHospitality);
    return {
      categories: cats,
      primary: derivePrimaryMetrics(list, cats, lastRunAt, isHospitality),
      priorities: deriveTopPriorities(list),
      quickStats: deriveQuickStats(list),
    };
  }, [findings.data, lastRunAt, gbpSnap, rep, web, mp, ai, isHospitality]);

  return {
    isLoading: findings.isLoading || runs.isLoading || hospitalityQ.isLoading,
    error: findings.error ?? runs.error,
    primary,
    categories,
    priorities,
    quickStats,
    lastRunAt,
  };
}

/**
 * Trigger the `growth-audit-refresh` edge function (stub for now — records a
 * run and returns). On success we invalidate the findings + runs queries so
 * the Overview's "Last refresh" timestamp updates immediately.
 */
export function useRefreshAudit(venueId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!venueId) throw new Error('No venue selected');
      const { data, error } = await supabase.functions.invoke('growth-audit-refresh', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: runsKey(venueId) });
      qc.invalidateQueries({ queryKey: findingsKey(venueId) });
    },
  });
}

// Real, DB-backed findings hook. Returns Finding[] in the shape the UI
// already consumes. Active findings are anything not Resolved/Dismissed
// and not currently snoozed past today.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dbFindingToFinding, type GrowthFindingRow } from './dbAdapter';
import type { Finding, FindingStatus } from './mockFindings';

export const findingsKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'findings', venueId ?? 'none'] as const;

export function useFindings(venueId: string | null | undefined) {
  return useQuery({
    queryKey: findingsKey(venueId),
    enabled: !!venueId,
    queryFn: async (): Promise<Finding[]> => {
      const { data, error } = await supabase
        .from('growth_findings')
        .select('*')
        .eq('venue_id', venueId!)
        .order('priority_score', { ascending: false });
      if (error) throw error;
      return (data as GrowthFindingRow[]).map(dbFindingToFinding);
    },
    staleTime: 30 * 1000,
  });
}

type StatusPatch = {
  id: string;
  status: FindingStatus;
  dismissReason?: string;
  snoozedUntil?: string;
};

/** Status mutation. Resolved/Dismissed also stamp resolved_at. */
export function useFindingMutation(venueId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: StatusPatch) => {
      const updates: Record<string, unknown> = { status: patch.status };
      if (patch.dismissReason !== undefined) updates.dismiss_reason = patch.dismissReason;
      if (patch.snoozedUntil !== undefined) updates.snoozed_until = patch.snoozedUntil;
      if (patch.status === 'Resolved' || patch.status === 'Dismissed') {
        updates.resolved_at = new Date().toISOString();
      } else {
        // Re-opening a previously-resolved finding clears resolved_at so the
        // continuous-signal idempotency index works correctly.
        updates.resolved_at = null;
      }
      const { error } = await supabase
        .from('growth_findings')
        .update(updates)
        .eq('id', patch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingsKey(venueId) });
      qc.invalidateQueries({ queryKey: ['growth-audit', 'runs', venueId ?? 'none'] });
    },
  });
}

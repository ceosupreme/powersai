import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type OnboardingStatus = 'not_started' | 'complete' | 'skipped';

export interface VenueOnboardingProgressRow {
  id: string;
  venue_id: string;
  step_key: string;
  status: OnboardingStatus;
  auto_detected: boolean;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Per-venue wizard progress. Reads rows for a venue, exposes statusFor(stepKey)
 * and a setStatus mutation that upserts on (venue_id, step_key).
 * Detectors call setStatusAuto separately (only flips not_started → complete).
 */
export function useVenueOnboardingProgress(venueId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['venue-onboarding-progress', venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<VenueOnboardingProgressRow[]> => {
      const { data, error } = await supabase
        .from('venue_onboarding_progress')
        .select('*')
        .eq('venue_id', venueId!);
      if (error) throw error;
      return (data || []) as VenueOnboardingProgressRow[];
    },
    staleTime: 30_000,
  });

  const rows = query.data ?? [];
  const byKey = new Map(rows.map((r) => [r.step_key, r]));

  const statusFor = useCallback(
    (stepKey: string): OnboardingStatus => byKey.get(stepKey)?.status ?? 'not_started',
    [byKey],
  );

  const setStatus = useMutation({
    mutationFn: async (args: { stepKey: string; status: OnboardingStatus; autoDetected?: boolean }) => {
      if (!venueId) throw new Error('venueId required');
      const { error } = await supabase
        .from('venue_onboarding_progress')
        .upsert(
          {
            venue_id: venueId,
            step_key: args.stepKey,
            status: args.status,
            auto_detected: args.autoDetected ?? false,
            updated_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'venue_id,step_key' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venue-onboarding-progress', venueId] }),
  });

  return {
    rows,
    statusFor,
    isLoading: query.isLoading,
    setStatus: (stepKey: string, status: OnboardingStatus) =>
      setStatus.mutateAsync({ stepKey, status, autoDetected: false }),
    setStatusAuto: (stepKey: string, status: OnboardingStatus) =>
      setStatus.mutateAsync({ stepKey, status, autoDetected: true }),
    refetch: query.refetch,
  };
}
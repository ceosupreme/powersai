import { useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { VENUE_ONBOARDING_STEPS } from '@/config/venueOnboardingSteps';
import type { ProjectType } from '@/lib/effectivePillars';
import { useVenueOnboardingProgress, type OnboardingStatus } from './useVenueOnboardingProgress';

/**
 * Runs every step's detector in parallel against the live DB, and flips
 * `not_started` rows to `complete` (auto_detected=true) when the surface is
 * actually configured. Never overrides a user-set `skipped` or `complete`.
 */
export function useVenueOnboardingDetectors(
  venueId: string | null | undefined,
  projectType: ProjectType | null,
) {
  const progress = useVenueOnboardingProgress(venueId);

  const detectorSteps = VENUE_ONBOARDING_STEPS.filter((s) => !!s.detector && !s.manualOnly);

  const results = useQueries({
    queries: detectorSteps.map((step) => ({
      queryKey: ['venue-onboarding-detector', venueId, step.key, projectType],
      enabled: !!venueId,
      staleTime: 60_000,
      queryFn: async (): Promise<{ key: string; ok: boolean }> => {
        try {
          const ok = await step.detector!({ venueId: venueId!, projectType });
          return { key: step.key, ok };
        } catch {
          return { key: step.key, ok: false };
        }
      },
    })),
  });

  // Sync detector results → progress table (only auto-flip not_started → complete).
  useEffect(() => {
    if (!venueId || progress.isLoading) return;
    results.forEach((r, i) => {
      const step = detectorSteps[i];
      if (!r.data) return;
      const current = progress.statusFor(step.key);
      if (r.data.ok && current === 'not_started') {
        progress.setStatusAuto(step.key, 'complete' as OnboardingStatus).catch(() => undefined);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, progress.isLoading, JSON.stringify(results.map((r) => r.data))]);

  return progress;
}
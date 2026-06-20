import { useMemo } from 'react';
import { VENUE_ONBOARDING_STEPS, stepsForPhase } from '@/config/venueOnboardingSteps';
import type { OnboardingStatus } from './useVenueOnboardingProgress';

/**
 * Derives LIVE state + phase-3 % from the wizard progress.
 *   isLive = every REQUIRED step in phases 1+2 is complete (or skipped for non-required ones).
 *   phase3Pct = (complete + skipped) / total in phase 3.
 */
export function useVenueLiveStatus(statusFor: (k: string) => OnboardingStatus) {
  return useMemo(() => {
    const required = VENUE_ONBOARDING_STEPS.filter(
      (s) => s.required && (s.phase === 'identity' || s.phase === 'go_live'),
    );
    const requiredDone = required.every((s) => statusFor(s.key) === 'complete');

    const phase3 = stepsForPhase('full_config');
    const phase3Done = phase3.filter((s) => {
      const st = statusFor(s.key);
      return st === 'complete' || st === 'skipped';
    }).length;
    const phase3Pct = phase3.length === 0 ? 0 : Math.round((phase3Done / phase3.length) * 100);

    return {
      isLive: requiredDone,
      requiredTotal: required.length,
      requiredDone: required.filter((s) => statusFor(s.key) === 'complete').length,
      phase3Total: phase3.length,
      phase3DoneOrSkipped: phase3Done,
      phase3Pct,
    };
  }, [statusFor]);
}
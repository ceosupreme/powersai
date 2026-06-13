// Reliability variance buckets for weekly hours std-dev (last 90 days).
//
// Source distribution (computed 2026-04-29 over all matched employees with
// >=3 weeks of time entries in the last 90 days, n=124):
//   p25 = 8.40, p50 = 10.42, p66 = 12.96, p75 = 14.07, p90 = 16.24
//
// Boundaries below split roughly into thirds (p33 ≈ 9.0, p66 ≈ 13.0).
// Re-evaluate if the distribution shifts materially.
export const VARIANCE_THRESHOLDS = {
  CONSISTENT_MAX: 9,        // sd <= 9
  VARIABLE_MAX: 13,         // 9 < sd <= 13
  // > 13 = highly variable
} as const;

export type VarianceBucket = 'Consistent' | 'Variable' | 'Highly variable' | 'Insufficient data';

export function classifyVariance(sd: number | null, weekCount: number): VarianceBucket {
  if (sd === null || weekCount < 3) return 'Insufficient data';
  if (sd <= VARIANCE_THRESHOLDS.CONSISTENT_MAX) return 'Consistent';
  if (sd <= VARIANCE_THRESHOLDS.VARIABLE_MAX) return 'Variable';
  return 'Highly variable';
}

export const COMPLIANCE_WINDOW_DAYS = 90;
export const NEW_HIRE_TENURE_DAYS = 30;
export const ALLSTAR_TENURE_DAYS = 90;
export const NEEDS_ATTENTION_VIOLATIONS = 3;
export const NO_CLOCKOUT_WINDOW_DAYS = 30;
export const NO_CLOCKOUT_THRESHOLD = 2;
export const REPEAT_PATTERN_WINDOW_DAYS = 30;

export const METRIC_LABELS: Record<string, string> = {
  late_meal: 'Late meal break',
  missed_meal: 'Missed meal break',
  overtime: 'Overtime',
  multi_location: 'Multi-location shift',
  no_clockout: 'No clockout',
};

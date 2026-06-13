import { MetricFormat } from '@/components/shared/PillarMetricRow';

export interface PillarMetricConfig {
  label: string;
  actualKey: string;
  scoreKey: string;
  format: MetricFormat;
  lowerIsBetter?: boolean;
  multiplyBy100?: boolean;
  unit?: string;
  dailyBreakdownKey?: string;
  /** weekly_core column name for YOY lookup */
  coreKey?: string;
  /** period_config column name for fallback target */
  targetConfigKey?: string;
}

export const REVENUE_METRICS: PillarMetricConfig[] = [
  { label: 'Net Sales', actualKey: 'r1_actual', scoreKey: 'r1_score', format: 'currency', dailyBreakdownKey: 'net_sales', coreKey: 'net_sales', targetConfigKey: 'weekly_net_sales_target' },
  { label: 'Transactions', actualKey: 'r2_actual', scoreKey: 'r2_score', format: 'number', dailyBreakdownKey: 'orders', coreKey: 'transactions', targetConfigKey: 'weekly_orders_target' },
  { label: 'Avg Check', actualKey: 'r3_actual', scoreKey: 'r3_score', format: 'currency', dailyBreakdownKey: 'avg_check', coreKey: 'aov', targetConfigKey: 'weekly_aov_target' },
  { label: 'Comps/Discounts', actualKey: 'r4_actual', scoreKey: 'r4_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, dailyBreakdownKey: 'discount_pct', coreKey: 'discount_pct', targetConfigKey: 'discount_pct_target' },
];

export const LABOR_METRICS: PillarMetricConfig[] = [
  { label: 'Labor %', actualKey: 'l1_actual', scoreKey: 'l1_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, dailyBreakdownKey: 'labor_pct', coreKey: 'labor_pct', targetConfigKey: 'labor_pct_target' },
  { label: 'Sales per Labor Hour', actualKey: 'l2_actual', scoreKey: 'l2_score', format: 'currency', dailyBreakdownKey: 'splh', coreKey: 'splh', targetConfigKey: 'splh_target' },
  { label: 'Schedule Variance', actualKey: 'l3_actual', scoreKey: 'l3_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, coreKey: 'schedule_variance_pct', targetConfigKey: 'schedule_variance_target' },
  { label: 'Overtime', actualKey: 'l4_actual', scoreKey: 'l4_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, dailyBreakdownKey: 'ot_rate', coreKey: 'overtime_rate', targetConfigKey: 'overtime_rate_target' },
  { label: 'Workforce Engagement', actualKey: 'l5_actual', scoreKey: 'l5_score', format: 'number', coreKey: 'engage_composite_score', targetConfigKey: 'engage_score_target' },
];

export const OPERATIONS_METRICS: PillarMetricConfig[] = [
  { label: 'Task Completion', actualKey: 'o1_actual', scoreKey: 'o1_score', format: 'percent', multiplyBy100: true, coreKey: 'task_completion_pct', targetConfigKey: 'task_completion_target' },
  { label: 'Turn Time', actualKey: 'o2_actual', scoreKey: 'o2_score', format: 'number', unit: 'min', lowerIsBetter: true, coreKey: 'turn_time_avg_min', targetConfigKey: 'turn_time_target_min' },
  { label: 'Void Rate', actualKey: 'o3_actual', scoreKey: 'o3_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, dailyBreakdownKey: 'void_rate', coreKey: 'void_rate', targetConfigKey: 'void_rate_target' },
  { label: 'Unpaid $', actualKey: 'o4_actual', scoreKey: 'o4_score', format: 'currency', lowerIsBetter: true, dailyBreakdownKey: 'unpaid', coreKey: 'unpaid_checks_amount', targetConfigKey: 'unpaid_amount_target' },
  { label: 'Sidework Completion', actualKey: 'o5_actual', scoreKey: 'o5_score', format: 'percent', multiplyBy100: true, coreKey: 'sidework_completion_pct', targetConfigKey: 'sidework_completion_target' },
];

export const GUEST_METRICS: PillarMetricConfig[] = [
  { label: 'Guest Count', actualKey: 'g1_actual', scoreKey: 'g1_score', format: 'number', dailyBreakdownKey: 'guests', coreKey: 'weekly_guests', targetConfigKey: 'weekly_guests_target' },
  { label: 'Tip %', actualKey: 'g2_actual', scoreKey: 'g2_score', format: 'percent', multiplyBy100: true, dailyBreakdownKey: 'tip_pct', coreKey: 'tip_pct', targetConfigKey: 'tip_pct_target' },
  { label: 'Refund %', actualKey: 'g3_actual', scoreKey: 'g3_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, dailyBreakdownKey: 'refund_pct', coreKey: 'refund_pct', targetConfigKey: 'refund_pct_target' },
  { label: 'Online Reputation', actualKey: 'g4_actual', scoreKey: 'g4_score', format: 'rating', coreKey: 'online_reputation_score', targetConfigKey: 'composite_rating_target' },
  { label: 'KDS > 25min %', actualKey: 'g5_actual', scoreKey: 'g5_score', format: 'percent', lowerIsBetter: true, multiplyBy100: true, coreKey: 'kds_over_25_pct' },
];

/**
 * Per-pillar set of `insights.source_metric` values that count as
 * "drives the pillar score". Lowercased; common synonyms folded in.
 * Used by PillarRows.tsx to filter daily_insights_v2 noise out of the
 * pillar drill-downs by default.
 */
export const SCORING_METRICS: Record<'Revenue' | 'Labor' | 'Operations' | 'Guest Experience', Set<string>> = {
  Revenue: new Set([
    'net_sales', 'revenue', 'transactions', 'orders', 'avg_check', 'aov',
    'comps_pct', 'comps_amount', 'discount_pct', 'discounts_pct',
  ]),
  Labor: new Set([
    'labor_pct', 'labor_percent', 'labor_percentage', 'splh',
    'schedule_variance', 'schedule_variance_pct', 'schedule_variance_hours',
    'actual_vs_scheduled_hours', 'scheduled_hours', 'actual_hours', 'worked_hours',
    'overtime', 'overtime_pct', 'overtime_rate', 'overtime_hours', 'weekly_overtime',
    'late_meal', 'missed_meal', 'meal_tracking_gap', 'meal_break_weekly_rollup',
    'meal_break_employee_escalation', 'no_clockout', 'no_clockout_weekly_rollup',
    'no_clockout_employee_escalation', 'multi_location',
    'engage_composite_score', 'engagement_score',
  ]),
  Operations: new Set([
    'task_completion_pct', 'turn_time', 'turn_time_avg_min',
    'void_rate', 'voids_pct', 'voids_percentage', 'void_pct',
    'unpaid', 'unpaid_checks_amount', 'sidework_completion_pct',
    'stockout_count',
  ]),
  'Guest Experience': new Set([
    'guests', 'weekly_guests', 'guest_count',
    'tip_pct', 'tips_pct', 'tip_percent', 'tips_percent', 'tip_percentage', 'tips_amount',
    'refund_pct', 'refunds_pct',
    'online_reputation_score', 'google_reviews', 'composite_rating',
    'kds_over_25_pct',
  ]),
};

/** Resolve target for a metric: YOY first, then period_config fallback */
export interface ResolvedTarget {
  value: number;
  label: string; // 'vs LY' or 'vs target'
}

export function resolveMetricTarget(
  metric: PillarMetricConfig,
  priorYearCore: Record<string, unknown> | null | undefined,
  periodConfig: Record<string, unknown> | null | undefined,
): ResolvedTarget | null {
  // 1. Try YOY from prior year weekly_core
  if (metric.coreKey && priorYearCore) {
    const val = priorYearCore[metric.coreKey];
    if (typeof val === 'number' && val !== 0) {
      return { value: val, label: 'vs LY' };
    }
  }
  // 2. Fallback to period_config
  if (metric.targetConfigKey && periodConfig) {
    const val = periodConfig[metric.targetConfigKey];
    if (typeof val === 'number' && val !== 0) {
      return { value: val, label: 'vs target' };
    }
  }
  return null;
}

/** Compute variance percentage */
export function computeVariancePct(
  actual: number,
  target: number,
  lowerIsBetter?: boolean,
): { pct: number; isGood: boolean } {
  const pct = ((actual - target) / Math.abs(target)) * 100;
  const isGood = lowerIsBetter ? pct <= 0 : pct >= 0;
  return { pct, isGood };
}

// ============================================================================
// shouldShowInFeed — canonical feed-visibility decision.
//
// Single source of truth for "should this insight render?" across all
// surfaces. Frontend mirror lives at src/lib/insightVisibility.ts and MUST
// stay in sync (kept as a hand-mirror because the build env doesn't share
// modules between Deno edge functions and the Vite client).
//
// Precedence (top wins, short-circuits). Mirror exactly in TS frontend.
// ============================================================================

export type FeedContext = 'main_feed' | 'pillar_drilldown' | 'employee_profile';

// Per-pillar set of scoring metrics (mirrors src/config/pillarMetrics.ts).
// Kept inline here so the edge function doesn't need a bundler.
export const SCORING_METRICS: Record<string, Set<string>> = {
  Revenue: new Set([
    'net_sales', 'beverage_sales', 'food_sales', 'avg_check', 'tip_pct',
    'cover_count', 'r1_score', 'r2_score', 'r3_score', 'r4_score',
    'consecutive_decline_dow', 'consecutive_decline_yoy',
  ]),
  Labor: new Set([
    'labor_pct', 'overtime_pct', 'schedule_variance_pct', 'sales_per_labor_hour',
    'workforce_engagement', 'l1_score', 'l2_score', 'l3_score', 'l4_score', 'l5_score',
    'late_meal', 'missed_meal', 'meal_break_weekly_rollup', 'meal_break_employee_escalation',
    'no_clockout', 'no_clockout_weekly_rollup', 'no_clockout_employee_escalation',
    'multi_location', 'weekly_overtime',
  ]),
  Operations: new Set([
    'asana_completion_pct', 'sidework_completion', 'kds_avg_time', 'void_pct',
    'refund_pct', 'stockout_count',
    'o1_score', 'o2_score', 'o3_score', 'o4_score', 'o5_score',
  ]),
  Guest: new Set([
    'google_rating', 'yelp_rating', 'review_volume', 'secret_shop',
    'g1_score', 'g2_score', 'g3_score', 'g4_score', 'g5_score',
  ]),
  'Guest Experience': new Set([]), // alias filled below
  Marketing: new Set([
    'follower_growth', 'engagement_rate', 'campaign_performance',
  ]),
};
SCORING_METRICS['Guest Experience'] = SCORING_METRICS.Guest;

// Soft-movement / passive AI text markers used by A17/G2 generation-time filter.
export const PASSIVE_ACTION_RE = /(continue|maintain|keep|sustain|ensure|monitor|track|observe)\b/i;
export const SOFT_MOVEMENT_RE = /\b(slight|small|minor|modest|marginal)\b/i;
export const DOWNSIDE_RE = /\b(decline|drop|down|fell|decrease|loss|miss|below)\b/i;

export interface VisibilityInput {
  status?: string | null;
  insight_type?: string | null;
  source_metric?: string | null;
  pillar?: string | null;
  generated_by?: string | null;
  title?: string | null;
  summary?: string | null;
  detail?: string | null;
  insight_mode?: string | null;
}

export interface VisibilityContext {
  pillar?: string;
  showAllToggle?: boolean;
  // For generation-time use: pass the candidate text to evaluate A17/G2.
  combinedText?: string;
}

export interface VisibilityResult {
  show: boolean;
  reason: string;
}

export function shouldShowInFeed(
  ins: VisibilityInput,
  context: FeedContext,
  opts: VisibilityContext = {},
): VisibilityResult {
  // 1. Dismissed / consolidated always hidden.
  const status = String(ins.status || '').toLowerCase();
  if (status === 'dismissed' || status === 'consolidated') {
    return { show: false, reason: 'dismissed' };
  }

  // 2. Pillar Summary cards only render in pillar drill-down context.
  if (ins.insight_type === 'Pillar Summary') {
    if (context === 'pillar_drilldown') return { show: true, reason: 'pillar_summary_in_drilldown' };
    return { show: false, reason: 'pillar_summary_routing' };
  }

  const metric = String(ins.source_metric || '').toLowerCase().trim();

  // 3. Individual meal-break alerts hidden from main feed (rollup surfaces them).
  if (context === 'main_feed' && (metric === 'late_meal' || metric === 'missed_meal')) {
    return { show: false, reason: 'meal_break_individual_main_feed' };
  }

  // 4. Individual no-clockout alerts hidden from main feed (rollup surfaces them).
  if (context === 'main_feed' && metric === 'no_clockout') {
    return { show: false, reason: 'no_clockout_individual_main_feed' };
  }

  // 5. Pillar drill-down: require source_metric to belong to the pillar's
  //    scoring set, UNLESS the "Show all" toggle is on.
  if (context === 'pillar_drilldown' && !opts.showAllToggle) {
    const pillarSet = SCORING_METRICS[opts.pillar || ''] || new Set<string>();
    if (!metric || !pillarSet.has(metric)) {
      return { show: false, reason: 'pillar_metric_filter' };
    }
  }

  // 6. Generation-time soft-movement / passive filter (A17/G2 — weekly mode).
  if (
    context === 'main_feed' &&
    opts.combinedText &&
    ins.insight_mode === 'weekly'
  ) {
    const text = opts.combinedText;
    if (PASSIVE_ACTION_RE.test(text)) return { show: false, reason: 'passive_action_text' };
    if (SOFT_MOVEMENT_RE.test(text) && !DOWNSIDE_RE.test(text)) {
      return { show: false, reason: 'soft_movement_text' };
    }
  }

  return { show: true, reason: 'default_show' };
}

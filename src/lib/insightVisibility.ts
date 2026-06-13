// ============================================================================
// shouldShowInFeed — canonical feed-visibility decision (frontend).
//
// Single source of truth for "should this insight render?" across the UI.
// Edge function mirror at supabase/functions/_shared/insight-visibility.ts
// MUST stay in sync — same precedence, same reasons.
//
// Precedence (top wins, short-circuits):
//   1. Dismissed/Consolidated -> hide
//   2. Pillar Summary -> hide from main_feed, show in pillar_drilldown
//   3. Individual meal-break in main_feed -> hide (rollup surfaces it)
//   4. Individual no-clockout in main_feed -> hide (rollup surfaces it)
//   5. Pillar drill-down requires source_metric in SCORING_METRICS[pillar],
//      unless showAllToggle is on.
//   6. Default -> show
// ============================================================================

import { SCORING_METRICS } from '@/config/pillarMetrics';

export type FeedContext = 'main_feed' | 'pillar_drilldown' | 'employee_profile';

export interface VisibilityInput {
  status?: string | null;
  insight_type?: string | null;
  source_metric?: string | null;
  pillar?: string | null;
  generated_by?: string | null;
}

export interface VisibilityContext {
  pillar?: keyof typeof SCORING_METRICS | string;
  showAllToggle?: boolean;
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
  const status = String(ins.status || '').toLowerCase();
  if (status === 'dismissed' || status === 'consolidated') {
    return { show: false, reason: 'dismissed' };
  }

  if (ins.insight_type === 'Pillar Summary') {
    if (context === 'pillar_drilldown') return { show: true, reason: 'pillar_summary_in_drilldown' };
    return { show: false, reason: 'pillar_summary_routing' };
  }

  const metric = String(ins.source_metric || '').toLowerCase().trim();

  if (context === 'main_feed' && (metric === 'late_meal' || metric === 'missed_meal')) {
    return { show: false, reason: 'meal_break_individual_main_feed' };
  }
  if (context === 'main_feed' && metric === 'no_clockout') {
    return { show: false, reason: 'no_clockout_individual_main_feed' };
  }

  if (context === 'pillar_drilldown' && !opts.showAllToggle) {
    const pillarKey = (opts.pillar || '') as keyof typeof SCORING_METRICS;
    const pillarSet = (SCORING_METRICS as any)[pillarKey] as Set<string> | undefined;
    if (!pillarSet || !metric || !pillarSet.has(metric)) {
      return { show: false, reason: 'pillar_metric_filter' };
    }
  }

  return { show: true, reason: 'default_show' };
}

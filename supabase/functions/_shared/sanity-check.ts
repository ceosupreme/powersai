// Sanity-check guardrail for deterministic detector alerts.
//
// Bar operations are fundamentally stable week-over-week. Dramatic swings
// in stable metrics are almost always data integrity issues (sync gaps,
// partial captures, holiday closures), NOT real business events. This helper
// suppresses alerts where the current value deviates from the trailing
// baseline by more than the per-metric threshold and logs the suppression to
// `suppressed_insights` for admin review.
//
// Volatile metrics (sidework, asana_tasks, ot_pct, void/refund, schedule_var,
// 3-week consecutive declines) are EXEMPT — they fire as written.

export type SanityMetricKey =
  // weekly metrics (trailing weekly_scorecard / weekly_core)
  | 'net_sales'
  | 'orders_count'
  | 'avg_check'
  | 'labor_pct'
  | 'splh'
  | 'engagement'
  | 'guests'
  | 'tip_pct'
  | 'online_reputation'
  | 'turn_time'
  // daily metrics (trailing 28 days of daily_metrics)
  | 'labor_pct_daily';

type ThresholdSpec =
  | { kind: 'pct'; value: number; scope: 'weekly' | 'daily'; column: string; table: 'weekly_scorecard' | 'weekly_core' | 'daily_metrics' }
  | { kind: 'abs'; value: number; scope: 'weekly' | 'daily'; column: string; table: 'weekly_scorecard' | 'weekly_core' | 'daily_metrics' };

// Per-metric thresholds calibrated from trailing 8-week variance audit (5/2026).
// CV (sd/mean) p75 across 8 venues was used as the floor; padded to ~2.5σ.
const THRESHOLDS: Record<SanityMetricKey, ThresholdSpec> = {
  // Weekly — pulled from weekly_scorecard *_actual or weekly_core
  net_sales:          { kind: 'pct', value: 0.25, scope: 'weekly', column: 'net_sales',          table: 'weekly_core' },
  orders_count:       { kind: 'pct', value: 0.25, scope: 'weekly', column: 'r2_actual',          table: 'weekly_scorecard' },
  avg_check:          { kind: 'pct', value: 0.25, scope: 'weekly', column: 'r3_actual',          table: 'weekly_scorecard' },
  labor_pct:          { kind: 'abs', value: 8,    scope: 'weekly', column: 'l1_actual',          table: 'weekly_scorecard' },
  splh:               { kind: 'pct', value: 0.20, scope: 'weekly', column: 'l2_actual',          table: 'weekly_scorecard' },
  engagement:         { kind: 'abs', value: 15,   scope: 'weekly', column: 'l5_actual',          table: 'weekly_scorecard' },
  guests:             { kind: 'pct', value: 0.25, scope: 'weekly', column: 'g1_actual',          table: 'weekly_scorecard' },
  tip_pct:            { kind: 'abs', value: 5,    scope: 'weekly', column: 'g2_actual',          table: 'weekly_scorecard' },
  online_reputation:  { kind: 'abs', value: 0.3,  scope: 'weekly', column: 'g4_actual',          table: 'weekly_scorecard' },
  turn_time:          { kind: 'pct', value: 0.30, scope: 'weekly', column: 'o2_actual',          table: 'weekly_scorecard' },
  // Daily — labor_spike trigger compares one day's labor_pct to trailing 28d
  labor_pct_daily:    { kind: 'abs', value: 12,   scope: 'daily',  column: 'labor_pct',          table: 'daily_metrics' },
};

const TRAILING_WEEKS = 4;
const TRAILING_DAYS = 28;
const MIN_BASELINE_N = 3; // need ≥3 prior observations to suppress

export interface SanityCheckOpts {
  supabase: any;
  bar_id: string;          // text bar code (legacy)
  venue_id: string | null; // uuid
  metric_key: SanityMetricKey;
  current_value: number | null | undefined;
  for_date: string;        // ISO YYYY-MM-DD anchor
  insight_payload?: Record<string, unknown>; // logged on suppression
}

export interface SanityCheckResult {
  ok: boolean;          // true = fire alert; false = suppressed
  reason?: string;
  trailing_mean?: number;
  trailing_sd?: number;
  trailing_n?: number;
  threshold_used?: string;
}

export async function passesSanityCheck(opts: SanityCheckOpts): Promise<SanityCheckResult> {
  const { supabase, bar_id, venue_id, metric_key, current_value, for_date, insight_payload } = opts;

  if (current_value == null || !isFinite(Number(current_value))) {
    return { ok: true, reason: 'no_current_value' };
  }

  const spec = THRESHOLDS[metric_key];
  if (!spec) return { ok: true, reason: 'no_threshold_defined' };

  // Load trailing baseline.
  let baseline: number[] = [];
  try {
    if (spec.scope === 'weekly') {
      // Walk back via weeks → table.
      const { data: weeks } = await supabase
        .from('weeks')
        .select('id, week_start')
        .eq('bar_id', bar_id)
        .lt('week_start', for_date)
        .order('week_start', { ascending: false })
        .limit(TRAILING_WEEKS);
      const ids = (weeks ?? []).map((w: any) => w.id);
      if (ids.length === 0) return { ok: true, reason: 'no_baseline_weeks' };

      const { data: rows } = await supabase
        .from(spec.table)
        .select(`week_id, ${spec.column}`)
        .in('week_id', ids);
      baseline = (rows ?? [])
        .map((r: any) => r[spec.column])
        .filter((v: any) => v != null && isFinite(Number(v)))
        .map((v: any) => Number(v));
    } else {
      // Daily: trailing 28 days of daily_metrics
      const start = new Date(for_date + 'T12:00:00Z');
      start.setUTCDate(start.getUTCDate() - TRAILING_DAYS);
      const startStr = start.toISOString().slice(0, 10);
      const { data: rows } = await supabase
        .from(spec.table)
        .select(`date, ${spec.column}`)
        .eq('bar_id', bar_id)
        .gte('date', startStr)
        .lt('date', for_date);
      baseline = (rows ?? [])
        .map((r: any) => r[spec.column])
        .filter((v: any) => v != null && isFinite(Number(v)) && Number(v) > 0)
        .map((v: any) => Number(v));
    }
  } catch (e) {
    console.warn('[SANITY-CHECK] baseline load failed:', (e as any)?.message || e);
    return { ok: true, reason: 'baseline_load_error' };
  }

  if (baseline.length < MIN_BASELINE_N) {
    return { ok: true, reason: 'insufficient_baseline', trailing_n: baseline.length };
  }

  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const variance = baseline.reduce((a, b) => a + (b - mean) ** 2, 0) / baseline.length;
  const sd = Math.sqrt(variance);

  const cv = Number(current_value);
  const delta = Math.abs(cv - mean);
  const thresholdAbs = spec.kind === 'pct' ? Math.abs(mean) * spec.value : spec.value;
  const thresholdLabel = spec.kind === 'pct' ? `±${(spec.value * 100).toFixed(0)}%` : `±${spec.value} abs`;

  if (delta <= thresholdAbs) {
    return { ok: true, trailing_mean: mean, trailing_sd: sd, trailing_n: baseline.length, threshold_used: thresholdLabel };
  }

  // Suppress + log.
  console.log(`[SANITY-CHECK] suppressed ${metric_key} for ${bar_id} on ${for_date}: current=${cv} mean=${mean.toFixed(2)} delta=${delta.toFixed(2)} threshold=${thresholdAbs.toFixed(2)} (${thresholdLabel})`);
  try {
    await supabase.from('suppressed_insights').insert({
      bar_id,
      venue_id,
      source_metric: metric_key,
      current_value: cv,
      trailing_mean: mean,
      trailing_sd: sd,
      trailing_n: baseline.length,
      threshold_used: thresholdLabel,
      suspected_reason: 'data_integrity_suspected',
      would_have_fired_for_date: for_date,
      original_payload: insight_payload ?? null,
    });
  } catch (e) {
    console.warn('[SANITY-CHECK] log write failed:', (e as any)?.message || e);
  }
  return {
    ok: false,
    reason: 'exceeds_threshold',
    trailing_mean: mean,
    trailing_sd: sd,
    trailing_n: baseline.length,
    threshold_used: thresholdLabel,
  };
}

// Map (source_metric, _metric_label) → SanityMetricKey, or null if exempt.
// Exemption list (no sanity check):
//   - sidework_completion (O5) — daily volatility per Chad
//   - asana_tasks (O1) — lumpy publishing cadence
//   - ot_pct (L4) — small denominator
//   - schedule_variance (L3) — sign-flipping
//   - void_rate (O3), refund_pct (G3), unpaid_$ (O4), discount_pct (R4) — event-driven
//   - three_week_sales_decline, daily_yoy_drop — consecutive-streak detectors (client-requested no floors)
//   - engagement_threshold (no-shows/lates/dropped/avg-shift-score) — small counts, fire as written
//   - inventory_dollar_loss, log_frequency — out of scope
export function resolveSanityMetric(
  source_metric: string | null | undefined,
  metric_label: string | null | undefined,
): SanityMetricKey | null {
  const sm = (source_metric || '').toLowerCase();
  if (sm === 'three_week_sales_decline' || sm === 'daily_yoy_drop') return null;
  if (sm === 'engagement_threshold') return null;
  if (sm === 'inventory_dollar_loss' || sm === 'log_frequency') return null;
  if (sm === 'labor_spike') return 'labor_pct_daily';

  if (sm === 'red_score_alert') {
    const ml = (metric_label || '').toLowerCase();
    if (ml.includes('net sales')) return 'net_sales';
    if (ml.includes('transactions')) return 'orders_count';
    if (ml.includes('avg check')) return 'avg_check';
    if (ml.includes('labor %')) return 'labor_pct';
    if (ml.includes('splh')) return 'splh';
    if (ml.includes('workforce engagement')) return 'engagement';
    if (ml.includes('weekly guests') || ml === 'guests') return 'guests';
    if (ml.includes('tip %')) return 'tip_pct';
    if (ml.includes('online reputation')) return 'online_reputation';
    if (ml.includes('turn time')) return 'turn_time';
    // exempt: discount %, schedule variance, ot rate, refund %, asana tasks, void rate, unpaid $, sidework
    return null;
  }
  return null;
}

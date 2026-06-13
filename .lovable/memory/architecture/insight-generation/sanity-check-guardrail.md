---
name: Deterministic detector sanity-check guardrail
description: Per-metric variance guardrail in generate-daily-insights that suppresses dramatic week-over-week swings on stable metrics; volatile metrics + consecutive-streak detectors are exempt
type: feature
---

## Behavior

Before any deterministic detector in `supabase/functions/generate-daily-insights/index.ts` inserts a `red_score_alert` or `labor_spike` insight, it calls `passesSanityCheck` from `supabase/functions/_shared/sanity-check.ts`. The check loads a trailing baseline (4 weekly observations or 28 daily observations) and compares the current value to a per-metric threshold. If the absolute deviation exceeds the threshold AND there are ≥3 prior observations, the insight is **suppressed** and a row is written to `public.suppressed_insights` with the trailing mean/sd, the threshold used, and the original payload. A `[SANITY-CHECK] suppressed ...` log line is also emitted.

Premise: bar operations are stable week-over-week. Dramatic swings on stable metrics are almost always data integrity issues (sync gaps, partial captures, holiday closures), not real business events. The guardrail prevents obviously-wrong insights from reaching Chad regardless of underlying cause.

## Threshold table (calibrated from trailing 8-week variance audit, 5/2026)

| Metric key | Threshold | Notes |
|---|---|---|
| `net_sales` | ±25% of trailing 4-wk mean | p75 CV ~0.13 |
| `orders_count` | ±25% | mirrors net_sales |
| `avg_check` | ±25% | |
| `guests` | ±25% | |
| `labor_pct` | ±8 pts absolute | CV 0.04–0.18 |
| `splh` | ±20% | CV 0.06 |
| `engagement` | ±15 pts absolute | L5 composite |
| `tip_pct` | ±5 pts absolute | CV 0.05 |
| `online_reputation` | ±0.3 stars absolute | rolling avg by design |
| `turn_time` | ±30% | CV 0.10–0.26 |
| `labor_pct_daily` | ±12 pts vs trailing 28d | for `labor_spike` trigger |

## Exemption list (no sanity check, fire as written)

- `sidework_completion_pct` (O5) — daily volatility per Chad's product judgment, weekly CV is misleading
- `asana_tasks_pct` (O1) — lumpy publishing cadence (CV 0.67)
- `ot_pct` (L4) — small denominator, real spikes matter
- `schedule_variance` (L3) — sign-flipping; CV meaningless
- `void_rate` (O3), `refund_pct` (G3), `unpaid_amount` (O4), `discount_pct` (R4) — event-driven, low base rates
- `three_week_sales_decline`, `daily_yoy_drop` — consecutive-streak detectors, no-floor per [features/insights/consecutive-decline-detectors](mem://features/insights/consecutive-decline-detectors)
- `engagement_threshold` (no-shows/lates/dropped/avg-shift-score) — small integer counts
- `inventory_dollar_loss`, `log_frequency` — out of scope

## Wiring contract

Detector inserts that should be sanity-checked must attach two private fields to the insert object before the final loop strips them:
- `_current_value: number` — the actual metric value being alerted on
- `_sanity_for_date: string` — ISO date anchor for the trailing baseline lookup (week_start for weekly, day's date for daily)

The mapping from `(source_metric, _metric_label)` to a `SanityMetricKey` lives in `resolveSanityMetric()` and returns `null` for any exempt metric. New detectors that should participate need both an entry in `THRESHOLDS` and a branch in `resolveSanityMetric`.

## Suppressed log table

`public.suppressed_insights` columns: `bar_id, venue_id, source_metric, current_value, trailing_mean, trailing_sd, trailing_n, threshold_used, suspected_reason ('data_integrity_suspected'), would_have_fired_for_date, original_payload, created_at`. Admin-only RLS read; service role inserts. No UI yet — query directly to investigate.

## Holiday awareness

Deferred. Closure days that produce dramatic deviations get suppressed as `data_integrity_suspected`, which is the desired behavior. A future `venue_closure_dates` table would let the detector exclude closure dates from the trailing baseline calculation, but the current behavior is safe.

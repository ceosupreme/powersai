---
name: Weekly schedule variance detector
description: Schedule variance fires once per closed ISO week from weekly_core.schedule_variance_pct vs period_config.schedule_variance_target. Replaces the daily l3_score red-alert path.
type: feature
---

## Why

The legacy l3_score path in `generate-daily-insights` Trigger 6 fired a red-score alert every day a closed week's L3 dipped below 60, producing repeat noise across the week. Variance is a weekly metric — it should fire once per week.

## Where

- **Removed**: `l3_score` entry in `signalDefs` of generate-daily-insights/index.ts Trigger 6.
- **Added**: `detectWeeklyScheduleVariance` in `_shared/labor-compliance-alerts.ts`, called from `runWeeklyLaborAlerts` (fires from generate-monday-briefing + compliance-sweep).

## Logic

Reads `weekly_core.schedule_variance_pct` for the venue + ISO week. Reads `period_config.schedule_variance_target` (default 0.10).

| Condition | Severity |
|---|---|
| `abs(variance) <= target` | no fire |
| `target < abs(variance) <= 2*target` | Medium |
| `abs(variance) > 2*target` | High |

Title encodes signed pct + over/under direction. Idempotent via `dedupe_hash = schedule_variance_weekly:<venueId>:<isoWeekStart>`.

## Migration on rollout

In-flight `red_score_alert` rows whose title/detail mention "Schedule Variance" were dismissed with `dismiss_reason = 'replaced_by_weekly_aggregation'` so the new weekly cards don't duplicate them.

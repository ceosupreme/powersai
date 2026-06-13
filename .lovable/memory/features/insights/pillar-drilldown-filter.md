---
name: Pillar drill-down insight filter
description: Weekly Review pillar drill-downs (PillarRows.tsx → ExpandablePillarCard) only show insights whose source_metric is in SCORING_METRICS[pillar] for that pillar. Applies uniformly to ALL generators (daily_insights_v2, weekly_insights, deterministic_trigger). "Show all" toggle bypasses.
type: feature
---

## Rule

`filterCardsForPillar` in `src/components/weekly-review/PillarRows.tsx` requires:

```
metric.length > 0 && SCORING_METRICS[pillar].has(metric)
```

for **every** card regardless of `generated_by`. Cards with NULL/empty `source_metric` or with a metric outside the pillar's scoring set are dropped from the drill-down.

## Why

Previous version unconditionally allowed `weekly_insights` and `deterministic_trigger`. This let anecdotal weekly narrative cards with `source_metric=NULL` (e.g., "Critical POS Hardware Failures", "Mother's Day Understaffing", "Waffle Bar Electrical Issue") leak into the Operations drill-down even though they did NOT drive O1–O5 scores. Client (Chad) flagged "ice machine broken" type leaks repeatedly.

## Where the leaked cards still surface

The main `/insights` feed (`fetchInsightCardsFromSupabase`) is unchanged — narrative `weekly_insights` still appear there. The drill-down is only filtered because its purpose is "what drove THIS pillar's score this week."

## Maintaining SCORING_METRICS

`src/config/pillarMetrics.ts → SCORING_METRICS` is the source of truth. When a new deterministic detector or rolling-rollup is added (e.g., `meal_break_weekly_rollup`, `no_clockout_weekly_rollup`, `weekly_overtime`), add its `source_metric` to the appropriate pillar set or it will be filtered out of drill-downs.

Currently included Labor compliance metrics: `late_meal`, `missed_meal`, `meal_break_weekly_rollup`, `meal_break_employee_escalation`, `no_clockout`, `no_clockout_weekly_rollup`, `no_clockout_employee_escalation`, `multi_location`, `weekly_overtime`.

Operations: added `stockout_count`.

## Override

`PillarRows.tsx` has a "Show all pillar insights" Switch — when on, returns all cards in the pillar without metric filtering. Default off.

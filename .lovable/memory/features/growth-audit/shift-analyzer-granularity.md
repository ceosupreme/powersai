---
name: Shift analyzer granularity (DOW-only, daypart deferred)
description: Soft Shift / Strong Shift analyzers operate at day-of-week granularity because daily_metrics has no daypart column; revisit when Toast hourly data is integrated
type: feature
---
The Growth Audit's Soft Shift Opportunity and Strong Shift Amplification analyzers (Prompt 14) compute baselines at **day-of-week** granularity only — `daily_metrics` is day-grain, no daypart/hourly column.

Findings therefore read like "Tuesdays are soft" rather than "Tuesday 4–7pm is soft", which limits Action Pack copy specificity.

**When to revisit:** once Toast hourly/check-level data is ingested into a daypart-aware table, upgrade `_shared/analyzers/shiftBaselines.ts` to bucket by `(dow, daypart)` and extend the `signal_key` from `soft_shift:dow=<n>` to `soft_shift:dow=<n>:dp=<slot>`. Existing DOW-only findings will resolve naturally via `bulkReconcile` when the new keys take over.

---
name: Monday trailing-7-day Toast refresh
description: Toast restates daily metrics for several days after EOD; Monday cron force-resyncs the prior week before compute-weekly-scores so weekly_core matches Toast UI within $1.
type: feature
---
**Why:** Toast restates daily values (late voids, comps, discounts, labor adjustments, tip postings) for several days after EOD. Our nightly per-day sync captures one snapshot and never refreshes, so weekly_core can drift from Toast's UI weekly view by ~0.2-0.5% (e.g., The Hills $89,607 vs Toast $89,374, +$232.83).

**Pattern:** Monday cron chain refreshes the *previous* week's daily_metrics with `force_resync: true` before scoring locks the week:

| Time (UTC) | Job | Purpose |
|---|---|---|
| 17:35 Mon | `refresh-toast-metrics-weekly` | force_resync prior Mon-Sun window |
| 18:15 Mon | `compute-weekly-scores` | reads refreshed daily_metrics |
| 18:45 Mon | `generate-monday-briefing-weekly` | reads scorecards |

Daily AI insights are operational-narrative only and don't depend on metric precision — mid-week refresh is unnecessary.

**Throttling (mandatory to avoid Toast 429s on 7-day × 8-venue fanout):**
- Dispatcher stagger: **30s** between venue worker dispatches when `dateSpan > 1` (vs 1s for single-day). See `sync-toast-metrics/index.ts` `dispatchStaggerMs`.
- `submitJob` 429 retry budget: **6 attempts** with exponential backoff capped at 64s (1, 2, 4, 8, 16, 32s waits). See `_shared/toast-analytics.ts` `submitJob`.
- Without these, 8 venues × 7 days × 4 reports = 224+ concurrent Toast jobs → pervasive 429s, leaving 3+ venues short on 5/09-5/10 and tripping the 85% coverage gate.

**Surgical recovery:** If specific (venue, date) cells fail after the cron, call `sync-toast-metrics` sequentially with `venue_id` + narrowed `start_date`/`end_date` + `force_resync: true` — one venue at a time. The freshness-aware skip (`toast-sync-freshness-skip`) auto-overwrites stale `toast_analytics_api` rows.

**Verification target:** Post-refresh weekly_core.net_sales should match Toast's weekly UI within ±$1 for every venue.

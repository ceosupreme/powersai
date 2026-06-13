---
name: toast-turn-time-source
description: avg_turn_time_mins is computed from Toast Orders API per-check (paidDate − openedDate) for all 8 venues
type: constraint
---

**Rule:** Daily `daily_metrics.avg_turn_time_mins` is computed from `/orders/v2/ordersBulk`. For each `order.checks[]`, take `(check.paidDate − order.openedDate) / 60000`, apply `0 < mins < 240` sanity guard, average across all checks for the business date. Applies to **all 8 venues** including beverage-only (Aero, Sycamore, Club Marina, Hearth) — `noKdsVenues` only gates G5 KDS, never turn time.

Weekly `weekly_core.turn_time_avg_min` rolls up daily values via `simpleAvg` in `compute-weekly-scores` with the existing 85% coverage gate (unchanged).

**Implementation:** `fetchOrdersTurnTime()` in `supabase/functions/sync-toast-metrics/index.ts`. Uses standard Toast OAuth (`TOAST_MACHINE_CLIENT`) — distinct from the Analytics OAuth used for `/era/v1/*` reports. Per-venue credentials win (`venues.toast_client_id`/`toast_client_secret`); env fallback (`TOAST_CLIENT_ID`/`TOAST_CLIENT_SECRET`) for venues that share the management-group app. Token cache keyed by clientId, reused across the date range. Sycamore uses its own Toast account creds.

**Never use `/era/v1/check/day` for turn time.** Two reasons:
1. `orderOpenedDate` is a date-only string (e.g. `"20260425"`) — no time component → garbage when subtracted from `checkPaidDateTime`.
2. `diningOption` returns `"No Dining Option"` for 100% of rows at all 8 venues → dine-in filter excludes everything.

`aggregateCheckDay()` in `sync-toast-metrics` returns `avg_turn_time_mins: null` from the check/day path; the Orders-API result is passed separately into `buildMetricsForDate()`.

**Weekly Toast ZIP** (`Service mode summary.csv` → "Turn time (minutes)") is being eliminated as a source. Do not reintroduce as a fallback.

**Symptom of regression:** If turn time is NULL on `toast_analytics_api` daily rows where Toast Orders API has paid checks, the Orders-API path failed (auth, rate limit, no creds). Check `[ORDERS-TURN]` logs in `sync-toast-metrics`.

---
name: toast-authoritative-logic
description: Toast Analytics API is the authoritative source for sales/labor/menu split + tips/unpaid/turn time; manual ZIP uploads are fallback only
type: feature
---

The Toast POS integration writes `daily_metrics` from the **Toast Analytics API** (`/era/v1/...`) via `sync-toast-metrics`. Four reports are submitted per venue per run and polled to completion:

| Report | Endpoint | Fields written |
|---|---|---|
| Aggregated sales | `POST /era/v1/metrics/day` | `net_sales (netSalesAmount)`, `gross_sales (grossSalesAmount)`, `discounts (discountAmount)`, `voids (voidOrdersCount)`, `void_pct (voidOrdersAmount / netSalesAmount)`, `refunds (refundAmount)`, `orders_count (ordersCount)`, `guests (guestCount)`, `avg_check (avgOrderValue)` |
| Labor (authoritative for labor) | `POST /era/v1/labor/day` | `labor_cost (totalCost)`, `labor_hours (totalHours)`, `overtime_hours (overtimeHours)`, `labor_pct (totalCostPerNetSales × 100)`, `splh (netSalesPerEmployeeHour)` |
| Food/Bev split | `POST /era/v1/menu/day` groupBy `MENU_GROUP` | `food_sales`, `bev_sales` (classified by `menuGroupName` via `isBeverageGroup()` shared helper) |
| Per-check derived | `POST /era/v1/check/day` | `tips` & `tips_amount` (sum of `checkTipAmount + checkGratuityAmount`), `tip_pct` (tips / net_sales × 100), `unpaid_amount` (sum of `checkTotalAmount` where `checkStatus='OPEN'`), `unpaid_checks_count`, `avg_turn_time_mins` (avg `checkPaidDateTime − orderOpenDate` in minutes, dine-in only, capped 0 < mins < 240 to drop outliers) |

**Critical implementation rules:**
- Auth is OAuth2 client credentials against `https://ws-api.toasttab.com/authentication/v1/authentication/login` using `TOAST_ANALYTICS_CLIENT_ID` / `TOAST_ANALYTICS_CLIENT_SECRET`. Token cached per edge-function instance until 60s before expiry.
- Analytics endpoints are **management-group level** — never send `Toast-Restaurant-ID` header (returns HTTP 401 code 10010). Restaurant filter goes in the body via `restaurantIds: [guid]`.
- Date format in request body is integer `YYYYMMDD` (no dashes); responses return `businessDate` as `"YYYYMMDD"` string — converted with `compactToIso()`.
- Submit returns either `{ reportRequestGuid: "..." }` or a bare GUID string — both handled.
- Polling: GET `/era/v1/{type}/{guid}` — 200 = ready, 202 = still processing (retry), 409 = resubmit needed. Max 20 attempts × 2s.
- All rows tagged `source = 'toast_analytics_api'`.
- **Manual data guard**: rows with `source IN ('manual_upload','manual_entry','manual_upload_toast_zip')` are never overwritten by the API sync.
- **Turn time dine-in filter**: `diningOption` matched via `/dine[\s-]?in/i` regex; rows with empty/missing `diningOption` are also counted (some configs omit it). Outlier cap excludes turns ≤0 or ≥240 min.
- **Tips combine tip + gratuity**: matches existing manual-upload semantics where the `tips` column is the all-in tip + auto-grat total.

**Fields NOT covered by Analytics API (existing sources retained):**
- **KDS / ticket time (G5)** — already automated via standard Toast API in `compute-weekly-scores`; no manual upload needed.
- **Workforce engagement (L5)** — sourced from 7shifts Engage CSV upload (or 7shifts API), not Toast.
- **Sculpture inventory** — diagnostic only, not scored; manual CSV upload.

**Verification (per-venue spot check):** `netSalesAmount` ↔ Net sales summary "Net sales"; `discountAmount` ↔ "Sales discounts"; `totalCost` ↔ Labor cost summary "Labor cost"; `totalHours` ↔ "Total hours"; sum of `checkTipAmount + checkGratuityAmount` ↔ Sales summary "Tips"; sum of OPEN `checkTotalAmount` ↔ Sales summary "Unpaid"; avg dine-in turn ↔ Service Mode summary "Avg turn time" (expect ~5–10% drift from server-side filtering).

Helper module: `supabase/functions/_shared/toast-analytics.ts` (auth + `submitJob` + `pollJob` + `runReport` + `runCheckDayReport` + `isBeverageGroup` + `compactToIso`). Reference spec: `supabase/functions/_shared/toast-reporting-api.yaml`.

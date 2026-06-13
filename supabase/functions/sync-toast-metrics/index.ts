// sync-toast-metrics — writes daily_metrics from the Toast Analytics API.
//
// Authoritative sources:
//   - Aggregated sales : POST /era/v1/metrics/day → poll
//   - Labor            : POST /era/v1/labor/day   → poll  (wins for labor fields)
//   - Food/Bev split   : POST /era/v1/menu/day groupBy=MENU_GROUP → poll
//   - Tips / unpaid    : POST /era/v1/check/day   → poll
//   - Turn time        : GET  /orders/v2/ordersBulk (per-check paidDate − openedDate,
//                        averaged with 0 < mins < 240 guard, ALL 8 venues including
//                        beverage-only). Per-venue Toast Orders OAuth credentials.
//
// All rows written here are tagged source = 'toast_analytics_api'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  getAnalyticsToken,
  runReport,
  runCheckDayReport,
  isBeverageGroup,
  compactToIso,
  type CheckDayRow,
} from '../_shared/toast-analytics.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Background-task safety net ───────────────────────────────
// Dispatcher mode uses EdgeRuntime.waitUntil() so the isolate survives past
// the inbound HTTP disconnect (Supabase gateway closes at ~150s, but our
// wall_clock_limit_ms is 300s). Without these listeners, an async rejection
// inside a background task tears down the isolate without finishing the
// remaining venues. `beforeunload` flushes dispatcher state if shutdown
// happens mid-fanout. `dispatchRunIdForShutdown` is set by the dispatcher.
let dispatchRunIdForShutdown: string | null = null;
addEventListener('unhandledrejection', (ev) => {
  // deno-lint-ignore no-explicit-any
  const reason = (ev as any)?.reason;
  console.error('[BG-UNHANDLED] sync-toast-metrics background task rejection:', reason instanceof Error ? reason.message : String(reason));
  // deno-lint-ignore no-explicit-any
  (ev as any).preventDefault?.();
});
addEventListener('beforeunload', (ev) => {
  // deno-lint-ignore no-explicit-any
  const reason = (ev as any)?.detail?.reason;
  console.log(`[BG-SHUTDOWN] isolate shutting down (reason=${reason ?? 'unknown'}), dispatchRunIdForShutdown=${dispatchRunIdForShutdown ?? 'none'}`);
  if (dispatchRunIdForShutdown) {
    // Fire-and-forget: can't await in beforeunload but the request often
    // survives long enough to land.
    try {
      const url = Deno.env.get('SUPABASE_URL');
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (url && key) {
        fetch(`${url}/rest/v1/sync_runs?id=eq.${dispatchRunIdForShutdown}&status=eq.running`, {
          method: 'PATCH',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `dispatcher shutdown mid-fanout (reason=${reason ?? 'unknown'})`,
          }),
        }).catch(() => {/* best-effort */});
      }
    } catch { /* no-throw in beforeunload */ }
  }
});

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Endpoint response shapes (from the spec) ─────────────────

interface MetricsDayRow {
  restaurantGuid: string;
  businessDate: string | number;
  netSalesAmount?: number;
  grossSalesAmount?: number;
  discountAmount?: number;
  voidOrdersAmount?: number;
  voidOrdersCount?: number;
  refundAmount?: number;
  ordersCount?: number;
  guestCount?: number;
  avgOrderValue?: number;
  // Labor fields here are typed as strings in the spec — we treat the
  // dedicated labor/day endpoint as authoritative, so we ignore these.
  [k: string]: unknown;
}

interface LaborDayRow {
  restaurantGuid: string;
  businessDate: string | number;
  regularHours?: number;
  overtimeHours?: number;
  totalHours?: number;
  regularCost?: number;
  overtimeCost?: number;
  totalCost?: number;
  totalCostPerNetSales?: number; // decimal e.g. 0.1537
  netSalesPerEmployeeHour?: number;
  [k: string]: unknown;
}

interface MenuDayRow {
  restaurantGuid: string;
  businessDate: string | number;
  menuGroupName?: string;
  netSalesAmount?: number;
  [k: string]: unknown;
}

// ── Polling wrappers ─────────────────────────────────────────

async function fetchMetricsDay(
  token: string,
  restaurantGuid: string,
  startDate: string,
  endDate: string,
  tenantKey?: string,
): Promise<MetricsDayRow[]> {
  const data = await runReport<unknown>(token, {
    path: 'metrics/day',
    restaurantIds: [restaurantGuid],
    startBusinessDate: startDate,
    endBusinessDate: endDate,
    tenantKey,
  });
  return Array.isArray(data) ? data as MetricsDayRow[] : [];
}

async function fetchLaborDay(
  token: string,
  restaurantGuid: string,
  startDate: string,
  endDate: string,
  tenantKey?: string,
): Promise<LaborDayRow[]> {
  const data = await runReport<unknown>(token, {
    path: 'labor/day',
    restaurantIds: [restaurantGuid],
    startBusinessDate: startDate,
    endBusinessDate: endDate,
    tenantKey,
  });
  return Array.isArray(data) ? data as LaborDayRow[] : [];
}

async function fetchMenuDay(
  token: string,
  restaurantGuid: string,
  startDate: string,
  endDate: string,
  tenantKey?: string,
): Promise<MenuDayRow[]> {
  const data = await runReport<unknown>(token, {
    path: 'menu/day',
    restaurantIds: [restaurantGuid],
    startBusinessDate: startDate,
    endBusinessDate: endDate,
    groupBy: ['MENU_GROUP'],
    tenantKey,
  });
  return Array.isArray(data) ? data as MenuDayRow[] : [];
}

async function fetchCheckDay(
  token: string,
  restaurantGuid: string,
  startDate: string,
  endDate: string,
  debugCheckDay = false,
  tenantKey?: string,
): Promise<CheckDayRow[]> {
  return await runCheckDayReport(token, {
    restaurantIds: [restaurantGuid],
    startBusinessDate: startDate,
    endBusinessDate: endDate,
    debugCheckDay,
    tenantKey,
  });
}

// ── Toast Orders API: per-day turn time (paidDate − openedDate) ──
//
// Uses the standard Toast OAuth flow (TOAST_MACHINE_CLIENT) — distinct from
// the Analytics OAuth used for /era/v1/* reports. Per-venue credentials
// (`venues.toast_client_id` / `toast_client_secret`) win, env fallback for
// venues that share the management-group app.
//
// Token cache keyed by clientId so the 8-day backfill loop reuses one token
// per venue across all dates.

interface OrdersTokenCache { token: string; expiresAt: number; }
const ordersTokenCache = new Map<string, OrdersTokenCache>();

async function getOrdersToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  const cached = ordersTokenCache.get(clientId);
  if (cached && now < cached.expiresAt - 60_000) return cached.token;

  const res = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }),
  });
  if (!res.ok) throw new Error(`Toast Orders auth failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'SUCCESS' || !data.token?.accessToken) {
    throw new Error('Toast Orders auth: no token in response');
  }
  const token = data.token.accessToken as string;
  const expiresIn = Number(data.token.expiresIn ?? 3600);
  ordersTokenCache.set(clientId, { token, expiresAt: now + expiresIn * 1000 });
  return token;
}

/** Average per-check turn time (minutes) for a single business date.
 *  Returns null when no usable samples (or on error in caller). */
async function fetchOrdersTurnTime(
  clientId: string,
  clientSecret: string,
  restaurantGuid: string,
  businessDate: string, // YYYY-MM-DD
): Promise<{ avg_turn_time_mins: number | null; sample_count: number }> {
  const token = await getOrdersToken(clientId, clientSecret);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': restaurantGuid,
    'Content-Type': 'application/json',
  };

  const baseUrl = `https://ws-api.toasttab.com/orders/v2/ordersBulk` +
    `?startDate=${businessDate}T00:00:00.000Z` +
    `&endDate=${businessDate}T23:59:59.999Z` +
    `&pageSize=100`;

  let sumMs = 0;
  let count = 0;
  const maxPages = 25;

  for (let page = 1; page <= maxPages; page++) {
    let res = await fetch(`${baseUrl}&page=${page}`, { headers });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 500));
      res = await fetch(`${baseUrl}&page=${page}`, { headers });
    }
    if (!res.ok) {
      // Soft-fail: stop paging, return what we have.
      console.warn(`[ORDERS-TURN] page ${page} ${res.status} for ${restaurantGuid}/${businessDate}`);
      break;
    }
    const orders = await res.json();
    if (!Array.isArray(orders) || orders.length === 0) break;

    for (const order of orders) {
      if (!order?.openedDate || !Array.isArray(order.checks)) continue;
      const opened = new Date(order.openedDate).getTime();
      if (!Number.isFinite(opened)) continue;
      for (const check of order.checks) {
        if (!check?.paidDate) continue;
        const paid = new Date(check.paidDate).getTime();
        if (!Number.isFinite(paid)) continue;
        const mins = (paid - opened) / 60000;
        if (mins > 0 && mins < 240) {
          sumMs += paid - opened;
          count++;
        }
      }
    }

    if (orders.length < 100) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (count === 0) return { avg_turn_time_mins: null, sample_count: 0 };
  const avgMins = sumMs / count / 60000;
  return { avg_turn_time_mins: r2(avgMins), sample_count: count };
}

// ── Per-day metric assembly ──────────────────────────────────

interface CheckDayAggregate {
  tips: number;
  gratuity: number;
  unpaid_amount: number;
  unpaid_checks_count: number;
  transactions: number;
  avg_turn_time_mins: number | null;
}

const OPEN_STATUSES = new Set(['OPEN', 'OPENED', 'UNPAID']);
const PAID_STATUSES = new Set(['CLOSED', 'PAID']);

/** Aggregate per-check rows into per-day tips/gratuity/unpaid/transactions.
 *  Defensively reads tips from BOTH top-level and nested payments[]/serviceCharges[].
 *  NOTE: avg_turn_time_mins is intentionally always null here — Toast `/check/day`
 *  does not expose minute-precision check-open time (`orderOpenedDate` is date-only).
 *  Authoritative turn time comes from the weekly Toast ZIP `Service mode summary.csv`. */
function aggregateCheckDay(rows: CheckDayRow[]): CheckDayAggregate {
  let tips = 0;
  let gratuity = 0;
  let unpaid = 0;
  let unpaidCount = 0;
  let paidCount = 0;

  for (const r of rows) {
    // ── Tips: top-level OR sum of payments[].tipAmount ─────────────
    let checkTip = num(r.checkTipAmount);
    if (checkTip === 0 && Array.isArray(r.payments)) {
      for (const p of r.payments) checkTip += num(p.tipAmount);
    }
    tips += checkTip;

    // ── Gratuity: top-level OR payments[].gratuityAmount OR serviceCharges[] ──
    let checkGrat = num(r.checkGratuityAmount);
    if (checkGrat === 0 && Array.isArray(r.payments)) {
      for (const p of r.payments) checkGrat += num(p.gratuityAmount);
    }
    if (checkGrat === 0 && Array.isArray(r.serviceCharges)) {
      for (const sc of r.serviceCharges) {
        const isGrat = sc.gratuity === true ||
          /grat/i.test(sc.serviceChargeCategory ?? '') ||
          /grat/i.test(sc.name ?? '');
        if (isGrat) checkGrat += num(sc.chargeAmount ?? sc.amount);
      }
    }
    gratuity += checkGrat;

    // ── Status (case-insensitive) ──────────────────────────────────
    const status = (r.checkStatus ?? '').toUpperCase();
    if (OPEN_STATUSES.has(status)) {
      unpaid += num(r.checkTotalAmount);
      unpaidCount++;
    } else if (PAID_STATUSES.has(status) || status === '') {
      // Default unknown/empty to paid (safer for transaction count)
      paidCount++;
    }

    // Turn time: NOT derived from API. Toast `/check/day` lacks minute-precision
    // check-open time, so any computed value would be garbage. Sourced from
    // weekly Toast ZIP `Service mode summary.csv` instead.
  }

  return {
    tips: r2(tips),
    gratuity: r2(gratuity),
    unpaid_amount: r2(unpaid),
    unpaid_checks_count: unpaidCount,
    transactions: paidCount,
    avg_turn_time_mins: null,
  };
}

interface BuiltMetric {
  bar_id: string;
  date: string;
  net_sales: number;
  gross_sales: number;
  discounts: number;
  discounts_pct: number;
  refunds: number;
  refund_pct: number;
  voids: number;
  void_pct: number;
  orders_count: number;
  tickets_count: number;
  transactions: number;
  guests: number;
  avg_check: number;
  // labor (from labor/day endpoint wins)
  labor_cost: number | null;
  labor_hours: number | null;
  overtime_hours: number | null;
  overtime_pct: number | null;
  labor_pct: number | null;
  splh: number | null;
  // menu split
  food_sales: number | null;
  bev_sales: number | null;
  // check/day derived
  tips: number | null;
  tips_amount: number | null;
  tip_pct: number | null;
  unpaid_amount: number | null;
  unpaid_checks_count: number | null;
  avg_turn_time_mins: number | null;
  tip_data_missing: boolean;
  source: string;
}

function indexByDate<T extends { businessDate: string | number }>(rows: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) m.set(compactToIso(r.businessDate), r);
  return m;
}

function buildMetricsForDate(
  barId: string,
  date: string,
  metricsRow: MetricsDayRow | undefined,
  laborRow: LaborDayRow | undefined,
  menuRows: MenuDayRow[],
  checkAgg: CheckDayAggregate | undefined,
  ordersTurnTimeMins: number | null,
): BuiltMetric | null {
  if (!metricsRow && !laborRow && menuRows.length === 0 && !checkAgg) return null;

  const netSales = r2(num(metricsRow?.netSalesAmount));
  const grossSales = r2(num(metricsRow?.grossSalesAmount));
  const discounts = r2(num(metricsRow?.discountAmount));
  const refunds = r2(num(metricsRow?.refundAmount));
  const voidsAmount = r2(num(metricsRow?.voidOrdersAmount));
  const voidsCount = Math.round(num(metricsRow?.voidOrdersCount));
  // Prefer metrics/day ordersCount; fall back to check/day paid-check count.
  const ordersFromMetrics = Math.round(num(metricsRow?.ordersCount));
  const ordersCount = ordersFromMetrics > 0
    ? ordersFromMetrics
    : (checkAgg?.transactions ?? 0);
  const guests = Math.round(num(metricsRow?.guestCount));
  const avgCheck = r2(num(metricsRow?.avgOrderValue) || (ordersCount > 0 ? netSales / ordersCount : 0));

  // Labor (labor/day endpoint wins)
  const laborHours = laborRow ? r2(num(laborRow.totalHours)) : null;
  const laborCost = laborRow ? r2(num(laborRow.totalCost)) : null;
  const overtimeHours = laborRow ? r2(num(laborRow.overtimeHours)) : null;
  // totalCostPerNetSales in this Toast tenant comes back as percent × 100
  // (e.g. 1730 means 17.30%). Divide by 100 to normalize. Sanity-check: any
  // value > 100 is treated as scaled and divided; values 0-100 used as-is.
  const rawLaborPct = laborRow?.totalCostPerNetSales != null
    ? num(laborRow.totalCostPerNetSales)
    : null;
  const laborPctFromApi = rawLaborPct != null
    ? r2(rawLaborPct > 100 ? rawLaborPct / 100 : rawLaborPct)
    : null;
  const laborPct = laborPctFromApi ?? (laborCost != null && laborCost > 0 && netSales > 0
    ? r2((laborCost / netSales) * 100)
    : null);
  const splhFromApi = laborRow?.netSalesPerEmployeeHour != null
    ? r2(num(laborRow.netSalesPerEmployeeHour))
    : null;
  const splh = splhFromApi ?? (laborHours != null && laborHours > 0 && netSales > 0
    ? r2(netSales / laborHours)
    : null);
  const overtimePct = laborHours != null && laborHours > 0 && overtimeHours != null
    ? r2((overtimeHours / laborHours) * 100)
    : null;

  // Food / Beverage split from menu/day
  let foodSales = 0;
  let bevSales = 0;
  let sawAnyMenu = false;
  for (const m of menuRows) {
    sawAnyMenu = true;
    const amt = num(m.netSalesAmount);
    if (isBeverageGroup(m.menuGroupName ?? '')) bevSales += amt;
    else foodSales += amt;
  }

  // Check/day derived: tips, gratuity, unpaid totals, dine-in turn time.
  // Combine tips + gratuity into the single `tips` column (matches existing
  // manual-upload semantics where "tips" is the all-in tip + auto-grat).
  const totalTips = checkAgg ? r2(checkAgg.tips + checkAgg.gratuity) : null;
  const tipPct = checkAgg && netSales > 0 && totalTips != null && totalTips > 0
    ? r2((totalTips / netSales) * 100)
    : null;

  return {
    bar_id: barId,
    date,
    net_sales: netSales,
    gross_sales: grossSales,
    discounts,
    discounts_pct: r2(netSales > 0 ? (discounts / netSales) * 100 : 0),
    refunds,
    refund_pct: r2(netSales > 0 ? (refunds / netSales) * 100 : 0),
    voids: voidsCount,
    void_pct: r2(netSales > 0 ? (voidsAmount / netSales) * 100 : 0),
    orders_count: ordersCount,
    tickets_count: ordersCount,
    transactions: ordersCount,
    guests,
    avg_check: avgCheck,
    labor_cost: laborCost,
    labor_hours: laborHours,
    overtime_hours: overtimeHours,
    overtime_pct: overtimePct,
    labor_pct: laborPct,
    splh,
    food_sales: sawAnyMenu ? r2(foodSales) : null,
    bev_sales: sawAnyMenu ? r2(bevSales) : null,
    tips: totalTips,
    tips_amount: totalTips,
    tip_pct: tipPct,
    // Always write 0 (not null) when check/day ran — distinguishes "no open checks" from "didn't sync"
    unpaid_amount: checkAgg ? checkAgg.unpaid_amount : null,
    unpaid_checks_count: checkAgg ? checkAgg.unpaid_checks_count : null,
    // Turn time sourced from /orders/v2/ordersBulk (passed in). Null when fetch failed or no samples.
    avg_turn_time_mins: ordersTurnTimeMins,
    // True when check/day report failed: tips/unpaid/turn are NULL because the
    // API didn't return data, not because they're genuinely zero. The weekly
    // rollup uses this to gate coverage and the admin diagnostic surfaces it.
    tip_data_missing: !checkAgg,
    source: 'toast_analytics_api',
  };
}

// ── Pacific time helpers ─────────────────────────────────────

function nowPacific(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
}
function formatDatePT(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function yesterdayPT(): string {
  const d = nowPacific();
  d.setDate(d.getDate() - 1);
  return formatDatePT(d);
}

// Returns a Date representing the moment in real (UTC) time that corresponds
// to `hour:00 PT` on the wall-clock date `yyyy_mm_dd` in Pacific Time. Handles
// PST/PDT transitions correctly.
function ptWallClockToUtc(yyyy_mm_dd: string, hour: number): Date {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  // Anchor in UTC, then measure how PT renders that instant to derive offset.
  const naiveUtc = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
  const ptRendered = new Date(naiveUtc.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const utcRendered = new Date(naiveUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = utcRendered.getTime() - ptRendered.getTime();
  return new Date(naiveUtc.getTime() + offsetMs);
}

// Plan Phase B/C grace: business day for `dateStr` is "safely closed" 6h after
// the start of the next PT day's 03:00 sync window — i.e. next-day 09:00 PT.
function eodPlusGraceUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  return ptWallClockToUtc(nextStr, 9); // 03:00 EOD + 6h grace = 09:00 PT
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Per-venue sync_runs rows are opened inside the venue loop below
    // (sync_type='toast_metrics', keyed to the real venue UUID). The legacy
    // top-level zero-UUID insert was removed because sync_runs.bar_id has an
    // FK to venues(id), so those inserts were silently rejected and the
    // Admin Sync tab never saw this sync.

    // Parse body — defaults to yesterday-only sync.
    let startDate: string;
    let endDate: string;
    let venueFilter: string | null = null;
    let backfillCheckDay = false;
    let debugCheckDay = false;
    // force_resync: when true, bypass the existing-row guards and re-pull
    // metrics/labor/menu/check from Toast even if the row already exists.
    // Used to repair days where an earlier sync captured an incomplete
    // business day, or where the source flag was overwritten by another
    // writer (e.g. a KDS CSV upload).
    let forceResync = false;
    let venueFilters: string[] = [];
    try {
      const body = await req.json();
      startDate = body.start_date || yesterdayPT();
      endDate = body.end_date || formatDatePT(nowPacific());
      // Accept singular (venue_id, bar_code) or plural (bar_codes, venue_ids) array forms.
      if (Array.isArray(body.bar_codes)) venueFilters.push(...body.bar_codes);
      if (Array.isArray(body.venue_ids)) venueFilters.push(...body.venue_ids);
      if (body.venue_id) venueFilters.push(body.venue_id);
      if (body.bar_code) venueFilters.push(body.bar_code);
      venueFilter = venueFilters[0] ?? null;
      backfillCheckDay = body.backfill_check_day === true;
      debugCheckDay = body.debug_check_day === true;
      forceResync = body.force_resync === true;
    } catch {
      startDate = yesterdayPT();
      endDate = formatDatePT(nowPacific());
    }

    // Active venues with a Toast restaurant GUID
    let venueQuery = supabase
      .from('venues')
      .select('id, bar_code, toast_restaurant_guid, toast_client_id, toast_client_secret')
      .eq('is_active', true)
      .eq('toast_api_enabled', true)
      .not('toast_restaurant_guid', 'is', null)
      .order('bar_code', { ascending: true });

    if (venueFilters.length > 0) {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuids = venueFilters.filter(v => uuidRe.test(v));
      const codes = venueFilters.filter(v => !uuidRe.test(v));
      // Build OR clause across id and bar_code so multiple venues can be targeted.
      const orParts: string[] = [];
      if (uuids.length) orParts.push(`id.in.(${uuids.join(',')})`);
      if (codes.length) orParts.push(`bar_code.in.(${codes.map(c => `"${c}"`).join(',')})`);
      if (orParts.length) venueQuery = venueQuery.or(orParts.join(','));
    }

    const { data: venues, error: venuesError } = await venueQuery;
    if (venuesError) throw venuesError;

    if (!venues || venues.length === 0) {
      // Nothing to sync — no venues, so no per-venue sync_runs rows to write.
      return new Response(JSON.stringify({ success: true, message: 'No venues with Toast GUIDs configured', synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Dispatcher mode ──────────────────────────────────────
    // When invoked with no venue filter (cron-style call), fan-out one HTTP
    // call per venue via pg_net. Each child runs as a worker (with venue_id
    // set), staying well under the 300s edge wall-clock limit per venue.
    // Phase 2: dispatcher work runs inside EdgeRuntime.waitUntil() so the
    // isolate survives past the inbound 150s gateway disconnect — the loop
    // (8 venues × 30s stagger = 240s) now fits inside the full 300s budget.
    const isDispatcher = venueFilters.length === 0;
    if (isDispatcher && venues.length > 1) {
      const dispatchStartedAt = new Date().toISOString();
      const venueCodes = venues.map((v) => v.bar_code || v.id);

      // Open the dispatcher sync_runs row BEFORE handing off to the background
      // task, so the row is observable from the synchronous response AND so
      // the standalone reaper can reap it if the isolate dies.
      let dispatchRunId: string | null = null;
      {
        const { data: runRow, error: runErr } = await supabase
          .from('sync_runs')
          .insert({
            bar_id: venues[0].id,
            sync_type: 'toast_metrics_dispatch',
            status: 'running',
            started_at: dispatchStartedAt,
            metadata: { venues: venueCodes, start_date: startDate, end_date: endDate, count: venues.length },
          })
          .select('id')
          .single();
        if (runErr) {
          console.error(`[DISPATCHER] sync_runs insert failed: ${runErr.message}`);
        } else {
          dispatchRunId = runRow.id;
          dispatchRunIdForShutdown = runRow.id; // flushed by beforeunload listener
        }
      }

      const runDispatch = async () => {
        // ── Reaper (Phase 2 improvements) ───────────────────────
        // - Covers both `toast_metrics` (workers) AND `toast_metrics_dispatch`
        //   (dispatcher rows themselves). Dispatcher rows are marked failed
        //   but NOT re-enqueued (re-enqueueing a dispatcher = double-fan-out).
        // - Dedupes the reap query AND the re-enqueue: skip if another running
        //   worker already covers the same (bar_id, start, end).
        // - Preserves `force_resync` and `backfill_check_day` flags on
        //   re-enqueue so ops repair runs don't silently lose intent.
        try {
          const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
          const { data: stalled, error: stalledErr } = await supabase
            .from('sync_runs')
            .select('id, bar_id, sync_type, metadata')
            .in('sync_type', ['toast_metrics', 'toast_metrics_dispatch'])
            .eq('status', 'running')
            .lt('started_at', cutoff);
          if (stalledErr) {
            console.error(`[REAPER] query failed: ${stalledErr.message}`);
          } else if (stalled && stalled.length > 0) {
            console.warn(`[REAPER] Found ${stalled.length} stalled run(s) (workers+dispatchers) — auto-failing`);
            const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-toast-metrics`;
            const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            // Dedupe stale workers by (bar_id, start, end) — keep one per slot.
            const seenSlots = new Set<string>();
            for (const run of stalled) {
              await supabase.from('sync_runs').update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error_message: 'auto-reaped: wall-clock timeout (>15min in running)',
              }).eq('id', run.id);

              // Dispatcher rows are never re-enqueued.
              if (run.sync_type === 'toast_metrics_dispatch') {
                console.log(`[REAPER] failed dispatcher run ${run.id} (no re-enqueue)`);
                continue;
              }

              const md = (run.metadata ?? {}) as Record<string, any>;
              const sd = md.start_date;
              const ed = md.end_date;
              if (!run.bar_id || !sd || !ed) continue;
              const slot = `${run.bar_id}|${sd}|${ed}`;
              if (seenSlots.has(slot)) {
                console.log(`[REAPER] dedup-skip duplicate stale slot ${slot}`);
                continue;
              }
              seenSlots.add(slot);

              // Dedup against any OTHER worker already running for this slot.
              const { data: liveRows } = await supabase
                .from('sync_runs')
                .select('id, metadata')
                .eq('bar_id', run.bar_id)
                .eq('sync_type', 'toast_metrics')
                .eq('status', 'running');
              const conflict = (liveRows ?? []).find((r) => {
                const m = (r.metadata ?? {}) as Record<string, any>;
                return m.start_date === sd && m.end_date === ed;
              });
              if (conflict) {
                console.log(`[REAPER] live worker already covers ${slot} (id=${conflict.id}) — not re-enqueueing`);
                continue;
              }

              const childBody: Record<string, any> = { venue_id: run.bar_id, start_date: sd, end_date: ed };
              if (md.force_resync === true) childBody.force_resync = true;
              if (md.backfill_check_day === true) childBody.backfill_check_day = true;

              try {
                await supabase.rpc('net_http_post', {
                  url: fnUrl,
                  headers_json: JSON.stringify({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                  }),
                  body_json: JSON.stringify(childBody),
                });
                console.log(`[REAPER] re-enqueued ${md.bar_code ?? run.bar_id} ${sd}..${ed} flags=${JSON.stringify({ force_resync: !!md.force_resync, backfill_check_day: !!md.backfill_check_day })}`);
              } catch (reErr) {
                const msg = reErr instanceof Error ? reErr.message : String(reErr);
                console.error(`[REAPER] re-enqueue failed for ${run.bar_id}: ${msg}`);
              }
            }
          }
        } catch (reapErr) {
          console.error('[REAPER] non-fatal:', reapErr);
        }

        console.log(`[DISPATCHER] Fanning out ${venues.length} venues for ${startDate}..${endDate}: ${venueCodes.join(', ')}`);

        const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-toast-metrics`;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        let dispatched = 0;
        const dispatchErrors: string[] = [];

        for (const v of venues) {
          const childBody = {
            venue_id: v.id,
            start_date: startDate,
            end_date: endDate,
            force_resync: forceResync,
            backfill_check_day: backfillCheckDay,
          };
          try {
            const { error: rpcErr } = await supabase.rpc('net_http_post', {
              url: fnUrl,
              headers_json: JSON.stringify({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              }),
              body_json: JSON.stringify(childBody),
            });
            if (rpcErr) {
              console.error(`[DISPATCHER] ${v.bar_code} dispatch failed: ${rpcErr.message}`);
              dispatchErrors.push(`${v.bar_code}: ${rpcErr.message}`);
            } else {
              dispatched++;
              console.log(`[DISPATCHER] dispatched ${v.bar_code} (${dispatched}/${venues.length}) t=${new Date().toISOString()}`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[DISPATCHER] ${v.bar_code} dispatch threw: ${msg}`);
            dispatchErrors.push(`${v.bar_code}: ${msg}`);
          }
          const dateSpan = (() => {
            const a = new Date(startDate + 'T00:00:00Z').getTime();
            const b = new Date(endDate + 'T00:00:00Z').getTime();
            return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
          })();
          const dispatchStaggerMs = dateSpan > 1 ? 30_000 : 8_000;
          await new Promise((r) => setTimeout(r, dispatchStaggerMs));
        }

        if (dispatchRunId) {
          await supabase.from('sync_runs').update({
            status: dispatchErrors.length === 0 ? 'completed' : 'completed_with_errors',
            completed_at: new Date().toISOString(),
            records_processed: dispatched,
            error_message: dispatchErrors.length ? dispatchErrors.join('; ').slice(0, 500) : null,
            metadata: { venues: venueCodes, start_date: startDate, end_date: endDate, count: venues.length, dispatched_count: dispatched },
          }).eq('id', dispatchRunId);
          dispatchRunIdForShutdown = null; // dispatcher closed cleanly
        }
        console.log(`[DISPATCHER] complete: dispatched=${dispatched}/${venues.length} errors=${dispatchErrors.length}`);
      };

      // Hand off to background so the isolate survives the gateway 150s
      // disconnect and uses the full 300s wall_clock_limit_ms budget.
      // deno-lint-ignore no-explicit-any
      const ER = (globalThis as any).EdgeRuntime;
      if (ER && typeof ER.waitUntil === 'function') {
        ER.waitUntil(runDispatch().catch((e: unknown) => {
          console.error('[DISPATCHER] background task crashed:', e instanceof Error ? e.message : String(e));
        }));
      } else {
        // Local dev / no EdgeRuntime — fall back to awaiting inline so behavior
        // is correct (just slower). Production always has EdgeRuntime.
        console.warn('[DISPATCHER] EdgeRuntime.waitUntil unavailable — running inline');
        await runDispatch();
      }

      return new Response(JSON.stringify({
        success: true,
        mode: 'dispatcher',
        status: 'dispatching',
        venues_queued: venues.length,
        venues: venueCodes,
        dispatch_run_id: dispatchRunId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    console.log(`[ANALYTICS] Syncing ${venues.length} venue(s) from ${startDate} to ${endDate}`);

    // Sycamore is on a separate Toast account and must always use dedicated credentials.
    // Do NOT route through the shared management-group credentials — the GUID is not
    // registered under the shared account and Toast will reject it.
    // This separation is permanent by design; do not attempt to unify.
    const SYCAMORE_VENUE_ID = 'cedb71f7-a800-4691-aa79-7877eacda6d4';
    function authOptsFor(venueId: string): { clientId?: string; clientSecret?: string; cacheKey: string } {
      if (venueId === SYCAMORE_VENUE_ID) {
        return {
          clientId: Deno.env.get('SYCAMORE_TOAST_ANALYTICS_CLIENT_ID'),
          clientSecret: Deno.env.get('SYCAMORE_TOAST_ANALYTICS_CLIENT_SECRET'),
          cacheKey: 'sycamore',
        };
      }
      return { cacheKey: 'shared' };
    }

    const allResults = {
      synced: 0,
      errors: [] as string[],
      venues_processed: 0,
      venues_skipped: 0,
      coverage: [] as Array<{ bar_code: string; days_synced: number; days_skipped: number; days_failed: number }>,
    };
    const manualSources = ['manual_upload', 'manual_entry', 'manual_upload_toast_zip'];

    // Build list of single dates to query (Toast Analytics requires
    // start == end on metrics/labor/menu/check daily endpoints).
    const dateList: string[] = [];
    {
      const s = new Date(startDate);
      const e = new Date(endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        dateList.push(formatDatePT(d));
      }
    }

    for (let venueIdx = 0; venueIdx < venues.length; venueIdx++) {
      const venue = venues[venueIdx];
      const restaurantGuid = venue.toast_restaurant_guid!;
      const barCode = venue.bar_code || venue.id;
      allResults.venues_processed++;
      let vSynced = 0, vSkipped = 0, vFailed = 0;
      let markedComplete = false; // flipped true once the venue sync_runs row is closed
      let venueRunId: string | null = null;
      try {

        // Open a per-venue sync_runs row keyed to the real venue UUID. This
        // mirrors sync-toast-employees / sync-toast-time-entries / sync-seven-shifts
        // and surfaces the run in the Admin Sync tab via venue_sync_status.
        const venueRunStartedAt = new Date().toISOString();
        // venueRunId declared above so finally can flush it

        {
          const { data: runRow, error: runErr } = await supabase
            .from('sync_runs')
            .insert({
              bar_id: venue.id,
              sync_type: 'toast_metrics',
              status: 'running',
              started_at: venueRunStartedAt,
              metadata: { bar_code: barCode, start_date: startDate, end_date: endDate, days: dateList.length, force_resync: forceResync, backfill_check_day: backfillCheckDay },
            })
            .select('id')
            .single();
          if (runErr) {
            console.error(`[SYNC_RUN] ${barCode} insert failed: ${runErr.message}`);
            // Continue without a run row — we still want metrics to land.
          } else {
            venueRunId = runRow.id;
          }
        }

        // Acquire token for this venue's credential set. Failure → skip venue.
        let token: string;
        try {
          token = await getAnalyticsToken(authOptsFor(venue.id));
        } catch (authErr) {
          const msg = authErr instanceof Error ? authErr.message : String(authErr);
          console.error(`[AUTH] ${barCode} skipped: ${msg}`);
          allResults.errors.push(`${barCode} auth: ${msg}`);
          allResults.venues_skipped++;
          allResults.coverage.push({ bar_code: barCode, days_synced: 0, days_skipped: 0, days_failed: dateList.length });
          if (venueRunId) {
            await supabase.from('sync_runs').update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: `auth: ${msg}`.slice(0, 500),
              metadata: { bar_code: barCode, start_date: startDate, end_date: endDate, days_failed: dateList.length },
            }).eq('id', venueRunId);
          }
          markedComplete = true;
          continue;
        }

        console.log(`[ANALYTICS] ${barCode} (${restaurantGuid}) ${dateList.length} day(s): ${dateList[0]}..${dateList[dateList.length - 1]}`);

        // Per-tenant pacing flag. Only Sycamore is on its own management group;
        // everything else shares one Toast tenant whose rate limits starve the
        // heavier reports (especially check/day). On the shared tenant we add a
        // pre-check/day pause to let the per-job rate window clear.
        const tenantKey = authOptsFor(venue.id).cacheKey;
        const isSharedTenant = tenantKey !== 'sycamore';

        // Per-day fetch + immediate upsert. This guarantees partial progress is
        // saved even if the function hits the wall-clock limit later.
        // check/day is the authoritative source for tips, gratuity, unpaid
        // amounts. 429s are handled by pollJob's exponential backoff, the
        // per-path submit spacing in `_shared/toast-analytics.ts`, and the
        // per-venue stagger below.
        const venueErrors: string[] = [];
        const reportOutcomesByDate: Record<string, { metrics: string; labor: string; menu: string; check: string }> = {};

        for (const singleDate of dateList) {
          // Phase B: in-progress-day guard. Skip any date whose Pacific business
          // day hasn't been safely closed (EOD + 6h grace = next-day 09:00 PT).
          // Bypassed by force_resync for ops repair.
          const eodGrace = eodPlusGraceUtc(singleDate);
          if (Date.now() < eodGrace.getTime() && !forceResync) {
            console.log(`[GRACE-WINDOW] ${barCode}/${singleDate} business day not safely closed (until ${eodGrace.toISOString()}) — skipping`);
            vSkipped++;
            continue;
          }

          // Idempotency guard: skip if a manual row OR a previously-fresh
          // toast_analytics_api row already owns this venue/date.
          const { data: existingRow } = await supabase
            .from('daily_metrics')
            .select('source, synced_at, tips, tips_amount, unpaid_amount, unpaid_checks_count, tip_pct, labor_cost, labor_hours, labor_pct, splh, overtime_hours, overtime_pct, food_sales, bev_sales, net_sales, avg_turn_time_mins, tip_data_missing')
            .eq('bar_id', barCode)
            .eq('date', singleDate)
            .maybeSingle();
          if (existingRow && manualSources.includes(existingRow.source ?? '') && !forceResync) {
            console.log(`[SKIP] ${barCode}/${singleDate} preserved manual data (source=${existingRow.source})`);
            vSkipped++;
            continue;
          }
          // Phase C: freshness-aware idempotency. Only skip if the prior
          // toast_analytics_api row was written AFTER the date was safely closed.
          // Otherwise it was a partial-day capture — re-fetch and overwrite.
          if (existingRow && existingRow.source === 'toast_analytics_api' && !backfillCheckDay && !forceResync) {
            const syncedAtMs = existingRow.synced_at ? new Date(existingRow.synced_at).getTime() : 0;
            if (syncedAtMs >= eodGrace.getTime()) {
              console.log(`[SKIP] ${barCode}/${singleDate} already synced from Analytics API (fresh: ${existingRow.synced_at})`);
              vSkipped++;
              continue;
            }
            const ageHours = syncedAtMs ? Math.round((eodGrace.getTime() - syncedAtMs) / 3_600_000) : -1;
            console.log(`[REFRESH] ${barCode}/${singleDate} prior sync was ${ageHours}h before EOD+grace (synced_at=${existingRow.synced_at}) — re-fetching`);
          }
          if (existingRow && existingRow.source === 'toast_analytics_api' && backfillCheckDay) {
            console.log(`[BACKFILL] ${barCode}/${singleDate} re-syncing toast_analytics_api row`);
          }
          if (existingRow && forceResync) {
            console.log(`[FORCE-RESYNC] ${barCode}/${singleDate} overwriting existing row (source=${existingRow.source})`);
          }
          // Backfill mode also patches non-manual, non-Toast-API sources
          // (e.g. kds_csv_upload on Waterfront) where tips columns are NULL
          // because the upload path doesn't carry tips. We only patch the
          // check-derived columns; we never touch net_sales / labor on those rows.
          if (existingRow && backfillCheckDay
              && !manualSources.includes(existingRow.source ?? '')
              && existingRow.source !== 'toast_analytics_api') {
            console.log(`[BACKFILL] ${barCode}/${singleDate} patching tips on source=${existingRow.source}`);
          }

          let metricsRow: MetricsDayRow | undefined;
          let laborRow: LaborDayRow | undefined;
          let menuRowsForDate: MenuDayRow[] = [];
          let checkAgg: CheckDayAggregate | undefined;
          let dayFailed = false;

          // Per-report outcome tags (Phase A): ok | http_429 | poll_timeout | empty | error:<msg>
          const outcomes = { metrics: 'pending', labor: 'pending', menu: 'pending', check: 'pending' };
          const classifyErr = (msg: string): string => {
            if (/HTTP 429/.test(msg)) return 'http_429';
            if (/wall-clock timeout|timed out after/i.test(msg)) return 'poll_timeout';
            return `error:${msg.slice(0, 80)}`;
          };

          try {
            const rows = await fetchMetricsDay(token, restaurantGuid, singleDate, singleDate, tenantKey);
            metricsRow = rows[0];
            // Phase D: degenerate-row sanity. Toast occasionally returns $0 nets
            // alongside a real ordersCount when a report is pulled too soon after
            // EOD. Discard so the next cron retries instead of locking in $0.
            if (metricsRow && num(metricsRow.netSalesAmount) === 0 && num(metricsRow.ordersCount) > 10) {
              const oc = num(metricsRow.ordersCount);
              console.warn(`[DEGENERATE] ${barCode}/${singleDate} metrics returned $0/${oc} orders — discarding`);
              venueErrors.push(`${singleDate} metrics: degenerate $0/${oc} orders`);
              metricsRow = undefined;
              outcomes.metrics = 'empty';
              dayFailed = true;
            } else {
              outcomes.metrics = metricsRow ? 'ok' : 'empty';
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[METRICS] ${barCode}/${singleDate}: ${msg}`);
            allResults.errors.push(`${barCode}/${singleDate} metrics: ${msg}`);
            venueErrors.push(`${singleDate} metrics: ${msg}`);
            outcomes.metrics = classifyErr(msg);
            dayFailed = true;
          }

          try {
            const rows = await fetchLaborDay(token, restaurantGuid, singleDate, singleDate, tenantKey);
            laborRow = rows[0];
            outcomes.labor = laborRow ? 'ok' : 'empty';
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[LABOR] ${barCode}/${singleDate}: ${msg}`);
            allResults.errors.push(`${barCode}/${singleDate} labor: ${msg}`);
            venueErrors.push(`${singleDate} labor: ${msg}`);
            outcomes.labor = classifyErr(msg);
            dayFailed = true;
          }

          try {
            menuRowsForDate = await fetchMenuDay(token, restaurantGuid, singleDate, singleDate, tenantKey);
            outcomes.menu = menuRowsForDate.length > 0 ? 'ok' : 'empty';
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[MENU] ${barCode}/${singleDate}: ${msg}`);
            allResults.errors.push(`${barCode}/${singleDate} menu: ${msg}`);
            venueErrors.push(`${singleDate} menu: ${msg}`);
            outcomes.menu = classifyErr(msg);
            dayFailed = true;
          }

          // Pre-check/day pause on shared tenant — gives the Toast rate window
          // time to clear before we submit the heaviest report. Sycamore (own
          // tenant) doesn't need it.
          if (isSharedTenant) {
            await new Promise((r) => setTimeout(r, 5000));
          }

          // check/day → tips, gratuity, unpaid. Failure here is non-fatal:
          // we still write the metrics/labor/menu fields and PRESERVE any
          // existing tips/unpaid on the prior row (Phase A: preserve-on-empty).
          try {
            const checkRows = await fetchCheckDay(token, restaurantGuid, singleDate, singleDate, debugCheckDay, tenantKey);
            checkAgg = aggregateCheckDay(checkRows);
            outcomes.check = 'ok';
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[CHECK] ${barCode}/${singleDate}: ${msg}`);
            allResults.errors.push(`${barCode}/${singleDate} check: ${msg}`);
            venueErrors.push(`${singleDate} check: ${msg}`);
            outcomes.check = classifyErr(msg);
            dayFailed = true;
          }

          // Turn time from /orders/v2/ordersBulk (per-check paidDate − openedDate).
          // Soft-fail: any error → null, never blocks the metrics/labor/menu writes.
          let ordersTurnTime: number | null = null;
          let ordersTurnSamples = 0;
          let ordersTurnFetched = false;
          {
            const ordersClientId = (venue as any).toast_client_id || Deno.env.get('TOAST_CLIENT_ID');
            const ordersClientSecret = (venue as any).toast_client_secret || Deno.env.get('TOAST_CLIENT_SECRET');
            if (ordersClientId && ordersClientSecret) {
              try {
                const result = await fetchOrdersTurnTime(ordersClientId, ordersClientSecret, restaurantGuid, singleDate);
                ordersTurnTime = result.avg_turn_time_mins;
                ordersTurnSamples = result.sample_count;
                ordersTurnFetched = true;
                console.log(`[ORDERS-TURN] ${barCode}/${singleDate} turn=${ordersTurnTime} samples=${ordersTurnSamples}`);
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn(`[ORDERS-TURN] ${barCode}/${singleDate} failed: ${msg}`);
              }
            } else {
              console.warn(`[ORDERS-TURN] ${barCode}/${singleDate} skipped: no Orders API credentials`);
            }
          }

          reportOutcomesByDate[singleDate] = outcomes;

          // Backfill mode: only patch the check-derived columns. If checkAgg
          // failed (e.g. 429), do nothing — preserve any existing tips/unpaid.
          if (backfillCheckDay) {
            if (!checkAgg) {
              console.log(`[BACKFILL-SKIP] ${barCode}/${singleDate} check/day failed — preserving existing row`);
              vSkipped++;
              continue;
            }
            const totalTips = r2(checkAgg.tips + checkAgg.gratuity);
            const prevNet = num(existingRow?.net_sales);
            const tipPct = prevNet > 0 && totalTips > 0 ? r2((totalTips / prevNet) * 100) : null;
            const patch = {
              tips: totalTips,
              tips_amount: totalTips,
              tip_pct: tipPct,
              unpaid_amount: checkAgg.unpaid_amount,
              unpaid_checks_count: checkAgg.unpaid_checks_count,
              avg_turn_time_mins: ordersTurnFetched ? ordersTurnTime : (existingRow?.avg_turn_time_mins ?? null),
              tip_data_missing: false,
            };
            const { error: patchErr } = await supabase
              .from('daily_metrics')
              .update(patch)
              .eq('bar_id', barCode)
              .eq('date', singleDate);
            if (patchErr) {
              console.error(`[BACKFILL-PATCH] ${barCode}/${singleDate}:`, patchErr);
              allResults.errors.push(`${barCode}/${singleDate} backfill-patch: ${patchErr.message}`);
              venueErrors.push(`${singleDate} backfill-patch: ${patchErr.message}`);
              vFailed++;
            } else {
              allResults.synced++;
              vSynced++;
              console.log(`[BACKFILL-OK] ${barCode}/${singleDate} tips=${totalTips} unpaid=${checkAgg.unpaid_amount} turn=${ordersTurnTime}`);
            }
            continue;
          }

          const built = buildMetricsForDate(
            barCode,
            singleDate,
            metricsRow,
            laborRow,
            menuRowsForDate,
            checkAgg,
            ordersTurnTime,
          );
          if (!built) {
            console.log(`[SKIP] ${barCode}/${singleDate} no Analytics data`);
            if (dayFailed) vFailed++; else vSkipped++;
            continue;
          }
          // [H10 REMOVED 2026-05-16] zero net+orders early-skip deleted.
          // Was redundant with H4 (preserve-on-empty) below — H4 already strips
          // owner columns from empty reports without silently dropping the row.

          // Phase D guard at write-time: if metrics fetch was discarded (degenerate)
          // but check/day still produced a transaction count, refuse to write a
          // $0/many-orders row. Better to leave the date absent and retry.
          if (!metricsRow && (built.orders_count ?? 0) > 10) {
            console.warn(`[DEGENERATE-SKIP] ${barCode}/${singleDate} metrics missing but orders=${built.orders_count} — not writing`);
            vFailed++;
            continue;
          }

          // ── Preserve-on-empty write (Phase A) ─────────────────────
          // For every report that failed this run, strip the columns it owns
          // from the write payload so a prior good value isn't nulled out.
          // Use UPDATE when an existing row is present (so omitted keys keep
          // their values); UPSERT only when inserting fresh.
          const writePayload: Record<string, unknown> = { ...built };

          // check/day owns: tips, tips_amount, tip_pct, unpaid_amount,
          // unpaid_checks_count. avg_turn_time_mins is from /orders, not check/day.
          if (!checkAgg) {
            delete writePayload.tips;
            delete writePayload.tips_amount;
            delete writePayload.tip_pct;
            delete writePayload.unpaid_amount;
            delete writePayload.unpaid_checks_count;
            // tip_data_missing: only flag true if check/day failed AND we have
            // no prior tips to fall back on. If a prior row has tips, keep
            // tip_data_missing=false so the UI doesn't badge the day as missing.
            const priorHasTips = existingRow?.tips != null || existingRow?.tips_amount != null;
            writePayload.tip_data_missing = !priorHasTips;
          }
          // labor/day owns: labor_cost, labor_hours, labor_pct, splh,
          // overtime_hours, overtime_pct.
          if (!laborRow) {
            delete writePayload.labor_cost;
            delete writePayload.labor_hours;
            delete writePayload.labor_pct;
            delete writePayload.splh;
            delete writePayload.overtime_hours;
            delete writePayload.overtime_pct;
          }
          // menu/day owns: food_sales, bev_sales.
          if (menuRowsForDate.length === 0) {
            delete writePayload.food_sales;
            delete writePayload.bev_sales;
          }
          // /orders turn-time: only overwrite when the fetch actually ran AND
          // we have a numeric value. Otherwise preserve the prior row's turn.
          if (!ordersTurnFetched || ordersTurnTime == null) {
            delete writePayload.avg_turn_time_mins;
          }
          // metrics/day owns net_sales/orders/etc — if it failed entirely we'd
          // have returned `built === null` above. Still, if metricsRow missing
          // but build produced zeros from check/day fallback, don't blast
          // existing net_sales/orders.
          if (!metricsRow) {
            delete writePayload.net_sales;
            delete writePayload.gross_sales;
            delete writePayload.discounts;
            delete writePayload.discounts_pct;
            delete writePayload.refunds;
            delete writePayload.refund_pct;
            delete writePayload.voids;
            delete writePayload.void_pct;
            delete writePayload.orders_count;
            delete writePayload.tickets_count;
            delete writePayload.transactions;
            delete writePayload.guests;
            delete writePayload.avg_check;
          }

          let writeErr: { message: string } | null = null;
          if (existingRow) {
            // Strip the join keys from update payload; they're in the WHERE.
            const { bar_id: _bi, date: _d, source: _src, ...updates } = writePayload as any;
            // Preserve original source if we're patching (don't downgrade a
            // manual row, though manual rows are blocked earlier).
            const { error } = await supabase
              .from('daily_metrics')
              .update(updates)
              .eq('bar_id', barCode)
              .eq('date', singleDate);
            writeErr = error;
          } else {
            const { error } = await supabase
              .from('daily_metrics')
              .upsert(writePayload as any, { onConflict: 'bar_id,date', ignoreDuplicates: false });
            writeErr = error;
          }

          if (writeErr) {
            console.error(`[UPSERT] ${barCode}/${singleDate}:`, writeErr);
            allResults.errors.push(`${barCode}/${singleDate}: ${writeErr.message}`);
            venueErrors.push(`${singleDate} upsert: ${writeErr.message}`);
            vFailed++;
          } else {
            allResults.synced++;
            vSynced++;
            const preserved = [
              !checkAgg && (existingRow?.tips != null) ? 'tips' : null,
              !laborRow && (existingRow?.labor_cost != null) ? 'labor' : null,
              menuRowsForDate.length === 0 && (existingRow?.food_sales != null) ? 'menu' : null,
            ].filter(Boolean).join(',');
            console.log(`[OK] ${barCode}/${singleDate} net=${built.net_sales} labor_cost=${built.labor_cost ?? '—'} food=${built.food_sales ?? '—'} bev=${built.bev_sales ?? '—'} tips=${built.tips ?? '—'} unpaid=${built.unpaid_amount ?? '—'} turn=${built.avg_turn_time_mins ?? '—'}${preserved ? ` preserved=${preserved}` : ''} outcomes=${JSON.stringify(outcomes)}`);
          }
        } // end for (singleDate of dateList)

        allResults.coverage.push({ bar_code: barCode, days_synced: vSynced, days_skipped: vSkipped, days_failed: vFailed });

        // Close the per-venue sync_runs row.
        if (venueRunId) {
          const venueStatus = vFailed > 0 && vSynced === 0 ? 'failed' : 'completed';
          await supabase.from('sync_runs').update({
            status: venueStatus,
            completed_at: new Date().toISOString(),
            records_processed: vSynced + vSkipped + vFailed,
            records_created: vSynced,
            error_message: venueErrors.length > 0 ? venueErrors.join('; ').slice(0, 500) : null,
            metadata: {
              bar_code: barCode,
              start_date: startDate,
              end_date: endDate,
              days_synced: vSynced,
              days_skipped: vSkipped,
              days_failed: vFailed,
              tenant: tenantKey,
              report_outcomes: reportOutcomesByDate,
            },
          }).eq('id', venueRunId);
        }
          markedComplete = true;

        // Stagger venues to avoid Toast per-management-group rate limiting.
        // Shared tenant: 10s between venues so check/day windows don't overlap.
        // Sycamore (own tenant): 3s is fine. Skip after the last venue.
        if (venueIdx < venues.length - 1) {
          const interVenueDelayMs = isSharedTenant ? 10_000 : 3_000;
          await new Promise((r) => setTimeout(r, interVenueDelayMs));
        }
      } catch (workerErr) {
        const msg = workerErr instanceof Error ? workerErr.message : String(workerErr);
        console.error(`[WORKER] ${barCode} crashed:`, msg);
        allResults.errors.push(`${barCode} worker-crash: ${msg}`);
      } finally {
        // Phase 2: ensure no sync_runs row ever stays 'running' if the worker
        // crashes mid-iteration. Conditional update so we don't overwrite a
        // row that was already closed by the happy-path or auth-fail branch.
        if (venueRunId && !markedComplete) {
          try {
            await supabase.from('sync_runs')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error_message: 'worker crash: isolate exited before markedComplete',
              })
              .eq('id', venueRunId)
              .eq('status', 'running');
            console.warn(`[WORKER] ${barCode} finally-flushed sync_runs row ${venueRunId} as failed`);
          } catch (flushErr) {
            console.error(`[WORKER] ${barCode} finally-flush failed:`, flushErr);
          }
        }
      }
    }


    await supabase
      .from('app_config')
      .upsert({ key: 'toast_last_sync', value: { timestamp: new Date().toISOString() } }, { onConflict: 'key' });

    console.log('[ANALYTICS] sync complete:', allResults);

    // Chain 7shifts sync (skipped during backfill mode to avoid redundant work)
    if (backfillCheckDay) {
      console.log('[CHAIN] Backfill mode — skipping sync-seven-shifts chain');
    } else {
      try {
        console.log('[CHAIN] Invoking sync-seven-shifts...');
        const sevenShiftsRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-seven-shifts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ start_date: startDate, end_date: endDate }),
          },
        );
        const sevenShiftsResult = await sevenShiftsRes.json();
        console.log('[CHAIN] 7shifts result:', sevenShiftsResult);
      } catch (chainErr) {
        console.error('[CHAIN] 7shifts failed (non-fatal):', chainErr);
      }
    }

    // ── Score-compute gate ────────────────────────────────────
    // After sync, decide whether to invoke compute-weekly-scores for the
    // current Pacific week. Rules:
    //   - All venues at 7/7 days (week is closed) → compute now.
    //   - Today is Monday PT (week ended yesterday) → compute prior week even
    //     with gaps; log a structured warning listing missing venue/dates.
    //   - Mid-week with gaps → defer; tomorrow's cron will fill.
    let computeDecision: {
      triggered: boolean;
      reason: string;
      week_start: string;
      missing?: Array<{ bar_code: string; date: string }>;
    } | null = null;
    if (backfillCheckDay) {
      computeDecision = { triggered: false, reason: 'backfill mode — score recompute skipped', week_start: '' };
      console.log('[COMPUTE-GATE] Backfill mode — skipping compute-weekly-scores chain');
    } else try {
      const today = nowPacific();
      const dow = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
      // Pacific Monday-of-current-week (treat Sunday as end of prior week).
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      const weekStart = formatDatePT(monday);
      const weekEnd = formatDatePT(new Date(monday.getTime() + 6 * 86_400_000));

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = formatDatePT(yesterday);

      // Monday cron scores the just-completed PRIOR week.
      const isMondayCron = dow === 1;
      const scoreWeekStart = isMondayCron
        ? formatDatePT(new Date(monday.getTime() - 7 * 86_400_000))
        : weekStart;
      const scoreWeekEnd = isMondayCron
        ? formatDatePT(new Date(monday.getTime() - 1 * 86_400_000))
        : weekEnd;

      // FULL-WEEK semantics: only score CLOSED weeks (Mon–Sun fully in the past).
      // Mid-week runs never compute, even if every available day is present.
      // This prevents partial-week weekly_core rows that pollute YOY scoring
      // and trip the 3-week decline triggers downstream.
      const expectedDates: string[] = [];
      {
        const s = new Date(scoreWeekStart);
        const e = new Date(scoreWeekEnd);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          expectedDates.push(formatDatePT(d));
        }
      }

      // Hard guard: is the score week actually closed yet? (today > scoreWeekEnd in PT)
      const todayStr = formatDatePT(today);
      const weekIsClosed = todayStr > scoreWeekEnd;

      const { data: dmRows } = await supabase
        .from('daily_metrics')
        .select('bar_id, date')
        .gte('date', scoreWeekStart)
        .lte('date', scoreWeekEnd);

      const perVenue = new Map<string, Set<string>>();
      for (const row of (dmRows ?? [])) {
        const k = String(row.bar_id);
        if (!perVenue.has(k)) perVenue.set(k, new Set());
        perVenue.get(k)!.add(String(row.date));
      }

      const venueCodes = venues.map((v) => v.bar_code || v.id);
      const missing: Array<{ bar_code: string; date: string }> = [];
      for (const code of venueCodes) {
        const have = perVenue.get(code) ?? new Set<string>();
        for (const ds of expectedDates) if (!have.has(ds)) missing.push({ bar_code: code, date: ds });
      }

      // Days elapsed in the in-progress week (for the deferral message).
      const daysElapsed = Math.min(
        7,
        Math.max(
          0,
          Math.floor(
            (new Date(todayStr).getTime() - new Date(scoreWeekStart).getTime()) / 86_400_000,
          ) + 1,
        ),
      );

      if (!weekIsClosed) {
        computeDecision = {
          triggered: false,
          reason: `week in progress (day ${daysElapsed} of 7) — scoring deferred until week closes`,
          week_start: scoreWeekStart,
        };
        console.log(`[COMPUTE-GATE] ${computeDecision.reason}`);
      } else if (missing.length === 0) {
        computeDecision = { triggered: true, reason: 'all venues complete (7/7 days)', week_start: scoreWeekStart };
      } else {
        // Week is closed but has gaps → still compute (Monday-cron behavior).
        computeDecision = {
          triggered: true,
          reason: `week closed with ${missing.length} missing day(s)`,
          week_start: scoreWeekStart,
          missing,
        };
        console.warn(`[COMPUTE-GATE] Week ${scoreWeekStart} closed with gaps:`, missing);
      }

      // Belt-and-suspenders: even if triggered ended up true (e.g., manual
      // invocation with bad logic), refuse to compute an in-progress week.
      if (computeDecision.triggered && !weekIsClosed) {
        console.error(`[COMPUTE-GATE] ABORT: refusing to compute in-progress week ${scoreWeekStart}–${scoreWeekEnd} (today=${todayStr})`);
        computeDecision = {
          triggered: false,
          reason: `aborted: today ${todayStr} <= scoreWeekEnd ${scoreWeekEnd}`,
          week_start: scoreWeekStart,
        };
      }

      if (computeDecision.triggered) {
        console.log(`[COMPUTE-GATE] Invoking compute-weekly-scores for ${scoreWeekStart}`);
        try {
          const cwsRes = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/compute-weekly-scores`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ week_start: scoreWeekStart }),
            },
          );
          const cwsBody = await cwsRes.text();
          console.log(`[COMPUTE-GATE] compute-weekly-scores responded ${cwsRes.status}: ${cwsBody.slice(0, 300)}`);
        } catch (cwsErr) {
          console.error('[COMPUTE-GATE] compute-weekly-scores failed (non-fatal):', cwsErr);
        }
      }
    } catch (gateErr) {
      console.error('[COMPUTE-GATE] gate evaluation failed (non-fatal):', gateErr);
    }

    return new Response(JSON.stringify({ success: true, ...allResults, compute: computeDecision }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ANALYTICS] sync failed:', error);
    // Top-level failure — venue loop never started or the venue list query
    // itself failed. We can't attribute this to a single venue, so we just
    // log and return. Per-venue failures inside the loop already record their
    // own sync_runs rows above.

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

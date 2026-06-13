import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface ToastAuthResponse {
  token: { accessToken: string; tokenType: string; expiresIn: number };
  status: string;
}

// ── Auth ────────────────────────────────────────────────────

async function verifyAuth(req: Request): Promise<{ user: { id: string; email?: string } } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: { id: data.user.id, email: data.user.email } };
}

async function getToastToken(): Promise<string> {
  const clientId = Deno.env.get('TOAST_CLIENT_ID');
  const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Toast credentials not configured');

  const response = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }),
  });

  if (!response.ok) throw new Error('Toast authentication failed');
  const data: ToastAuthResponse = await response.json();
  if (data.status !== 'SUCCESS' || !data.token?.accessToken) throw new Error('Toast authentication failed');
  return data.token.accessToken;
}

// ── Helpers ─────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function toastHeaders(token: string, restaurantGuid: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': restaurantGuid,
    'Content-Type': 'application/json',
  };
}

function getDateRange(startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getLastYearDateRange(dateRange: { start: string; end: string }) {
  const s = new Date(dateRange.start);
  const e = new Date(dateRange.end);
  s.setFullYear(s.getFullYear() - 1);
  e.setFullYear(e.getFullYear() - 1);
  return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
}

// ── Beverage category detection ─────────────────────────────

function isBeverageCategory(categoryName: string): boolean {
  const c = categoryName.toLowerCase();
  return (
    c.includes('beverage') || c.includes('drink') || c.includes('beer') ||
    c.includes('wine') || c.includes('cocktail') || c.includes('spirit') ||
    c.includes('bar') || c.includes('alcohol') || c.includes('liquor') ||
    c.includes('draft') || c.includes('bottle') || c.includes('seltzer') ||
    c.includes('cider') || c.includes('shot') || c.includes('mixed') ||
    c.includes('margarita') || c.includes('on tap') || c.includes('n/a bev') ||
    c.includes('non-alc')
  );
}

async function fetchSalesCategories(token: string, restaurantGuid: string): Promise<Map<string, string>> {
  try {
    const res = await fetch('https://ws-api.toasttab.com/config/v2/salesCategories', {
      headers: { 'Authorization': `Bearer ${token}`, 'Toast-Restaurant-External-ID': restaurantGuid },
    });
    if (!res.ok) return new Map();
    const categories = await res.json();
    const map = new Map<string, string>();
    for (const cat of categories) { if (cat.guid && cat.name) map.set(cat.guid, cat.name); }
    return map;
  } catch { return new Map(); }
}

// ── Orders API: Single pass for all order-level metrics ─────

interface OrderMetrics {
  netSales: number;
  grossSales: number;
  discounts: number;
  ordersCount: number;
  guests: number;
  tips: number;
  comps: number;
  refunds: number;
  avgTurnTimeMins: number;
  foodSales: number;
  bevSales: number;
  avgKdsTimeMins: number;
  kdsTicketCount: number;
  kdsTimeBreakdown: { under5: number; under10: number; over10: number };
}

async function fetchOrderMetrics(
  token: string,
  restaurantGuid: string,
  dateRange: { start: string; end: string },
  categoryMap: Map<string, string>,
): Promise<OrderMetrics> {
  const headers = toastHeaders(token, restaurantGuid);
  const pageSize = 100;
  const baseUrl = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${dateRange.start}T00:00:00.000Z&endDate=${dateRange.end}T23:59:59.999Z&pageSize=${pageSize}`;

  let totalNetSales = 0, totalGrossSales = 0, totalDiscounts = 0;
  let ordersCount = 0, guests = 0, totalTips = 0, totalComps = 0;
  let turnTimeMs = 0, turnTimeCount = 0;
  let foodSales = 0, bevSales = 0, totalRefunds = 0;
  let kdsTimeMs = 0, kdsCount = 0;
  let kdsUnder5 = 0, kdsUnder10 = 0, kdsOver10 = 0;

  let page = 1;
  const maxPages = 25;

  while (page <= maxPages) {
    const response = await fetch(`${baseUrl}&page=${page}`, { headers });
    if (!response.ok) {
      if (response.status === 429) { await delay(500); continue; }
      break;
    }

    const orders = await response.json();
    if (!orders.length) break;

    for (const order of orders) {
      ordersCount++;
      guests += order.guestCount || 1;

      if (order.checks) {
        for (const check of order.checks) {
          totalTips += check.tipAmount || 0;

          // Refunds
          if (check.paymentStatus === 'REFUNDED' || check.refundAmount) {
            totalRefunds += check.refundAmount || check.totalAmount || 0;
          }

          // Separate comps vs discounts using appliedDiscounts
          if (check.appliedDiscounts) {
            for (const d of check.appliedDiscounts) {
              const amt = d.discountAmount || 0;
              const name = (d.name || d.discountName || '').toLowerCase();
              const isComp = d.compsVoid || name.includes('comp') || name.includes('void') || name.includes('spill') || name.includes('remake');
              if (isComp) { totalComps += amt; }
              else { totalDiscounts += amt; }
            }
          }

          const checkTotal = check.totalAmount || 0;
          const checkTax = check.taxAmount || 0;
          totalNetSales += checkTotal - checkTax;
          totalGrossSales += checkTotal;

          if (order.openedDate && check.paidDate) {
            const opened = new Date(order.openedDate).getTime();
            const paid = new Date(check.paidDate).getTime();
            if (paid > opened) { turnTimeMs += paid - opened; turnTimeCount++; }
          }

          if (check.selections) {
            for (const item of check.selections) {
              // Voided selections count as comps
              if (item.voided && item.price) {
                totalComps += item.price;
              }

              // KDS fulfillment time
              if (item.fulfillmentStatus === 'READY' && item.modifiedDate) {
                const start = new Date(item.createdDate || order.openedDate).getTime();
                const end = new Date(item.modifiedDate).getTime();
                const mins = (end - start) / 60000;
                if (mins > 0 && mins < 120) { // sanity guard
                  kdsTimeMs += (end - start);
                  kdsCount++;
                  if (mins < 5) kdsUnder5++;
                  else if (mins < 10) kdsUnder10++;
                  else kdsOver10++;
                }
              }

              const categoryGuid = item.salesCategory?.guid || '';
              const category = categoryMap.get(categoryGuid) || item.salesCategory?.name || '';
              const amount = item.price || 0;
              if (category && isBeverageCategory(category)) { bevSales += amount; }
              else { foodSales += amount; }
            }
          }
        }
      }
    }

    if (orders.length < pageSize) break;
    page++;
    await delay(200);
  }

  const kdsTotal = kdsUnder5 + kdsUnder10 + kdsOver10;
  return {
    netSales: totalNetSales,
    grossSales: totalGrossSales,
    discounts: totalDiscounts,
    ordersCount,
    guests,
    tips: totalTips,
    comps: totalComps,
    refunds: totalRefunds,
    avgTurnTimeMins: turnTimeCount > 0 ? turnTimeMs / turnTimeCount / 60000 : 0,
    foodSales,
    bevSales,
    avgKdsTimeMins: kdsCount > 0 ? kdsTimeMs / kdsCount / 60000 : 0,
    kdsTicketCount: kdsCount,
    kdsTimeBreakdown: {
      under5: kdsTotal > 0 ? Math.round((kdsUnder5 / kdsTotal) * 100) : 0,
      under10: kdsTotal > 0 ? Math.round((kdsUnder10 / kdsTotal) * 100) : 0,
      over10: kdsTotal > 0 ? Math.round((kdsOver10 / kdsTotal) * 100) : 0,
    },
  };
}

// ── Labor: ERA /era/v1/labor (primary) with timeEntries fallback ─

function categorizeJob(jobName: string): 'boh' | 'foh' | 'other' {
  const lower = jobName.toLowerCase();
  if (lower.includes('cook') || lower.includes('kitchen') || lower.includes('dish') ||
      lower.includes('prep') || lower.includes('grill') || lower.includes('fry') || lower.includes('line')) return 'boh';
  if (lower.includes('server') || lower.includes('bartender') || lower.includes('host') ||
      lower.includes('busser') || lower.includes('runner')) return 'foh';
  return 'other';
}

async function fetchLaborData(
  token: string,
  restaurantGuid: string,
  dateRange: { start: string; end: string },
  totalSales: number,
) {
  const headers = toastHeaders(token, restaurantGuid);
  const defaults = { totalHours: 0, totalCost: 0, laborPercent: 0, bohLabor: { hours: 0, cost: 0 }, fohLabor: { hours: 0, cost: 0 }, salesPerLaborHour: 0, avgHourlyRate: 0 };

  // Try ERA first
  try {
    const createRes = await fetch('https://ws-api.toasttab.com/era/v1/labor', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        startDate: dateRange.start,
        endDate: dateRange.end,
        aggregationPeriod: 'day',
        groupBy: 'JOB',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      const reportGuid = createData.reportRequestGuid;

      if (reportGuid) {
        let reportData: any = null;
        for (let i = 0; i < 10; i++) {
          await delay(2000);
          const pollRes = await fetch(`https://ws-api.toasttab.com/era/v1/labor/${reportGuid}`, { headers });
          if (pollRes.status === 202) continue;
          if (pollRes.ok) { reportData = await pollRes.json(); break; }
          break;
        }

        if (reportData) {
          let totalHours = 0, totalCost = 0, bohHours = 0, bohCost = 0, fohHours = 0, fohCost = 0;
          let laborPercent = 0, splh = 0;

          const rows = reportData.data || reportData.rows || reportData;
          if (Array.isArray(rows)) {
            for (const row of rows) {
              const h = row.totalHours || 0;
              const c = row.totalCost || 0;
              const job = row.jobTitle || row.jobName || '';
              totalHours += h; totalCost += c;
              const cat = categorizeJob(job);
              if (cat === 'foh') { fohHours += h; fohCost += c; }
              if (cat === 'boh') { bohHours += h; bohCost += c; }
              if (row.totalCostPerNetSales != null && laborPercent === 0) laborPercent = row.totalCostPerNetSales * 100;
              if (row.netSalesPerEmployeeHour != null && splh === 0) splh = row.netSalesPerEmployeeHour;
            }
          }
          if (reportData.totalCostPerNetSales != null) laborPercent = reportData.totalCostPerNetSales * 100;
          if (reportData.netSalesPerEmployeeHour != null) splh = reportData.netSalesPerEmployeeHour;
          if (reportData.totalCost != null && totalCost === 0) totalCost = reportData.totalCost;
          if (reportData.totalHours != null && totalHours === 0) totalHours = reportData.totalHours;

          console.log(`[ERA-WIDGET] Labor: cost=$${totalCost}, pct=${laborPercent}%, splh=$${splh}`);

          return {
            totalHours, totalCost, laborPercent,
            bohLabor: { hours: bohHours, cost: bohCost },
            fohLabor: { hours: fohHours, cost: fohCost },
            salesPerLaborHour: splh || (totalHours > 0 ? totalSales / totalHours : 0),
            avgHourlyRate: totalHours > 0 ? totalCost / totalHours : 0,
          };
        }
      }
    } else {
      console.warn(`[ERA-WIDGET] Labor POST returned ${createRes.status} — falling back to timeEntries`);
    }
  } catch (err) {
    console.warn('[ERA-WIDGET] ERA labor failed, falling back:', err);
  }

  // Fallback: timeEntries
  try {
    const url = `https://ws-api.toasttab.com/labor/v1/timeEntries?startDate=${dateRange.start}T00:00:00.000Z&endDate=${dateRange.end}T23:59:59.999Z`;
    const response = await fetch(url, { headers });
    if (!response.ok) return defaults;
    const entries = await response.json();
    if (!Array.isArray(entries) || entries.length === 0) return defaults;

    let totalHours = 0, totalCost = 0, bohHours = 0, bohCost = 0, fohHours = 0, fohCost = 0;
    for (const entry of entries) {
      const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0);
      const cost = (entry.regularWages || 0) + (entry.overtimeWages || 0);
      const jobName = entry.jobTitle || entry.jobName || '';
      totalHours += hours; totalCost += cost;
      const cat = categorizeJob(jobName);
      if (cat === 'foh') { fohHours += hours; fohCost += cost; }
      if (cat === 'boh') { bohHours += hours; bohCost += cost; }
    }

    return {
      totalHours, totalCost,
      laborPercent: totalSales > 0 ? (totalCost / totalSales) * 100 : 0,
      bohLabor: { hours: bohHours, cost: bohCost },
      fohLabor: { hours: fohHours, cost: fohCost },
      salesPerLaborHour: totalHours > 0 ? totalSales / totalHours : 0,
      avgHourlyRate: totalHours > 0 ? totalCost / totalHours : 0,
    };
  } catch {
    return defaults;
  }
}

// ── Main handler ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let startDate: string | undefined, endDate: string | undefined, venueId: string | undefined;
    try {
      const body = await req.json();
      startDate = body.startDate;
      endDate = body.endDate;
      venueId = body.venueId;
    } catch { /* defaults */ }

    // Resolve restaurant GUID
    let restaurantGuid: string | undefined;
    if (venueId) {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: venue } = await supabaseAdmin.from('venues').select('toast_restaurant_guid').eq('id', venueId).single();
      restaurantGuid = venue?.toast_restaurant_guid || undefined;
    }
    if (!restaurantGuid) restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');
    if (!restaurantGuid) throw new Error('Restaurant configuration error');

    const dateRange = getDateRange(startDate, endDate);

    // Check cache
    if (!startDate && !endDate && cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getToastToken();

    // Fetch categories + order metrics in parallel
    const categoryMap = await fetchSalesCategories(token, restaurantGuid);
    const orderMetrics = await fetchOrderMetrics(token, restaurantGuid, dateRange, categoryMap);

    const netSales = orderMetrics.netSales;

    // Fetch labor data
    const laborData = await fetchLaborData(token, restaurantGuid, dateRange, netSales);

    // Fetch last year for YoY
    const lastYearRange = getLastYearDateRange(dateRange);
    let lastYearSales = 0;
    try {
      const lyCategories = await fetchSalesCategories(token, restaurantGuid);
      const lyMetrics = await fetchOrderMetrics(token, restaurantGuid, lastYearRange, lyCategories);
      lastYearSales = lyMetrics.netSales;
    } catch { /* ignore */ }

    const yoyChange = lastYearSales > 0 ? ((netSales - lastYearSales) / lastYearSales) * 100 : 0;
    const totalTickets = orderMetrics.ordersCount;
    const tipPercent = netSales > 0 ? (orderMetrics.tips / netSales) * 100 : 0;
    const compPercent = netSales > 0 ? (orderMetrics.comps / netSales) * 100 : 0;
    const discountPercent = netSales > 0 ? (orderMetrics.discounts / netSales) * 100 : 0;

    const total = orderMetrics.foodSales + orderMetrics.bevSales;
    const foodBevRatio = total > 0
      ? `${Math.round((orderMetrics.foodSales / total) * 100)}/${Math.round((orderMetrics.bevSales / total) * 100)}`
      : '0/0';

    const result = {
      sales: {
        weeklySales: netSales,
        lastYearSales,
        yearOverYearChange: yoyChange,
      },
      tips: { weeklyTipPercent: tipPercent, tipAmount: orderMetrics.tips },
      comps: { amount: orderMetrics.comps, percent: compPercent },
      discounts: { amount: orderMetrics.discounts, percent: discountPercent },
      refunds: { amount: orderMetrics.refunds, percent: netSales > 0 ? (orderMetrics.refunds / netSales) * 100 : 0 },
      tickets: {
        avgTicket: totalTickets > 0 ? netSales / totalTickets : 0,
        turnTimeMinutes: orderMetrics.avgTurnTimeMins,
        totalTickets,
        avgKdsTimeMins: orderMetrics.avgKdsTimeMins,
        kdsTicketCount: orderMetrics.kdsTicketCount,
        kdsTimeBreakdown: orderMetrics.kdsTimeBreakdown,
      },
      labor: laborData,
      menu: {
        foodSales: orderMetrics.foodSales,
        bevSales: orderMetrics.bevSales,
        foodBevRatio,
        topBeverages: [],
      },
      dateRange,
      lastUpdated: new Date().toISOString(),
      isLive: true,
    };

    if (!startDate && !endDate) {
      cache = { data: result, timestamp: Date.now() };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in toast-data function:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

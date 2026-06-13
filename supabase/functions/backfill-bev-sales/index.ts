import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToastAuthResponse {
  token: { accessToken: string; tokenType: string; expiresIn: number };
  status: string;
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
  if (data.status !== 'SUCCESS' || !data.token?.accessToken) throw new Error('Toast auth invalid response');
  return data.token.accessToken;
}

async function fetchSalesCategories(token: string, restaurantGuid: string): Promise<Map<string, string>> {
  const res = await fetch('https://ws-api.toasttab.com/config/v2/salesCategories', {
    headers: { 'Authorization': `Bearer ${token}`, 'Toast-Restaurant-External-ID': restaurantGuid },
  });
  if (!res.ok) return new Map();
  const categories = await res.json();
  const map = new Map<string, string>();
  for (const cat of categories) {
    if (cat.guid && cat.name) map.set(cat.guid, cat.name);
  }
  return map;
}

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

async function fetchOrdersForDate(token: string, restaurantGuid: string, date: string): Promise<unknown[]> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Toast-Restaurant-External-ID': restaurantGuid,
    'Content-Type': 'application/json',
  };
  const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${date}T00:00:00.000Z&endDate=${date}T23:59:59.999Z&pageSize=100`;
  const allOrders: unknown[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(`${url}&page=${page}`, { headers });
    if (!response.ok) {
      if (response.status === 429) { await new Promise(r => setTimeout(r, 500)); continue; }
      break;
    }
    const orders = await response.json();
    if (!orders.length) break;
    allOrders.push(...orders);
    if (orders.length < 100) break;
    page++;
  }
  return allOrders;
}

function computeBevFoodSales(orders: unknown[], categoryMap: Map<string, string>): { food_sales: number; bev_sales: number } {
  let foodSales = 0, bevSales = 0;

  for (const order of orders as Array<{ checks?: Array<{ selections?: Array<{ price?: number; salesCategory?: { guid?: string; name?: string } }> }> }>) {
    if (!order.checks) continue;
    for (const check of order.checks) {
      if (!check.selections) continue;
      for (const item of check.selections) {
        const categoryGuid = item.salesCategory?.guid || '';
        const category = categoryMap.get(categoryGuid) || item.salesCategory?.name || '';
        const amount = item.price || 0;
        if (category && isBeverageCategory(category)) {
          bevSales += amount;
        } else {
          foodSales += amount;
        }
      }
    }
  }

  return {
    food_sales: Math.round(foodSales * 100) / 100,
    bev_sales: Math.round(bevSales * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    const { bar_id, start_date, end_date } = await req.json();
    if (!bar_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: 'bar_id, start_date, end_date required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Resolve venue's Toast GUID - try bar_code first, then id
    let venue = null;
    const { data: v1 } = await supabase
      .from('venues')
      .select('id, bar_code, toast_restaurant_guid')
      .eq('bar_code', bar_id)
      .not('toast_restaurant_guid', 'is', null)
      .limit(1)
      .single();
    venue = v1;
    if (!venue) {
      const { data: v2 } = await supabase
        .from('venues')
        .select('id, bar_code, toast_restaurant_guid')
        .eq('id', bar_id)
        .not('toast_restaurant_guid', 'is', null)
        .limit(1)
        .single();
      venue = v2;
    }

    if (!venue?.toast_restaurant_guid) {
      return new Response(JSON.stringify({ error: `No Toast GUID for venue ${bar_id}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getToastToken();
    const categoryMap = await fetchSalesCategories(token, venue.toast_restaurant_guid);
    console.log(`[BACKFILL] ${bar_id} categories: ${[...categoryMap.values()].join(', ')}`);

    const barCode = venue.bar_code || venue.id;
    const start = new Date(start_date);
    const end = new Date(end_date);
    let updated = 0, errors = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      try {
        const orders = await fetchOrdersForDate(token, venue.toast_restaurant_guid, dateStr);
        if (orders.length === 0) continue;

        const { food_sales, bev_sales } = computeBevFoodSales(orders, categoryMap);

        const { error } = await supabase
          .from('daily_metrics')
          .update({ food_sales, bev_sales })
          .eq('bar_id', barCode)
          .eq('date', dateStr);

        if (error) {
          console.error(`[BACKFILL] Update error ${barCode}/${dateStr}:`, error.message);
          errors++;
        } else {
          console.log(`[BACKFILL] ${barCode}/${dateStr}: food=$${food_sales} bev=$${bev_sales}`);
          updated++;
        }
      } catch (err) {
        console.error(`[BACKFILL] ${barCode}/${dateStr}:`, err);
        errors++;
      }
      await new Promise(r => setTimeout(r, 150));
    }

    return new Response(JSON.stringify({ success: true, venue: barCode, updated, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[BACKFILL] Failed:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

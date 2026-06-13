import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getToastToken(clientId?: string, clientSecret?: string): Promise<string> {
  const cId = clientId || Deno.env.get('TOAST_CLIENT_ID');
  const cSec = clientSecret || Deno.env.get('TOAST_CLIENT_SECRET');
  if (!cId || !cSec) throw new Error('Toast credentials not configured');

  const response = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: cId, clientSecret: cSec, userAccessType: 'TOAST_MACHINE_CLIENT' }),
  });

  if (!response.ok) throw new Error(`Toast auth failed: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'SUCCESS' || !data.token?.accessToken) throw new Error('Toast auth failed');
  return data.token.accessToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;

  try {
    // Parse venue from body
    let venueId: string | undefined;
    try {
      const body = await req.json();
      venueId = body.venueId;
    } catch { /* defaults */ }

    // Look up venue Toast credentials
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    let restaurantGuid: string | undefined;
    let toastClientId: string | undefined;
    let toastClientSecret: string | undefined;

    if (venueId) {
      const { data: venue } = await supabaseAdmin
        .from('venues')
        .select('name, toast_restaurant_guid, toast_client_id, toast_client_secret')
        .eq('id', venueId)
        .single();
      
      if (venue) {
        restaurantGuid = venue.toast_restaurant_guid || undefined;
        toastClientId = venue.toast_client_id || undefined;
        toastClientSecret = venue.toast_client_secret || undefined;
        console.log(`[KDS-DIAG] Venue: ${venue.name}, GUID: ${restaurantGuid}`);
      }
    }

    if (!restaurantGuid) restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');
    if (!restaurantGuid) throw new Error('No restaurant GUID');

    const token = await getToastToken(toastClientId, toastClientSecret);

    // Fetch one page of recent orders
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 3); // Just 3 days for speed

    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const url = `https://ws-api.toasttab.com/orders/v2/ordersBulk?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z&pageSize=100&page=1`;

    const ordersRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantGuid,
        'Content-Type': 'application/json',
      },
    });

    if (!ordersRes.ok) {
      throw new Error(`Orders API returned ${ordersRes.status}: ${await ordersRes.text()}`);
    }

    const orders = await ordersRes.json();
    console.log(`[KDS-DIAG] Fetched ${orders.length} orders for ${startDate} to ${endDate}`);

    // Analyze all selections
    const statusCounts: Record<string, number> = {};
    const timestampFields: Set<string> = new Set();
    const sampleItems: any[] = [];
    let totalSelections = 0;
    let selectionsWithModifiedDate = 0;
    let selectionsWithCreatedDate = 0;

    for (const order of orders) {
      // Check order-level fields
      const orderKeys = Object.keys(order).filter(k => 
        k.toLowerCase().includes('kds') || 
        k.toLowerCase().includes('kitchen') ||
        k.toLowerCase().includes('fulfil') ||
        k.toLowerCase().includes('ticket')
      );
      if (orderKeys.length > 0) {
        console.log(`[KDS-DIAG] Order-level KDS fields: ${orderKeys.join(', ')}`);
      }

      if (!order.checks) continue;

      for (const check of order.checks) {
        // Check check-level fields
        const checkKeys = Object.keys(check).filter(k =>
          k.toLowerCase().includes('kds') ||
          k.toLowerCase().includes('kitchen') ||
          k.toLowerCase().includes('fulfil') ||
          k.toLowerCase().includes('ticket')
        );
        if (checkKeys.length > 0) {
          console.log(`[KDS-DIAG] Check-level KDS fields: ${JSON.stringify(checkKeys.map(k => ({ [k]: check[k] })))}`);
        }

        if (!check.selections) continue;

        for (const item of check.selections) {
          totalSelections++;

          // Track fulfillmentStatus
          const status = item.fulfillmentStatus || 'NONE';
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Track timestamp fields
          if (item.createdDate) { timestampFields.add('createdDate'); selectionsWithCreatedDate++; }
          if (item.modifiedDate) { timestampFields.add('modifiedDate'); selectionsWithModifiedDate++; }
          if (item.sentDate) timestampFields.add('sentDate');
          if (item.fulfilledDate) timestampFields.add('fulfilledDate');
          if (item.deferredDate) timestampFields.add('deferredDate');
          if (item.appliedDate) timestampFields.add('appliedDate');
          if (item.voidDate) timestampFields.add('voidDate');

          // Collect samples of non-NONE items
          if (sampleItems.length < 5 && status !== 'NONE') {
            sampleItems.push({
              fulfillmentStatus: item.fulfillmentStatus,
              createdDate: item.createdDate,
              modifiedDate: item.modifiedDate,
              sentDate: item.sentDate,
              fulfilledDate: item.fulfilledDate,
              voided: item.voided,
              displayName: item.displayName,
            });
          }

          // Also check for any other timestamp-like fields
          for (const [key, val] of Object.entries(item)) {
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val) && !timestampFields.has(key)) {
              timestampFields.add(key);
            }
          }
        }
      }
    }

    const result = {
      ordersAnalyzed: orders.length,
      totalSelections,
      dateRange: { start: startDate, end: endDate },
      fulfillmentStatusCounts: statusCounts,
      timestampFieldsFound: Array.from(timestampFields),
      selectionsWithCreatedDate,
      selectionsWithModifiedDate,
      sampleItems,
    };

    console.log(`[KDS-DIAG] Results: ${JSON.stringify(result, null, 2)}`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[KDS-DIAG] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

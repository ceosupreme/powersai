import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__
// Probe the Toast ANALYTICS API (/era/v1) to enumerate every restaurant
// in the management group. Uses the shared analytics credentials.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOAST_HOST = 'https://ws-api.toasttab.com';

async function getAnalyticsToken(): Promise<string> {
  const clientId = Deno.env.get('TOAST_ANALYTICS_CLIENT_ID');
  const clientSecret = Deno.env.get('TOAST_ANALYTICS_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('TOAST_ANALYTICS_CLIENT_ID/SECRET not configured');
  }
  const res = await fetch(`${TOAST_HOST}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }),
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = {}; }
  if (!res.ok || !parsed?.token?.accessToken) {
    throw new Error(`Auth failed (HTTP ${res.status}): ${text.slice(0, 400)}`);
  }
  return parsed.token.accessToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const __disabled = await guardIntegration('toast', corsHeaders);
  if (__disabled) return __disabled;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: venues, error: venuesErr } = await supabase
      .from('venues')
      .select('id, name, toast_restaurant_guid, toast_api_enabled')
      .order('name');
    if (venuesErr) throw new Error(`venues query failed: ${venuesErr.message}`);

    const token = await getAnalyticsToken();

    // Authoritative list of restaurants in the management group
    const r = await fetch(`${TOAST_HOST}/era/v1/restaurants-information`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const text = await r.text();
    let toastList: any = text;
    try { toastList = JSON.parse(text); } catch { /* keep text */ }

    if (!r.ok) {
      return new Response(JSON.stringify({
        error: `restaurants-information failed (HTTP ${r.status})`,
        body: toastList,
      }, null, 2), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build maps for reconciliation
    const ourByGuid = new Map<string, { id: string; name: string; enabled: boolean }>();
    const ourByName = new Map<string, { id: string; name: string; guid: string | null; enabled: boolean }>();
    for (const v of venues ?? []) {
      if (v.toast_restaurant_guid) {
        ourByGuid.set(v.toast_restaurant_guid, { id: v.id, name: v.name, enabled: !!v.toast_api_enabled });
      }
      ourByName.set(v.name.toLowerCase(), {
        id: v.id, name: v.name, guid: v.toast_restaurant_guid, enabled: !!v.toast_api_enabled,
      });
    }

    const reconciliation = (Array.isArray(toastList) ? toastList : []).map((t: any) => {
      const guid = t.guid ?? t.restaurantGuid ?? t.id;
      const name = t.restaurantName ?? t.name ?? null;
      const ourByG = guid ? ourByGuid.get(guid) : undefined;
      const ourByN = name ? ourByName.get(name.toLowerCase()) : undefined;
      return {
        toastGuid: guid,
        toastName: name,
        toastActive: t.activated ?? t.isActive ?? null,
        toastArchived: t.archived ?? null,
        toastTestMode: t.testMode ?? null,
        ourVenueByGuid: ourByG ? `${ourByG.name} (${ourByG.id}) enabled=${ourByG.enabled}` : null,
        ourVenueByName: ourByN ? `${ourByN.name} guid=${ourByN.guid} enabled=${ourByN.enabled}` : null,
        nameGuidMismatch: !!(ourByG && name && ourByG.name.toLowerCase() !== name.toLowerCase()),
      };
    });

    return new Response(JSON.stringify({
      toastRestaurantCount: Array.isArray(toastList) ? toastList.length : 0,
      reconciliation,
      rawToastListSample: Array.isArray(toastList) ? toastList.slice(0, 2) : toastList,
      ourVenues: (venues ?? []).map(v => ({
        id: v.id,
        name: v.name,
        guid: v.toast_restaurant_guid,
        enabled: v.toast_api_enabled,
      })),
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

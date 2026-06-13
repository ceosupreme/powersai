// map-pack-cron — weekly fan-out wrapper. Calls map-pack-run (no body) which
// already iterates every venue with active keywords. Kept as a separate
// entrypoint so pg_cron can target a stable URL and we have isolated logs.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Quick sanity: how many venues have active keywords today?
    const { data: venues, error } = await admin
      .from('map_pack_keywords')
      .select('venue_id')
      .eq('is_active', true);
    if (error) throw error;
    const venueCount = new Set((venues ?? []).map((v) => v.venue_id)).size;
    console.log(`[map-pack-cron] ${venueCount} venues have active keywords`);

    const r = await fetch(`${SUPABASE_URL}/functions/v1/map-pack-run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger_source: 'cron' }),
    });
    const body = await r.text();
    console.log(`[map-pack-cron] map-pack-run responded ${r.status}: ${body.slice(0, 300)}`);

    return new Response(JSON.stringify({ ok: r.ok, status: r.status, venues: venueCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[map-pack-cron]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

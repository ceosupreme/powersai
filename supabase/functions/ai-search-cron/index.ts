// ai-search-cron — weekly fan-out wrapper. Calls ai-search-run with no body
// so it iterates every venue with active queries.

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
    const { data: rows, error } = await admin.from('ai_search_queries')
      .select('venue_id').eq('is_active', true);
    if (error) throw error;
    const venueCount = new Set((rows ?? []).map((r) => r.venue_id)).size;
    console.log(`[ai-search-cron] ${venueCount} venues have active queries`);

    const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-search-run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger_source: 'cron' }),
    });
    const body = await r.text();
    console.log(`[ai-search-cron] ai-search-run responded ${r.status}: ${body.slice(0, 300)}`);
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, venues: venueCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ai-search-cron]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

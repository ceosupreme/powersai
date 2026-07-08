// growth-audit-cron
// Scheduled fan-out to growth-audit-refresh for every venue with
// growth_audit_enabled=true on its execution adapter.
// Errors per venue are logged but never abort the sweep.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: adapters, error } = await admin
      .from('venue_execution_adapters')
      .select('venue_id, venues!inner(is_prospect_shell)')
      .eq('growth_audit_enabled', true);
    if (error) throw error;

    // Exclude prospect shells — public-audit pipeline runs the growth audit
    // exactly once per shell; recurring cron must never re-hit them.
    const venueIds = Array.from(new Set(
      (adapters ?? [])
        .filter((a: any) => a.venues && a.venues.is_prospect_shell === false)
        .map((a: any) => a.venue_id),
    ));
    console.log(`[growth-audit-cron] ${venueIds.length} venues queued`);

    const results: any[] = [];
    for (const venueId of venueIds) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/growth-audit-refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ venue_id: venueId }),
        });
        const ok = r.ok;
        const text = await r.text();
        console.log(`[growth-audit-cron] ${venueId}: ${r.status} ${ok ? 'ok' : text.slice(0, 200)}`);
        results.push({ venue_id: venueId, status: r.status, ok });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[growth-audit-cron] ${venueId} threw:`, msg);
        results.push({ venue_id: venueId, error: msg });
      }
      await sleep(1000); // stagger to spread DB / AI load
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[growth-audit-cron]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

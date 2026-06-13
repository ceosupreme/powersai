// website-crawl-dispatcher — fan out per-venue weekly crawl OR daily PSI calls
// with stagger. Cron invokes this once; this function enqueues the per-venue
// invocations via background HTTP calls (fire-and-forget) so each one runs in
// its own edge function and respects the 150s limit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: { mode?: 'weekly' | 'daily'; stagger_ms?: number } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const mode = body.mode || 'weekly';
  const stagger = body.stagger_ms ?? 30_000;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: mappings } = await supabase
    .from('website_mappings')
    .select('venue_id, manual_only, website_url, canonical_url')
    .eq('manual_only', false);

  const eligible = (mappings || []).filter((m) => m.canonical_url || m.website_url);
  const fnName = mode === 'daily' ? 'website-pagespeed-daily' : 'website-crawl-weekly';
  const dispatched: string[] = [];

  for (let i = 0; i < eligible.length; i++) {
    const m = eligible[i];
    const delay = i * stagger;
    queueMicrotask(async () => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ venue_id: m.venue_id }),
        });
      } catch (e) {
        console.error(`[website-crawl-dispatcher] ${fnName} ${m.venue_id} failed`, (e as Error).message);
      }
    });
    dispatched.push(m.venue_id);
  }

  return new Response(JSON.stringify({ ok: true, mode, dispatched: dispatched.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

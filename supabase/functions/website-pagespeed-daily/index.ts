// website-pagespeed-daily — lightweight Core Web Vitals snapshot for one venue.
// Uses Google PageSpeed Insights v5 (mobile strategy). API key reuses
// GOOGLE_PLACES_API_KEY (must be unrestricted or have PageSpeed enabled).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchWithTimeout } from '../_shared/website-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: { venue_id?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const venueId = body.venue_id;
  if (!venueId) {
    return new Response(JSON.stringify({ error: 'venue_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = (Deno.env.get('GOOGLE_PAGESPEED_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || '').trim();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: mapping } = await supabase
    .from('website_mappings')
    .select('canonical_url, website_url, manual_only')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (!mapping || mapping.manual_only) {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const target = mapping.canonical_url || mapping.website_url;
  if (!target) {
    return new Response(JSON.stringify({ skipped: true, reason: 'no url' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const params = new URLSearchParams({
      url: target,
      strategy: 'mobile',
      category: 'PERFORMANCE',
    });
    if (apiKey) params.set('key', apiKey);
    const res = await fetchWithTimeout(`${PSI_URL}?${params}`);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`PSI ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const lh = data?.lighthouseResult;
    const audits = lh?.audits || {};
    const perf = lh?.categories?.performance?.score;
    const lcp = audits['largest-contentful-paint']?.numericValue;
    const cls = audits['cumulative-layout-shift']?.numericValue;
    const inp = audits['interaction-to-next-paint']?.numericValue
      ?? audits['experimental-interaction-to-next-paint']?.numericValue;
    const mobileFriendly = (audits['viewport']?.score ?? 1) >= 0.9;

    const { data: snap, error } = await supabase
      .from('website_snapshots')
      .insert({
        venue_id: venueId,
        source: 'automated',
        scope: 'daily_pagespeed',
        https_enabled: target.startsWith('https://'),
        mobile_friendly: mobileFriendly,
        perf_score: typeof perf === 'number' ? Math.round(perf * 100) : null,
        lcp_ms: typeof lcp === 'number' ? Math.round(lcp) : null,
        cls: typeof cls === 'number' ? Number(cls.toFixed(3)) : null,
        inp_ms: typeof inp === 'number' ? Math.round(inp) : null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({ ok: true, snapshot_id: snap.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from('website_snapshots').insert({
      venue_id: venueId, source: 'automated', scope: 'daily_pagespeed', fetch_error: msg.slice(0, 500),
    });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// website-crawl-weekly — full website audit for ONE venue per invocation.
// Mirrors the gbp-sync-weekly cadence: dispatcher loops venues with stagger.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  crawlSite, deriveInventory, aggregateSeo, normalizeUrl, detectCms,
} from '../_shared/website-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: mapping } = await supabase
    .from('website_mappings')
    .select('venue_id, website_url, canonical_url, manual_only, consecutive_fetch_failures')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (!mapping || mapping.manual_only) {
    return new Response(JSON.stringify({ skipped: true, reason: !mapping ? 'no mapping' : 'manual_only' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const root = mapping.canonical_url || mapping.website_url;
  if (!root) {
    return new Response(JSON.stringify({ skipped: true, reason: 'no website_url' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const homeUrl = normalizeUrl(root);
  const httpsEnabled = homeUrl.startsWith('https://');

  try {
    const result = await crawlSite(homeUrl);
    const inv = deriveInventory(result.pages, homeUrl, result.homeHtml);
    const seo = aggregateSeo(result.pages);
    const cms = result.homeHtml ? detectCms(result.homeHtml) : null;

    const snapshot = {
      venue_id: venueId,
      source: 'automated',
      scope: 'weekly_full',
      http_status: result.homeStatus,
      response_ms: result.homeMs,
      https_enabled: httpsEnabled,
      sitemap_present: result.pages.length > 1,
      robots_present: true,
      robots_allows_crawl: result.fetchError !== 'robots.txt disallows crawl',
      discovered_page_count: result.pages.length,
      mobile_friendly: null,
      cms_detected: cms,
      fetch_error: result.fetchError,
      ...inv,
      ...seo,
    };

    const { data: snapRow, error: snapErr } = await supabase
      .from('website_snapshots')
      .insert(snapshot)
      .select('id')
      .single();
    if (snapErr) throw new Error(`snapshot insert: ${snapErr.message}`);

    if (result.pages.length) {
      const pageRows = result.pages.map((p) => ({
        snapshot_id: snapRow.id,
        venue_id: venueId,
        url: p.url,
        http_status: p.http_status,
        title: p.title,
        title_len: p.title_len,
        meta_description: p.meta_description,
        meta_description_len: p.meta_description_len,
        h1_text: p.h1_text,
        h1_count: p.h1_count,
        image_count: p.image_count,
        images_with_alt: p.images_with_alt,
        schema_types: p.schema_types,
        word_count: p.word_count,
        internal_link_count: p.internal_link_count,
        last_modified: p.last_modified,
        page_kind: p.page_kind,
      }));
      const { error: pgErr } = await supabase.from('website_pages').insert(pageRows);
      if (pgErr) console.error('website_pages insert error', pgErr.message);
    }

    // Update mapping (cms + js_heavy + failures)
    const failureBump = result.fetchError ? (mapping.consecutive_fetch_failures || 0) + 1 : 0;
    await supabase.from('website_mappings').update({
      cms_detected: cms ?? mapping.canonical_url, // keep existing cms if not detected
      js_heavy: result.jsHeavy,
      consecutive_fetch_failures: failureBump,
    }).eq('venue_id', venueId);

    return new Response(JSON.stringify({
      ok: true, snapshot_id: snapRow.id, pages: result.pages.length,
      js_heavy: result.jsHeavy, fetch_error: result.fetchError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from('website_snapshots').insert({
      venue_id: venueId, source: 'automated', scope: 'weekly_full',
      fetch_error: msg.slice(0, 500), https_enabled: httpsEnabled,
    });
    await supabase.from('website_mappings').update({
      consecutive_fetch_failures: (mapping.consecutive_fetch_failures || 0) + 1,
    }).eq('venue_id', venueId);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

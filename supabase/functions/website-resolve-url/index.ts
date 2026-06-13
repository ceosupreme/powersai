// website-resolve-url — admin/owner-triggered. Validates a venue's website URL
// is reachable, follows redirects to a canonical URL, and detects the CMS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCanonical, fetchWithTimeout, detectCms } from '../_shared/website-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: { venue_id?: string; website_url?: string; persist?: boolean } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId = body.venue_id;
  let websiteUrl = (body.website_url || '').trim();
  const persist = body.persist !== false;
  if (!venueId) {
    return new Response(JSON.stringify({ error: 'venue_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fallback: use the saved mapping's website_url if caller didn't supply one.
  if (!websiteUrl) {
    const { data: existing } = await supabase
      .from('website_mappings')
      .select('website_url')
      .eq('venue_id', venueId)
      .maybeSingle();
    websiteUrl = (existing?.website_url || '').trim();
  }
  if (!websiteUrl) {
    return new Response(JSON.stringify({ error: 'No website_url provided and none saved for this venue' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!/^https?:\/\//i.test(websiteUrl)) websiteUrl = `https://${websiteUrl}`;

  try {
    const { canonical, status, ms } = await resolveCanonical(websiteUrl);
    if (status >= 400) {
      if (persist) {
        await supabase.from('website_mappings').upsert({
          venue_id: venueId,
          website_url: websiteUrl,
          last_resolve_error: `HTTP ${status}`,
          last_resolved_at: new Date().toISOString(),
        }, { onConflict: 'venue_id' });
      }
      return new Response(JSON.stringify({ error: `HTTP ${status}`, status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let cms: string | null = null;
    try {
      const res = await fetchWithTimeout(canonical);
      const html = await res.text();
      cms = detectCms(html);
    } catch { /* ignore */ }

    if (persist) {
      await supabase.from('website_mappings').upsert({
        venue_id: venueId,
        website_url: websiteUrl,
        canonical_url: canonical,
        cms_detected: cms,
        last_resolved_at: new Date().toISOString(),
        last_resolve_error: null,
      }, { onConflict: 'venue_id' });
    }
    return new Response(JSON.stringify({ canonical_url: canonical, canonical, status, ms, cms }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (persist) {
      await supabase.from('website_mappings').upsert({
        venue_id: venueId,
        website_url: websiteUrl,
        last_resolve_error: msg.slice(0, 500),
        last_resolved_at: new Date().toISOString(),
      }, { onConflict: 'venue_id' });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

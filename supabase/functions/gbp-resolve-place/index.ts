// gbp-resolve-place — admin-triggered helper to resolve a venue's
// Google Business Profile to a Places API id, given either a Google Maps
// URL (place_id query string) or a free-text query.

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  extractPlaceIdFromUrl,
  resolvePlaceByText,
  fetchPlace,
} from '../_shared/gbp-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const apiKey = (Deno.env.get('GOOGLE_PLACES_API_KEY') || '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId: string | undefined = body.venue_id;
  const url: string | undefined = body.url;
  const query: string | undefined = body.query;
  const persist: boolean = body.persist !== false; // default true

  if (!venueId) {
    return new Response(JSON.stringify({ error: 'venue_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!url && !query) {
    return new Response(JSON.stringify({ error: 'url or query is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Step 1: try to extract place_id from URL directly.
  let placeId = url ? extractPlaceIdFromUrl(url) : null;
  let resolvedName: string | undefined;
  let resolvedAddress: string | undefined;

  // Step 2: if we have a place_id, validate it via a lightweight fetch.
  if (placeId) {
    const verify = await fetchPlace(placeId, 'daily_basics', apiKey);
    if (verify.ok) {
      resolvedName = verify.data?.displayName?.text;
      resolvedAddress = verify.data?.formattedAddress;
    } else {
      placeId = null; // fall through to text search
    }
  }

  // Step 3: text search fallback (also handles maps URLs without place_id).
  if (!placeId) {
    const textQuery = query || url || '';
    const result = await resolvePlaceByText(textQuery, apiKey);
    if (result.error || !result.id) {
      const errMsg = result.error || 'No results';
      if (persist) {
        await supabase.from('gbp_place_mappings').upsert({
          venue_id: venueId,
          last_resolve_error: errMsg.slice(0, 500),
        }, { onConflict: 'venue_id' });
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    placeId = result.id;
    resolvedName = result.name;
    resolvedAddress = result.address;
  }

  if (persist) {
    await supabase.from('gbp_place_mappings').upsert({
      venue_id: venueId,
      place_id: placeId,
      last_resolved_at: new Date().toISOString(),
      last_resolve_error: null,
      consecutive_fetch_failures: 0,
    }, { onConflict: 'venue_id' });
  }

  return new Response(JSON.stringify({
    place_id: placeId,
    name: resolvedName,
    address: resolvedAddress,
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

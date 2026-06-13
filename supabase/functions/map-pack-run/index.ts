// map-pack-run — query Google Places Text Search for active keywords and
// persist a snapshot row per (venue, keyword). Used by both the weekly cron
// and the admin "Trigger Now" button.
//
// Body (all optional):
//   { venue_id?, keyword_id?, trigger_source?: 'cron'|'manual'|'admin' }
// - venue_id alone: process all active keywords for that venue.
// - venue_id + keyword_id: re-query a single keyword.
// - no args: process every venue with active keywords (used by cron).
//
// Manual triggers go through the venue rate-limit gate (1h per venue) unless
// trigger_source==='cron'.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress';
const PER_KEYWORD_DELAY_MS = 1000;
const PER_VENUE_DELAY_MS = 30_000;
const MANUAL_RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESULTS_TO_SCAN = 20;

type Keyword = {
  id: string;
  venue_id: string;
  keyword: string;
  priority: string;
  consecutive_failures: number;
};

type Venue = { id: string; name: string; lat: number | null; lng: number | null };

async function queryPlace(
  apiKey: string,
  keyword: string,
  lat: number | null,
  lng: number | null,
): Promise<{ places: Array<{ id: string; name: string; address: string }>; error?: string }> {
  const reqBody: any = {
    textQuery: keyword,
    maxResultCount: MAX_RESULTS_TO_SCAN,
  };
  if (typeof lat === 'number' && typeof lng === 'number') {
    reqBody.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
    };
  }
  const res = await fetch(TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) {
    const text = await res.text();
    return { places: [], error: `${res.status}: ${text.slice(0, 200)}` };
  }
  const data = await res.json();
  const places = (data.places ?? []).map((p: any) => ({
    id: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
  }));
  return { places };
}

async function processKeyword(
  admin: any,
  apiKey: string,
  venue: Venue,
  placeId: string | null,
  kw: Keyword,
): Promise<{ ok: boolean; error?: string }> {
  const { places, error } = await queryPlace(apiKey, kw.keyword, venue.lat, venue.lng);

  let rank: number | null = null;
  let competitors: Array<{ place_id: string; name: string; rank: number }> = [];

  if (!error && places.length) {
    if (placeId) {
      const idx = places.findIndex((p) => p.id === placeId);
      rank = idx >= 0 ? idx + 1 : null;
    }
    competitors = places
      .filter((p) => p.id !== placeId)
      .slice(0, 3)
      .map((p, i) => ({
        place_id: p.id,
        name: p.name,
        rank: places.indexOf(p) + 1,
      }));
  }

  const insertRes = await admin.from('map_pack_snapshots').insert({
    venue_id: venue.id,
    keyword_id: kw.id,
    keyword: kw.keyword,
    rank,
    total_results: places.length,
    query_lat: venue.lat,
    query_lng: venue.lng,
    top_competitors: competitors,
    query_error: error ?? null,
  });
  if (insertRes.error) return { ok: false, error: insertRes.error.message };

  await admin.from('map_pack_keywords').update({
    last_checked_at: new Date().toISOString(),
    consecutive_failures: error ? kw.consecutive_failures + 1 : 0,
  }).eq('id', kw.id);

  return { ok: !error, error };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = (Deno.env.get('GOOGLE_PLACES_API_KEY') || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) return json(500, { error: 'GOOGLE_PLACES_API_KEY not configured' });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const venueId: string | null = typeof body.venue_id === 'string' ? body.venue_id : null;
  const keywordId: string | null = typeof body.keyword_id === 'string' ? body.keyword_id : null;
  const triggerSource: string = body.trigger_source === 'cron' ? 'cron' : body.trigger_source === 'admin' ? 'admin' : 'manual';

  // For manual/admin triggers, require admin auth
  let userId: string | null = null;
  if (triggerSource !== 'cron') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await userClient.auth.getClaims(token);
    userId = (claims?.claims?.sub as string) ?? null;
    if (!userId) return json(401, { error: 'Invalid session' });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (userId) {
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json(403, { error: 'Admin role required' });
  }

  // Manual rate-limit per venue
  if (triggerSource === 'manual' && venueId) {
    const { data: trig } = await admin
      .from('map_pack_trigger_log')
      .select('last_triggered_at')
      .eq('venue_id', venueId)
      .maybeSingle();
    if (trig?.last_triggered_at) {
      const elapsed = Date.now() - Date.parse(trig.last_triggered_at);
      if (elapsed < MANUAL_RATE_LIMIT_MS) {
        const minsLeft = Math.ceil((MANUAL_RATE_LIMIT_MS - elapsed) / 60_000);
        return json(429, {
          error: `Rate limited. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`,
          retry_after_minutes: minsLeft,
        });
      }
    }
    await admin.from('map_pack_trigger_log').upsert({
      venue_id: venueId,
      last_triggered_at: new Date().toISOString(),
      triggered_by: userId,
    }, { onConflict: 'venue_id' });
  }

  // Build target list
  const venueQuery = admin
    .from('venues')
    .select('id, name, lat, lng');
  const { data: allVenues, error: venueErr } = venueId
    ? await venueQuery.eq('id', venueId)
    : await venueQuery.eq('is_active', true);
  if (venueErr) return json(500, { error: venueErr.message });

  const kwQuery = admin
    .from('map_pack_keywords')
    .select('id, venue_id, keyword, priority, consecutive_failures')
    .eq('is_active', true);
  if (keywordId) kwQuery.eq('id', keywordId);
  else if (venueId) kwQuery.eq('venue_id', venueId);
  const { data: kwRows, error: kwErr } = await kwQuery;
  if (kwErr) return json(500, { error: kwErr.message });

  const venuesById = new Map<string, Venue>();
  for (const v of (allVenues ?? []) as Venue[]) venuesById.set(v.id, v);

  // Group keywords by venue
  const byVenue = new Map<string, Keyword[]>();
  for (const k of (kwRows ?? []) as Keyword[]) {
    if (!venuesById.has(k.venue_id)) continue;
    if (!byVenue.has(k.venue_id)) byVenue.set(k.venue_id, []);
    byVenue.get(k.venue_id)!.push(k);
  }

  // Load place mappings up-front
  const venueIds = [...byVenue.keys()];
  const { data: mappings } = await admin
    .from('gbp_place_mappings')
    .select('venue_id, place_id')
    .in('venue_id', venueIds.length ? venueIds : ['00000000-0000-0000-0000-000000000000']);
  const placeIdByVenue = new Map<string, string | null>();
  for (const m of (mappings ?? []) as Array<{ venue_id: string; place_id: string | null }>) {
    placeIdByVenue.set(m.venue_id, m.place_id);
  }

  // Run-log row
  const { data: runRow } = await admin.from('map_pack_run_log').insert({
    trigger_source: triggerSource,
  }).select('id').single();
  const runId = runRow?.id;

  let venuesProcessed = 0;
  let keywordsQueried = 0;
  const errors: Array<{ venue_id: string; keyword: string; error: string }> = [];

  let venueIdx = 0;
  for (const [vid, kws] of byVenue) {
    const venue = venuesById.get(vid)!;
    if (venueIdx > 0) await sleep(PER_VENUE_DELAY_MS);
    venueIdx++;
    venuesProcessed++;
    const placeId = placeIdByVenue.get(vid) ?? null;

    let kwIdx = 0;
    for (const kw of kws) {
      if (kwIdx > 0) await sleep(PER_KEYWORD_DELAY_MS);
      kwIdx++;
      keywordsQueried++;
      try {
        const r = await processKeyword(admin, apiKey, venue, placeId, kw);
        if (!r.ok && r.error) errors.push({ venue_id: vid, keyword: kw.keyword, error: r.error });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ venue_id: vid, keyword: kw.keyword, error: msg });
        await admin.from('map_pack_keywords').update({
          consecutive_failures: kw.consecutive_failures + 1,
        }).eq('id', kw.id);
      }
    }
  }

  if (runId) {
    await admin.from('map_pack_run_log').update({
      finished_at: new Date().toISOString(),
      venues_processed: venuesProcessed,
      keywords_queried: keywordsQueried,
      errors,
    }).eq('id', runId);
  }

  return json(200, {
    ok: true, venues_processed: venuesProcessed, keywords_queried: keywordsQueried, errors,
  });
});

// gbp-sync-daily — pulls a lightweight GBP snapshot for every venue
// that has a place_id configured. Runs daily at 06:30 PT.
//
// Per-venue try/catch: failures increment consecutive_fetch_failures and
// are logged to sync_runs but never crash the loop. 30s stagger between
// venues to respect Places API rate limits.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchPlace, buildSnapshotFields, type VenueRecord } from '../_shared/gbp-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STAGGER_MS = 30_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const apiKey = (Deno.env.get('GOOGLE_PLACES_API_KEY') || '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: any = {};
  if (req.method === 'POST') {
    try { body = await req.json(); } catch { /* empty */ }
  }
  const onlyVenueId: string | undefined = body.venue_id;
  const stagger = body.no_stagger ? 0 : STAGGER_MS;
  const sourceKind: string = typeof body.source_kind === 'string' ? body.source_kind : 'managed';

  // Load venues with a place_id. Source = mapping table first, fall back
  // to legacy venues.google_place_id for venues that haven't been migrated.
  let query = supabase
    .from('venues')
    .select('id, name, address, google_place_id, gbp_place_mappings(place_id, manual_only)')
    .eq('is_active', true);
  if (onlyVenueId) {
    query = query.eq('id', onlyVenueId);
  } else {
    query = query.eq('is_prospect_shell', false);
  }
  const { data: venues, error: vErr } = await query;
  if (vErr) {
    return new Response(JSON.stringify({ error: vErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targets = (venues ?? [])
    .map((v: any) => {
      const mapping = Array.isArray(v.gbp_place_mappings) ? v.gbp_place_mappings[0] : v.gbp_place_mappings;
      const placeId = mapping?.place_id || v.google_place_id;
      return { v, placeId, manualOnly: !!mapping?.manual_only };
    })
    .filter((t) => t.placeId && !t.manualOnly);

  console.log(`[gbp-sync-daily] processing ${targets.length} venues`);

  const results: any[] = [];

  for (let i = 0; i < targets.length; i++) {
    const { v, placeId } = targets[i];
    if (i > 0 && stagger) await new Promise((r) => setTimeout(r, stagger));

    const { data: runRow } = await supabase
      .from('sync_runs')
      .insert({ bar_id: v.id, sync_type: 'gbp_daily', status: 'running' })
      .select('id')
      .single();
    const runId = runRow?.id;

    try {
      const venueRec: VenueRecord = { id: v.id, name: v.name, address: v.address };
      const fetchRes = await fetchPlace(placeId, 'daily_basics', apiKey);

      if (!fetchRes.ok) {
        await supabase.from('gbp_snapshots').insert({
          venue_id: v.id, source: 'automated', scope: 'daily_basics',
          source_kind: sourceKind,
          fetch_error: fetchRes.error?.slice(0, 500),
        });
        const { data: cur } = await supabase
          .from('gbp_place_mappings')
          .select('consecutive_fetch_failures')
          .eq('venue_id', v.id)
          .maybeSingle();
        await supabase
          .from('gbp_place_mappings')
          .upsert({
            venue_id: v.id,
            place_id: placeId,
            consecutive_fetch_failures: (cur?.consecutive_fetch_failures ?? 0) + 1,
            last_resolve_error: fetchRes.error?.slice(0, 500) ?? null,
          }, { onConflict: 'venue_id' });
        if (runId) {
          await supabase.from('sync_runs')
            .update({ status: 'failed', error_message: fetchRes.error, completed_at: new Date().toISOString() })
            .eq('id', runId);
        }
        results.push({ venue: v.name, ok: false, error: fetchRes.error });
        continue;
      }

      const fields = buildSnapshotFields(fetchRes.data, 'daily_basics', venueRec);
      const { error: insErr } = await supabase.from('gbp_snapshots').insert({
        venue_id: v.id,
        source: 'automated',
        scope: 'daily_basics',
        source_kind: sourceKind,
        ...fields,
        raw: fetchRes.data,
      });
      if (insErr) throw insErr;

      // Reset failure counter and stamp resolved time.
      await supabase
        .from('gbp_place_mappings')
        .upsert({
          venue_id: v.id,
          place_id: placeId,
          consecutive_fetch_failures: 0,
          last_resolved_at: new Date().toISOString(),
          last_resolve_error: null,
        }, { onConflict: 'venue_id' });

      if (runId) {
        await supabase.from('sync_runs')
          .update({ status: 'completed', records_created: 1, completed_at: new Date().toISOString() })
          .eq('id', runId);
      }
      results.push({ venue: v.name, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[gbp-sync-daily] ${v.name} failed:`, msg);
      if (runId) {
        await supabase.from('sync_runs')
          .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
          .eq('id', runId);
      }
      results.push({ venue: v.name, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ processed: targets.length, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

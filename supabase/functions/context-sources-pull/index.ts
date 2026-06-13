// context-sources-pull
// Dispatcher that runs every registered ContextSourceAdapter for a venue (or
// for all active venues), upserts results into context_items, and records a
// row per (venue, source) into context_source_runs. Failures in one adapter
// never kill the others.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ALL_CONTEXT_SOURCES, type VenueRow } from '../_shared/context-sources/index.ts';
import { guardIntegration } from '../_shared/integration-disabled.ts'; // __PHASE1_INTEGRATION_GUARD__

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const __disabled = await guardIntegration('local_context', corsHeaders);
  if (__disabled) return __disabled;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const { venue_id, source_type } = body ?? {};

    let venues: VenueRow[] = [];
    if (venue_id) {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, state, lat, lng, timezone')
        .eq('id', venue_id)
        .maybeSingle();
      if (error) throw error;
      if (data) venues = [data as VenueRow];
    } else {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, city, state, lat, lng, timezone')
        .eq('is_active', true);
      if (error) throw error;
      venues = (data ?? []) as VenueRow[];
    }

    const adapters = source_type
      ? ALL_CONTEXT_SOURCES.filter((a) => a.id === source_type)
      : ALL_CONTEXT_SOURCES;

    const summary: Record<string, any> = {};

    for (const venue of venues) {
      summary[venue.id] = { venue: venue.name, sources: {} };
      for (const adapter of adapters) {
        const { data: runRow, error: runErr } = await supabase
          .from('context_source_runs')
          .insert({ source_type: adapter.id, venue_id: venue.id, status: 'running' })
          .select('id')
          .single();
        if (runErr) {
          console.error(`[context-pull] open run ${adapter.id}:`, runErr.message);
          continue;
        }
        const t0 = Date.now();
        try {
          const { items, errors } = await adapter.pull(supabase, venue);
          let upserted = 0;
          if (items.length > 0) {
            const rows = items.map((it) => ({
              venue_id: venue.id,
              source_type: it.source_type,
              source_ref: it.source_ref,
              event_date: it.event_date,
              valid_until: it.valid_until ?? null,
              payload: it.payload,
              relevance_score: (it.payload?.historical_relevance_score as number) ?? null,
            }));
            const { error: upErr } = await supabase
              .from('context_items')
              .upsert(rows, { onConflict: 'venue_id,source_type,source_ref' });
            if (upErr) errors.push(`upsert: ${upErr.message}`);
            else upserted = rows.length;
          }
          await supabase.from('context_source_runs').update({
            status: errors.length === 0 ? 'success' : (upserted > 0 ? 'partial' : 'failed'),
            completed_at: new Date().toISOString(),
            items_fetched: upserted,
            error_text: errors.length > 0 ? errors.join(' | ').slice(0, 1000) : null,
          }).eq('id', runRow.id);
          summary[venue.id].sources[adapter.id] = {
            items: upserted, errors: errors.length, ms: Date.now() - t0,
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await supabase.from('context_source_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_text: msg.slice(0, 1000),
          }).eq('id', runRow.id);
          summary[venue.id].sources[adapter.id] = { items: 0, errors: 1, ms: Date.now() - t0, error: msg };
        }
      }
    }

    return json({ ok: true, venues: venues.length, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[context-sources-pull]', msg);
    return json({ error: msg }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

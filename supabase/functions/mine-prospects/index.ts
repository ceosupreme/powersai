// mine-prospects — Lane A of The Miner. Operator-triggered (button only; no
// cron in this phase). Queries Google Places v1 Text Search for a niche + city,
// filters to real operating businesses, upserts public.prospects (dedupe on
// place_id) and writes one public.miner_runs row per action.
//
// Auth: OPTIONS answered before any auth work; verify_jwt=false at the gateway
// with the full chain enforced in code (bearer -> getClaims -> operator/admin).
//
// Places key: GOOGLE_PLACES_API_KEY — the same secret gbp-resolve-place,
// map-pack-run, gbp-sync-* and search-google-place already use.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const Body = z.object({
  niche: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(120),
  max_results: z.number().int().min(10).max(40).default(20),
});

const MIN_REVIEWS = 3;

Deno.serve(async (req) => {
  // ── CORS preflight, before ANY auth work ──────────────────────────────
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ── In-code auth chain ────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'missing_auth' }, 401);
  const token = authHeader.slice('Bearer '.length).trim();

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
  const userId = claimsRes?.claims?.sub as string | undefined;
  if (claimsErr || !userId) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roles, error: roleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (roleErr) return json({ error: roleErr.message }, 500);
  const isOperator = (roles ?? []).some((r: { role: string }) => r.role !== 'client');
  if (!isOperator) return json({ error: 'forbidden' }, 403);

  // ── Input ─────────────────────────────────────────────────────────────
  let raw: unknown = {};
  try { raw = await req.json(); } catch { /* empty */ }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { niche, city, max_results } = parsed.data;

  const apiKey = (Deno.env.get('GOOGLE_PLACES_API_KEY') || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

  const { data: typeRow } = await admin
    .from('project_types')
    .select('id,label')
    .eq('id', niche)
    .maybeSingle();
  if (!typeRow) return json({ error: 'unknown_niche' }, 400);

  // ── Run row ───────────────────────────────────────────────────────────
  const { data: run, error: runErr } = await admin
    .from('miner_runs')
    .insert({
      niche,
      city,
      requested: max_results,
      status: 'running',
      triggered_by: userId,
    })
    .select('id')
    .single();
  if (runErr || !run) return json({ error: runErr?.message ?? 'run_insert_failed' }, 500);
  const runId = run.id as string;

  const fail = async (message: string) => {
    await admin
      .from('miner_runs')
      .update({ status: 'failed', error: message.slice(0, 500), finished_at: new Date().toISOString() })
      .eq('id', runId);
    return json({ error: message, miner_run_id: runId }, 502);
  };

  try {
    const textQuery = `${(typeRow as { label: string }).label} in ${city}`;
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.rating',
          'places.userRatingCount',
          'places.businessStatus',
          'places.primaryType',
          'places.types',
        ].join(','),
      },
      body: JSON.stringify({ textQuery, maxResultCount: Math.min(20, max_results) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return await fail(String(data?.error?.message ?? `places_http_${res.status}`));
    }

    const places: any[] = Array.isArray(data?.places) ? data.places : [];
    const found = places.length;

    const kept = places
      .filter((p) => p?.businessStatus === 'OPERATIONAL')
      .filter((p) => Number(p?.userRatingCount ?? 0) >= MIN_REVIEWS)
      .slice(0, max_results);

    let inserted = 0;
    const prospectIds: string[] = [];

    for (const p of kept) {
      const row = {
        source: 'places',
        niche,
        city,
        business_name: p?.displayName?.text ?? 'Unknown business',
        place_id: p?.id ?? null,
        phone: p?.nationalPhoneNumber ?? null,
        website: p?.websiteUri ?? null,
        rating: p?.rating ?? null,
        review_count: p?.userRatingCount ?? null,
        miner_run_id: runId,
        snapshot: {
          place_id: p?.id ?? null,
          displayName: p?.displayName ?? null,
          formattedAddress: p?.formattedAddress ?? null,
          nationalPhoneNumber: p?.nationalPhoneNumber ?? null,
          websiteUri: p?.websiteUri ?? null,
          rating: p?.rating ?? null,
          userRatingCount: p?.userRatingCount ?? null,
          businessStatus: p?.businessStatus ?? null,
          primaryType: p?.primaryType ?? null,
          types: p?.types ?? null,
          text_query: textQuery,
        },
      };

      // Dedupe is a PARTIAL unique index (place_id WHERE place_id IS NOT NULL),
      // which Postgres cannot infer as an ON CONFLICT arbiter from PostgREST's
      // upsert. So: look up by place_id, then update or insert explicitly.
      let existingId: string | null = null;
      let existingStatus: string | null = null;
      if (row.place_id) {
        const { data: found } = await admin
          .from('prospects')
          .select('id,status')
          .eq('place_id', row.place_id)
          .maybeSingle();
        existingId = (found?.id as string) ?? null;
        existingStatus = (found?.status as string) ?? null;
      }

      if (existingId) {
        const { error: updErr } = await admin
          .from('prospects')
          .update({ ...row, status: undefined })
          .eq('id', existingId);
        if (updErr) {
          console.error('[mine-prospects] update failed', updErr.message);
          continue;
        }
        inserted += 1;
        if (existingStatus === 'new') prospectIds.push(existingId);
      } else {
        const { data: ins, error: insErr } = await admin
          .from('prospects')
          .insert(row)
          .select('id')
          .single();
        if (insErr || !ins?.id) {
          console.error('[mine-prospects] insert failed', insErr?.message);
          continue;
        }
        inserted += 1;
        prospectIds.push(ins.id as string);
      }
    }

    await admin
      .from('miner_runs')
      .update({
        found,
        kept: inserted,
        status: 'complete',
        finished_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return json({
      ok: true,
      miner_run_id: runId,
      found,
      kept: inserted,
      prospect_ids: prospectIds,
    });
  } catch (e) {
    return await fail((e as Error).message ?? 'unknown_error');
  }
});
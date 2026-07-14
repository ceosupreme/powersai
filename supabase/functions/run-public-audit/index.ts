// run-public-audit
// PUBLIC endpoint (verify_jwt=false). Anonymous prospects submit their
// business + city; we insert a public_audit_requests row, return { token }
// immediately, and kick the resolve → snapshot → audit → rank pipeline off
// in a background task via EdgeRuntime.waitUntil so the client can poll
// public-audit-status and render the progress theater.
//
// Sequencing (per approved plan):
//   1. Create shell venue (project_type='home_services' default).
//   2. gbp-resolve-place({ venue_id: shell }) — requires venue_id.
//      On success, map the resolved GBP primary category to a seeded
//      project_type key (currently only 'home_services' has vectors +
//      display_defaults); UPDATE the shell's project_type BEFORE audits run.
//      Record the mapping path in full_result.project_type_resolution.
//   3. Snapshot (parallel): gbp-sync-weekly, website-resolve+crawl (if url),
//      extract-review-themes, map-pack-run.
//   4. Audit (parallel): foundation-audit-refresh + growth-audit-refresh
//      both with cold_only=true.
//   5. compute-leak-stack, then build redacted_result + full_result.
//
// 7-day dedupe (place_id known only post-resolve): after resolve, if a
// prior 'complete' request exists for the same place_id within 7 days,
// copy its results onto the new row, mark complete, and DELETE the just-
// created shell (nothing references it yet). run_id from prior audits
// stays linked to the original shell, which is fine.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Per-IP hourly cap. Best-effort in-memory (edge functions are stateless
// across cold starts) + a DB-side count as a durable backstop.
const IP_HITS = new Map<string, { n: number; reset: number }>();
const IP_LIMIT = 5;
const IP_WINDOW_MS = 60 * 60 * 1000;

const Body = z.object({
  business_name: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(120),
  website_url: z.string().trim().max(500).optional().nullable(),
  operation_footprint: z.enum(['solo_owner', 'small_crew_2_5', 'crew_6_plus', 'multi_location']),
  // Honeypot — must be empty.
  company_website: z.string().max(0).optional().nullable(),
});

// Map GBP primary type -> seeded project_type key. Currently only
// 'home_services' has vectors + display_defaults, so anything not obviously
// a home-services vertical falls back to it (with the caveat recorded).
const HOME_SERVICES_HINTS = [
  'plumber', 'electrician', 'hvac', 'roofer', 'roofing', 'contractor',
  'landscaper', 'landscaping', 'handyman', 'home_service', 'cleaning',
  'cleaning_service', 'pest_control', 'painter', 'carpenter', 'locksmith',
  'general_contractor', 'moving_company', 'garage_door',
];

type ProjectTypeResolution = {
  gbp_category: string | null;
  matched_key: string;
  path: 'exact' | 'default';
  caveat?: string;
};

function resolveProjectType(gbpTypes: string[] | null, gbpPrimary: string | null): ProjectTypeResolution {
  const bag = [gbpPrimary, ...(gbpTypes ?? [])].filter(Boolean).map(String).map((s) => s.toLowerCase());
  for (const t of bag) {
    if (HOME_SERVICES_HINTS.some((h) => t.includes(h))) {
      return { gbp_category: gbpPrimary, matched_key: 'home_services', path: 'exact' };
    }
  }
  return {
    gbp_category: gbpPrimary,
    matched_key: 'home_services',
    path: 'default',
    caveat: "We couldn't confirm your business category from Google yet, so these use general local-business benchmarks — your numbers will sharpen everything.",
  };
}

function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`v1:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = IP_HITS.get(ip);
  if (!cur || cur.reset < now) {
    IP_HITS.set(ip, { n: 1, reset: now + IP_WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > IP_LIMIT;
}

async function invoke(fn: string, body: unknown, opts: { timeoutMs?: number } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await r.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function setStatus(
  admin: ReturnType<typeof createClient>,
  id: string,
  patch: Record<string, unknown>,
) {
  await admin.from('public_audit_requests').update(patch).eq('id', id);
}

function appendDetail(prev: string | null | undefined, line: string): string {
  const stamp = new Date().toISOString().slice(11, 19);
  const next = `[${stamp}] ${line}`;
  return prev ? `${prev}\n${next}` : next;
}

async function runPipeline(requestId: string, token: string, input: z.infer<typeof Body>) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();
  let detail: string | null = null;
  let shellVenueId: string | null = null;

  const log = async (line: string, extra: Record<string, unknown> = {}) => {
    detail = appendDetail(detail, line);
    await setStatus(admin, requestId, { status_detail: detail, ...extra });
  };

  try {
    // ── 1. Create shell venue (default project_type='home_services'). ──────
    await setStatus(admin, requestId, { status: 'resolving' });
    await log('Creating prospect shell…');
    const slug = `prospect-${token.slice(0, 10)}`;
    const { data: shell, error: shellErr } = await admin
      .from('venues')
      .insert({
        name: input.business_name,
        venue_name: input.business_name,
        city: input.city,
        slug,
        is_active: true,
        is_prospect_shell: true,
        project_type: 'home_services',
      })
      .select('id')
      .single();
    if (shellErr || !shell) throw new Error(`shell create failed: ${shellErr?.message ?? 'unknown'}`);
    shellVenueId = shell.id as string;
    await setStatus(admin, requestId, { shell_venue_id: shellVenueId });

    // ── 2. gbp-resolve-place ───────────────────────────────────────────────
    await log('Resolving your Google Business Profile…');
    const resolveQuery = input.business_name + ' ' + input.city;
    const resolveRes = await invoke('gbp-resolve-place', {
      venue_id: shellVenueId,
      query: resolveQuery,
      url: input.website_url ?? undefined,
    }, { timeoutMs: 30_000 });

    let placeId: string | null = null;
    let gbpPrimary: string | null = null;
    let gbpTypes: string[] | null = null;
    let placesKeyActive = true;
    if (resolveRes.ok && typeof resolveRes.data === 'object' && resolveRes.data) {
      placeId = (resolveRes.data as any).place_id ?? null;
    } else {
      const errStr = String((resolveRes.data as any)?.error ?? '').toLowerCase();
      const status = resolveRes.status;
      if (errStr.includes('not configured') || status === 500 && errStr.includes('google_places_api_key')) {
        placesKeyActive = false;
        await log('Google Places lookup unavailable — using general local-business benchmarks. Your dollar figures will sharpen automatically once the key is active.');
      } else if (status === 403 || errStr.includes('permission_denied')) {
        placesKeyActive = false;
        await log('Google Places API returned permission denied (403). Cold check will use general benchmarks; will sharpen once the key is enabled for Places API (New).');
      } else {
        await log(`GBP resolve failed: ${JSON.stringify((resolveRes.data as any)?.error ?? status).slice(0, 200)}`);
      }
    }

    // Read gbp_snapshots for category, or fall back to Places category from
    // gbp-sync (runs next). For project-type mapping we prefer the category
    // already on gbp_place_mappings if it's been populated.
    if (placeId) {
      await setStatus(admin, requestId, { place_id: placeId });
    }

    // ── 2a. 7-day dedupe on place_id ──────────────────────────────────────
    if (placeId) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: prior } = await admin
        .from('public_audit_requests')
        .select('id, redacted_result, full_result')
        .eq('place_id', placeId)
        .eq('status', 'complete')
        .gte('created_at', cutoff)
        .neq('id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prior?.full_result) {
        await log('Recent audit found for this business — reusing cached result.');
        await admin.from('public_audit_requests').update({
          status: 'complete',
          redacted_result: prior.redacted_result,
          full_result: prior.full_result,
          shell_venue_id: null,
          status_detail: (detail ?? '') + '\n[dedupe] served cached result.',
        }).eq('id', requestId);
        // Nothing has referenced the shell yet — safe to delete.
        await admin.from('venues').delete().eq('id', shellVenueId);
        return;
      }
    }

    // ── 3. Snapshot (parallel) ────────────────────────────────────────────
    await setStatus(admin, requestId, { status: 'snapshotting' });
    await log('Scanning your website, reviews, and map ranking…');

    // We need a keyword for map-pack. Best effort: derive from resolved GBP
    // category if we can pull it now; otherwise use the business category
    // guess "<business_name> <city>" as a fallback.
    // Fire gbp-sync first (populates category + hours/photos/nap), then
    // the rest in parallel.
    // Cold public runs: lean field mask (cost discipline) + provenance flag.
    // Skip entirely when the Places key isn't active so we don't waste an
    // edge-function round trip only to log another failure.
    if (placesKeyActive && placeId) {
      const gbpSync = await invoke('gbp-sync-weekly', {
        venue_id: shellVenueId,
        no_stagger: true,
        source_kind: 'public_checkup',
        scope_override: 'public_lean',
      }, { timeoutMs: 60_000 });
      if (!gbpSync.ok) await log(`GBP sync degraded: HTTP ${gbpSync.status}`);
    } else if (!placeId) {
      await log('Skipping GBP snapshot — no place_id resolved.');
    }

    // Read the GBP snapshot for category info to power project-type mapping
    // and the map-pack keyword.
    const { data: gbpSnap } = await admin
      .from('gbp_snapshots')
      .select('primary_category, secondary_categories')
      .eq('venue_id', shellVenueId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (gbpSnap) {
      gbpPrimary = (gbpSnap as any).primary_category ?? null;
      gbpTypes = Array.isArray((gbpSnap as any).secondary_categories)
        ? (gbpSnap as any).secondary_categories
        : null;
    }

    // ── 2b. project_type resolution + shell UPDATE (before audits) ────────
    const ptRes = resolveProjectType(gbpTypes, gbpPrimary);
    if (ptRes.matched_key !== 'home_services') {
      // Only remap if we ever add more seeded verticals; guarded here for
      // future-proofing. Currently always resolves to 'home_services'.
      await admin.from('venues').update({ project_type: ptRes.matched_key as any }).eq('id', shellVenueId);
    }

    const mapKeyword = ((gbpPrimary || 'home services') + ' ' + input.city).trim();

    // Review-sample honesty: public Place Details returns at most a handful
    // of reviews. Skip theme extraction on cold runs — never present a
    // 5-review sample as a full review analysis. Managed venues keep the
    // normal path (they hit this fn from their own weekly flow, not here).
    const [webResolve, reviewRes, mapRes] = await Promise.allSettled([
      input.website_url
        ? invoke('website-resolve-url', { venue_id: shellVenueId, website_url: input.website_url }, { timeoutMs: 20_000 })
        : Promise.resolve({ ok: true, status: 200, data: { skipped: 'no website_url' } }),
      Promise.resolve({ ok: true, status: 200, data: { skipped: 'cold_public_run_limited_sample' } }),
      // map-pack-run needs a keyword row; without one it silently does nothing.
      // Insert a one-shot active keyword scoped to this shell.
      (async () => {
        await admin.from('map_pack_keywords').insert({
          venue_id: shellVenueId,
          keyword: mapKeyword,
          priority: 1,
          is_active: true,
        }).select('id').maybeSingle().catch(() => null);
        return invoke('map-pack-run', { venue_id: shellVenueId, force: true, trigger_source: 'public_audit' }, { timeoutMs: 60_000 });
      })(),
    ]);

    if (webResolve.status === 'fulfilled' && (webResolve.value as any)?.ok) {
      const crawl = await invoke('website-crawl-dispatcher', { venue_id: shellVenueId }, { timeoutMs: 60_000 });
      if (!crawl.ok) await log(`Website crawl degraded: HTTP ${crawl.status}`);
    } else if (input.website_url) {
      await log('Website resolve failed — skipping crawl.');
    }
    // Note the intentional skip so the operator sees it in status_detail.
    await log('Review themes: skipped on public run — sample from Google is too small (≤5 reviews) to analyze themes honestly.');
    if (mapRes.status === 'rejected' || (mapRes.status === 'fulfilled' && !(mapRes.value as any)?.ok)) {
      await log('Map-pack ranking check degraded.');
    }

    // ── 4. Audits (parallel, cold_only) ───────────────────────────────────
    await setStatus(admin, requestId, { status: 'auditing' });
    await log('Running foundation + growth checks…');
    const [foundationRes, growthRes] = await Promise.allSettled([
      invoke('foundation-audit-refresh', { venue_id: shellVenueId, cold_only: true, triggered_by: null }, { timeoutMs: 60_000 }),
      invoke('growth-audit-refresh', { venue_id: shellVenueId, cold_only: true, triggered_by: null }, { timeoutMs: 90_000 }),
    ]);
    if (foundationRes.status === 'rejected' || (foundationRes.status === 'fulfilled' && !(foundationRes.value as any)?.ok)) {
      await log('Foundation audit degraded.');
    }
    if (growthRes.status === 'rejected' || (growthRes.status === 'fulfilled' && !(growthRes.value as any)?.ok)) {
      await log('Growth audit degraded.');
    }

    // ── 5. compute-leak-stack ─────────────────────────────────────────────
    await setStatus(admin, requestId, { status: 'ranking' });
    await log('Putting dollar figures on every leak…');
    const leakRes = await invoke('compute-leak-stack', { venue_id: shellVenueId }, { timeoutMs: 45_000 });
    if (!leakRes.ok) {
      throw new Error(`compute-leak-stack failed: HTTP ${leakRes.status}`);
    }

    const { data: leakRun } = await admin
      .from('leak_stack_runs')
      .select('*')
      .eq('venue_id', shellVenueId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!leakRun) throw new Error('leak_stack_runs empty after compute');

    // Competitor block from latest map-pack snapshot (may be missing).
    const { data: mapSnap } = await admin
      .from('map_pack_snapshots')
      .select('rank, in_map_pack, top_competitors, keyword, checked_at')
      .eq('venue_id', shellVenueId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const results = Array.isArray((leakRun as any).results) ? (leakRun as any).results : [];
    const topThree = results.slice(0, 3).map((r: any) => r.name).filter(Boolean);

    const full_result = {
      total_monthly_dollars: (leakRun as any).total_monthly_dollars,
      total_risk_exposure_dollars: (leakRun as any).total_risk_exposure_dollars,
      results,
      inputs_basis: (leakRun as any).inputs_basis ?? null,
      project_type_resolution: ptRes,
      competitor_block: mapSnap
        ? {
            keyword: (mapSnap as any).keyword,
            you_rank: (mapSnap as any).rank,
            in_map_pack: (mapSnap as any).in_map_pack,
            top_competitors: (mapSnap as any).top_competitors ?? [],
          }
        : null,
      duration_ms: Date.now() - startedAt,
    };

    const redacted_result = {
      total_monthly_dollars: (leakRun as any).total_monthly_dollars,
      leak_count: results.length,
      top_leaks: topThree,
      project_type_resolution: ptRes,
    };

    await log(`Complete: ${results.length} leaks ranked.`);
    await admin.from('public_audit_requests').update({
      status: 'complete',
      redacted_result,
      full_result,
      status_detail: detail,
    }).eq('id', requestId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[run-public-audit] pipeline threw:', msg);
    await admin.from('public_audit_requests').update({
      status: 'failed',
      status_detail: appendDetail(detail, `Pipeline failed: ${msg}`),
    }).eq('id', requestId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const token = makeToken();
  const ip_hash = await hashIp(ip);

  // Durable per-IP backstop: hard-cap to 20 requests per rolling hour so a
  // spammer who cycles cold starts can't blow past the in-memory limit.
  const oneHourAgo = new Date(Date.now() - IP_WINDOW_MS).toISOString();
  const { count: recent } = await admin
    .from('public_audit_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ip_hash)
    .gte('created_at', oneHourAgo);
  if ((recent ?? 0) >= 20) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: row, error } = await admin
    .from('public_audit_requests')
    .insert({
      token,
      business_name: parsed.data.business_name,
      city: parsed.data.city,
      website_url: parsed.data.website_url ?? null,
      operation_footprint: parsed.data.operation_footprint,
      status: 'queued',
      ip_hash,
    })
    .select('id')
    .single();
  if (error || !row) {
    return new Response(JSON.stringify({ error: 'insert_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Kick the pipeline off in the background. Client polls public-audit-status.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(runPipeline(row.id as string, token, parsed.data));
  // Fallback for local runs without EdgeRuntime — do not await.
  if (!(globalThis as any).EdgeRuntime) {
    runPipeline(row.id as string, token, parsed.data).catch((e) => console.error('[run-public-audit] bg run:', e));
  }

  return new Response(JSON.stringify({ token }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
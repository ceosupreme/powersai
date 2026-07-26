// checkup-prospect — runs the cold checkup for ONE mined prospect and stores
// the leak totals back on the prospects row. Called sequentially (one prospect
// per invocation, with a client-side delay between calls) so a single slow or
// failing prospect can never kill a batch or blow the edge time budget.
//
// ── SHARED CHAIN — KEEP IN SYNC WITH run-public-audit ─────────────────────
// supabase/functions/run-public-audit/index.ts orchestrates the SAME
// downstream chain for the anonymous public checkup. If you change any step
// below, change it there too.
//
//   shared steps (both paths):
//     1. create shell venue (venues.is_prospect_shell = true)
//     2. attach a Google place to the shell (public path: gbp-resolve-place;
//        here: gbp_place_mappings upsert — the place_id is already known
//        from mining, so resolution is unnecessary)
//     3. gbp-sync-weekly  { venue_id, no_stagger, scope_override:'public_lean',
//                           source_kind:'cold_prospect' }
//     4. compute-leak-stack { venue_id }  ← the leak numbers
//
//   steps the PUBLIC path runs that this internal path OMITS, deliberately:
//     - website-resolve-url + website-crawl-dispatcher
//     - map-pack-run (+ its one-shot keyword insert)
//     - extract-review-themes
//     - foundation-audit-refresh (cold_only)
//     - growth-audit-refresh (cold_only)
//
//   Why omitting them is safe: no seeded leak vector in
//   project_type_leak_vectors references a variable produced by those steps.
//   Verified across every project_type — the only signal-backed variable in
//   any seeded formula is `leads_unresponded` (project_type 'client'), which
//   reads inbound_leads, not crawl/map-pack/findings data. Every variable in
//   the vertical formulas (missed_calls, booking_rate, avg_ticket,
//   open_estimates, close_rate, slow_response_leads,
//   first_responder_advantage, unresponded_emergencies, emergency_avg_ticket)
//   resolves from project_types.display_defaults, so compute-leak-stack
//   computes cleanly and stamps render_state 'estimated' — the honest label
//   for vertical-default numbers. Nothing silently computes as zero: an
//   unresolved variable produces monthly_dollars = null with a
//   `unresolved:<var>` reason, never a fake 0.
//
// Shell venues are excluded from the projects list (src/services/supabaseData.ts
// filters is_prospect_shell = false), so cold prospects never pollute projects.

import { createClient } from 'npm:@supabase/supabase-js@2';

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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function invoke(fn: string, body: unknown, timeoutMs = 60_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
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
    clearTimeout(t);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'prospect';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

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
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
  const isOperator = (roles ?? []).some((r: { role: string }) => r.role !== 'client');
  if (!isOperator) return json({ error: 'forbidden' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const prospectId = typeof body.prospect_id === 'string' ? body.prospect_id : null;
  if (!prospectId) return json({ error: 'prospect_id required' }, 400);

  const { data: prospect, error: pErr } = await admin
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .maybeSingle();
  if (pErr) return json({ error: pErr.message }, 500);
  if (!prospect) return json({ error: 'prospect_not_found' }, 404);

  const markError = async (msg: string) => {
    await admin
      .from('prospects')
      .update({ last_error: msg.slice(0, 500), status: 'new' })
      .eq('id', prospectId);
    return json({ error: msg, prospect_id: prospectId }, 200);
  };

  try {
    await admin.from('prospects').update({ status: 'queued', last_error: null }).eq('id', prospectId);

    // 1. Shell venue — same shape run-public-audit creates.
    let shellId = (prospect as any).shell_venue_id as string | null;
    if (!shellId) {
      const slug = `prospect-${slugify((prospect as any).business_name)}-${prospectId.slice(0, 8)}`;
      const { data: shell, error: sErr } = await admin
        .from('venues')
        .insert({
          name: (prospect as any).business_name,
          venue_name: (prospect as any).business_name,
          city: (prospect as any).city,
          slug,
          is_active: true,
          is_prospect_shell: true,
          project_type: (prospect as any).niche ?? 'home_services',
        })
        .select('id')
        .single();
      if (sErr || !shell) throw new Error(`shell_create_failed: ${sErr?.message ?? 'unknown'}`);
      shellId = shell.id as string;
      await admin.from('prospects').update({ shell_venue_id: shellId }).eq('id', prospectId);
    }

    // 2. Attach the known place_id (skips gbp-resolve-place).
    if ((prospect as any).place_id) {
      await admin.from('gbp_place_mappings').upsert(
        {
          venue_id: shellId,
          place_id: (prospect as any).place_id,
          manual_only: false,
          consecutive_fetch_failures: 0,
          last_resolve_error: null,
        },
        { onConflict: 'venue_id' },
      );

      // 3. GBP snapshot — cheap lean mask, same call the cold public path makes.
      await invoke(
        'gbp-sync-weekly',
        {
          venue_id: shellId,
          no_stagger: true,
          scope_override: 'public_lean',
          source_kind: 'cold_prospect',
        },
        45_000,
      );
    }

    // 4. Leak stack.
    const leak = await invoke('compute-leak-stack', { venue_id: shellId }, 45_000);
    if (!leak.ok) {
      throw new Error(`compute_leak_stack_failed: ${JSON.stringify((leak.data as any)?.error ?? leak.status).slice(0, 200)}`);
    }
    const run = (leak.data as any)?.run;
    if (!run?.id) throw new Error('compute_leak_stack_no_run');

    const { error: uErr } = await admin
      .from('prospects')
      .update({
        status: 'checked',
        leak_run_id: run.id,
        leak_total: run.total_monthly_dollars ?? 0,
        risk_total: run.total_risk_exposure_dollars ?? 0,
        checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', prospectId);
    if (uErr) throw new Error(uErr.message);

    return json({
      ok: true,
      prospect_id: prospectId,
      leak_run_id: run.id,
      leak_total: run.total_monthly_dollars ?? 0,
      risk_total: run.total_risk_exposure_dollars ?? 0,
    });
  } catch (e) {
    console.error('[checkup-prospect]', e);
    return await markError((e as Error).message ?? 'unknown_error');
  }
});
// unlock-public-audit
// PUBLIC (verify_jwt=false). Captures the prospect's email in inbound_leads
// (reusing the submit-inbound-lead column contract via a direct service-role
// write — the anon rate-limit/honeypot gates on that public function don't
// apply here) and returns the full leak ledger.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Email regex kept in sync with the client (src/pages/FreeAudit.tsx).
// Requires local@domain.tld with a ≥2-char TLD. Server is the gate;
// client-side check is UX only.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Body = z.object({
  token: z.string().trim().min(8).max(64),
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_RE, 'invalid_email'),
  name: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});

const SIZE_LABEL: Record<string, string> = {
  solo_owner: 'Solo',
  small_crew_2_5: '2 to 5 people',
  crew_6_plus: '6 or more people',
  multi_location: 'Multi-location',
};

const money = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) ? `$${Math.round(n).toLocaleString('en-US')}` : null;

/** The lead note (it's the body of the owner's alert email): what the
 *  checkup found, so a follow-up can start from it. Older results without
 *  the listing or ranking summaries just skip those lines. */
// deno-lint-ignore no-explicit-any
function leadNote(row: any, redacted: Record<string, unknown>): string {
  // deno-lint-ignore no-explicit-any
  const full = (row.full_result ?? {}) as Record<string, any>;
  const lines = [`Free business checkup unlocked for ${row.business_name ?? 'a business'}${row.city ? ` (${row.city})` : ''}.`];
  const listing = full.listing;
  if (listing?.name) {
    lines.push(`Google listing checked: ${listing.name}${listing.address ? `, ${String(listing.address).replace(/,\s*USA$/, '')}` : ''}`);
  }
  const rank = full.google ?? full.competitor_block;
  if (rank?.keyword) {
    lines.push(`Google rank: ${rank.you_rank != null ? `#${rank.you_rank}` : 'not in the top 20'} for "${rank.keyword}"${full.google?.searched_near ? ', searched from their location' : ''}`);
  }
  if (listing && (listing.rating != null || listing.review_count != null)) {
    lines.push(`Reviews: ${listing.rating != null ? `${Number(listing.rating).toFixed(1)} stars` : 'no rating'} from ${Number(listing.review_count ?? 0).toLocaleString('en-US')} reviews`);
  }
  if (full.website?.url) {
    const status: Record<string, string> = { none: 'no website', social: 'a social page, not a website', unreachable: "didn't open", blocked: 'security screen' };
    lines.push(`Website: ${full.website.url}${status[full.website.status] ? ` (${status[full.website.status]})` : ''}`);
  }
  if (row.operation_footprint && SIZE_LABEL[row.operation_footprint]) lines.push(`Size: ${SIZE_LABEL[row.operation_footprint]}`);
  const results = Array.isArray(full.results) ? full.results : [];
  const gaps = results.length || Number(redacted.leak_count ?? 0);
  const total = money(full.total_monthly_dollars ?? redacted.total_monthly_dollars);
  if (full.project_type_resolution?.path === 'default') {
    lines.push(`No cost estimates for this type of business${full.project_type_resolution?.gbp_category ? ` (Google category: ${full.project_type_resolution.gbp_category})` : ''}.`);
  } else if (total && gaps) {
    // deno-lint-ignore no-explicit-any
    const names = results.map((r: any) => r?.name).filter(Boolean).join('; ');
    lines.push(`Estimated ${total} a month across ${gaps} gap${gaps === 1 ? '' : 's'}${names ? `: ${names}` : ''}.`);
  }
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: req_row, error: reqErr } = await admin
    .from('public_audit_requests')
    .select('id, status, business_name, city, operation_footprint, place_id, redacted_result, full_result')
    .eq('token', parsed.data.token)
    .maybeSingle();

  if (reqErr || !req_row) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (req_row.status !== 'complete') {
    return new Response(JSON.stringify({ error: 'not_ready', status: req_row.status }), {
      status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const redacted = (req_row.redacted_result ?? {}) as Record<string, unknown>;

  // Direct inbound_leads insert (reusing submit-inbound-lead's schema).
  const leadPayload = {
    name: parsed.data.name ?? parsed.data.email.split('@')[0],
    business_name: req_row.business_name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: leadNote(req_row, redacted),
    // inbound_leads only accepts voice/chat/form/phone; the checkup unlock is a
    // web form ('public_audit' was rejected, so these leads were never saved).
    // source 'free-audit' and qualifier_data.source tell them apart.
    conversation_channel: 'form',
    route_to: 'self',
    is_ready: true,
    source: 'free-audit',
    qualifier_data: {
      source: 'public_audit',
      token: parsed.data.token,
      operation_footprint: req_row.operation_footprint,
      redacted_summary: redacted,
      leak_count: (redacted as any).leak_count ?? null,
      top_leaks: (redacted as any).top_leaks ?? [],
      project_type_resolution: (redacted as any).project_type_resolution ?? null,
      place_id: req_row.place_id,
      city: req_row.city,
    },
  };

  const { data: lead, error: leadErr } = await admin.from('inbound_leads').insert(leadPayload).select('id').maybeSingle();
  if (leadErr) {
    console.error('[unlock-public-audit] inbound_leads insert failed:', leadErr.message);
    // Non-fatal — we still return the full result so the prospect isn't blocked.
  }

  // Alert the owner, the same way contact-form leads do (submit-inbound-lead).
  // A notification failure never blocks the prospect's full result.
  if (lead?.id) {
    const notify = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-owner-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ lead_id: lead.id }),
    }).catch((e) => console.error('[unlock-public-audit] owner notify error', e));
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(notify); else await notify;
  }

  await admin
    .from('public_audit_requests')
    .update({ email: parsed.data.email, email_captured_at: new Date().toISOString() })
    .eq('id', req_row.id);

  return new Response(JSON.stringify({ full_result: req_row.full_result }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
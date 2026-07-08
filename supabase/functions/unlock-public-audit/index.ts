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

const Body = z.object({
  token: z.string().trim().min(8).max(64),
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});

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
    message: `Public leak audit unlocked. Estimated $${redacted.total_monthly_dollars ?? '—'}/mo across ${redacted.leak_count ?? '—'} leaks.`,
    conversation_channel: 'public_audit',
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

  const { error: leadErr } = await admin.from('inbound_leads').insert(leadPayload);
  if (leadErr) {
    console.error('[unlock-public-audit] inbound_leads insert failed:', leadErr.message);
    // Non-fatal — we still return the full result so the prospect isn't blocked.
  }

  await admin
    .from('public_audit_requests')
    .update({ email: parsed.data.email, email_captured_at: new Date().toISOString() })
    .eq('id', req_row.id);

  return new Response(JSON.stringify({ full_result: req_row.full_result }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
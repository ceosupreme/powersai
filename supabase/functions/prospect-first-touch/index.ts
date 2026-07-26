// prospect-first-touch — template-bounded outreach drafting for a mined
// prospect. Mirrors the crm-generate-outreach pattern (Lovable AI Gateway).
// Drafting ONLY — nothing is ever sent from this system.
//
// The model receives the prospect's REAL computed leak rows from
// leak_stack_runs and is forbidden from inventing or altering figures.
// Every dollar figure must be framed as an estimate from public data.

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

const MODEL = 'google/gemini-2.5-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'LOVABLE_API_KEY missing' }, 500);

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

  const { data: prospect } = await admin
    .from('prospects')
    .select('id,business_name,city,niche,rating,review_count,leak_run_id,leak_total,risk_total')
    .eq('id', prospectId)
    .maybeSingle();
  if (!prospect) return json({ error: 'prospect_not_found' }, 404);
  if (!(prospect as any).leak_run_id) return json({ error: 'prospect_not_checked' }, 400);

  const { data: run } = await admin
    .from('leak_stack_runs')
    .select('results,total_monthly_dollars,total_risk_exposure_dollars')
    .eq('id', (prospect as any).leak_run_id)
    .maybeSingle();

  const results: any[] = Array.isArray((run as any)?.results) ? (run as any).results : [];
  const leaks = results
    .filter((r) => r?.monthly_dollars != null)
    .slice(0, 4)
    .map((r) => ({
      name: r.name,
      monthly_dollars: r.monthly_dollars,
      risk_type: r.risk_type,
      benchmark: r.benchmark ?? null,
    }));

  const { data: typeRow } = await admin
    .from('project_types')
    .select('label')
    .eq('id', (prospect as any).niche ?? '')
    .maybeSingle();

  const facts = {
    business_name: (prospect as any).business_name,
    city: (prospect as any).city,
    niche: (typeRow as any)?.label ?? (prospect as any).niche,
    google_rating: (prospect as any).rating,
    google_review_count: (prospect as any).review_count,
    estimated_monthly_recoverable_dollars: (run as any)?.total_monthly_dollars ?? (prospect as any).leak_total,
    estimated_monthly_risk_exposure_dollars: (run as any)?.total_risk_exposure_dollars ?? (prospect as any).risk_total,
    leaks,
  };

  const system = [
    'You write short cold-outreach drafts for a local-business growth operator.',
    'HARD RULES:',
    '1. Use ONLY the figures in the FACTS payload. Never invent, round differently, or add a number that is not there.',
    '2. Every dollar figure must be explicitly framed as an estimate from public data (e.g. "rough estimate from public data").',
    '3. Never claim to have inside data, access to their systems, or knowledge of their actual revenue.',
    '4. No hype, no emoji, no fake urgency, no guarantees.',
    '5. One clear low-friction ask. A human sends this — never imply it was automated.',
    'Return STRICT JSON with exactly these keys: {"sms":"...","loom_script":"..."}.',
    'sms: an SMS/DM-length message, under 320 characters, plain text, one estimate figure maximum.',
    'loom_script: a spoken 60-second Loom script, 130-160 words, plain paragraphs, opens by naming the business and what you looked at publicly, walks the top one or two estimated leaks, closes with the same low-friction ask.',
  ].join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `FACTS:\n${JSON.stringify(facts, null, 2)}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 429) return json({ error: 'rate_limited' }, 429);
  if (res.status === 402) return json({ error: 'credits_exhausted' }, 402);
  if (!res.ok) {
    const text = await res.text();
    console.error('[prospect-first-touch] gateway error', res.status, text.slice(0, 300));
    return json({ error: 'generation_failed' }, 502);
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content ?? '{}';
  let drafts: { sms?: string; loom_script?: string } = {};
  try { drafts = JSON.parse(content); } catch { /* keep empty */ }
  if (!drafts.sms && !drafts.loom_script) return json({ error: 'empty_generation' }, 502);

  return json({ ok: true, facts, drafts });
});
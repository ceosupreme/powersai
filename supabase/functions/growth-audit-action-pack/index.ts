// growth-audit-action-pack
// Generates per-finding marketing assets via the Lovable AI Gateway.
// Modes:
//   - "pack":  full Action Pack from a Finding + venue context
//   - "asset": regenerate a single asset (optionally with refinement notes)
// All asset content is grounded to the supplied finding fields — no fabricated
// reviews, awards, testimonials, menu items, or venue facts.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-3-flash-preview';

type AssetKind =
  | 'social_post' | 'gbp_post' | 'email_draft' | 'sms_draft'
  | 'staff_script' | 'menu_callout' | 'website_block'
  | 'campaign_brief' | 'ops_fix_brief' | 'inquiry_form_spec';

const SYSTEM_PROMPT = `You are a marketing strategist for an independent bar/restaurant venue. You produce on-brand, venue-specific marketing assets.

ABSOLUTE RULES:
- Never invent reviews, testimonials, awards, press mentions, or quotes.
- Never claim specific menu items, events, prices, or venue facts that are not present in the provided finding context.
- If a fact isn't supplied, write generically or place a clearly-bracketed [PLACEHOLDER] for the venue to fill.
- Tone: casual-professional, warm, direct. Short sentences. No corporate jargon.
- Do not invent rankings or stats. Numbers should come from the finding's diagnosis/evidence only.`;

const PACK_TOOL = {
  type: 'function',
  function: {
    name: 'emit_action_pack',
    description: 'Emit the full set of marketing assets for the finding.',
    parameters: {
      type: 'object',
      properties: {
        assets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: [
                'social_post','gbp_post','email_draft','sms_draft','staff_script',
                'menu_callout','website_block','campaign_brief','ops_fix_brief','inquiry_form_spec',
              ] },
              title: { type: 'string' },
              body: { type: 'string' },
              variant: { type: 'number' },
              subject: { type: 'string', description: 'For email_draft only.' },
            },
            required: ['kind', 'title', 'body'],
            additionalProperties: false,
          },
        },
      },
      required: ['assets'],
      additionalProperties: false,
    },
  },
};

const ASSET_TOOL = {
  type: 'function',
  function: {
    name: 'emit_asset',
    description: 'Emit a single regenerated asset.',
    parameters: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        subject: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    },
  },
};

const LONG_FORM_TYPES = new Set([
  'reputation_theme_opportunity', 'local_visibility_gap', 'private_party_conversion_gap',
  'map_pack_ranking_gap', 'ai_search_visibility_gap', 'event_lift_opportunity',
]);
const LANDING_TYPES = new Set([
  'private_party_conversion_gap', 'local_visibility_gap', 'map_pack_ranking_gap',
  'ai_search_visibility_gap', 'event_lift_opportunity',
]);

function packBlueprint(findingType: string, category: string): { kind: AssetKind; title: string; variant?: number }[] {
  if (findingType === 'operational_readiness_blocker') {
    // Operational findings get operational assets, not marketing copy.
    return [
      { kind: 'ops_fix_brief', title: 'Staffing recommendation memo', variant: 1 },
      { kind: 'ops_fix_brief', title: 'Manager talking points', variant: 2 },
      { kind: 'ops_fix_brief', title: 'Pre-shift training script', variant: 3 },
    ];
  }
  const out: { kind: AssetKind; title: string; variant?: number }[] = [
    { kind: 'campaign_brief', title: 'Campaign brief' },
    { kind: 'social_post', title: 'Social caption — data-led', variant: 1 },
    { kind: 'social_post', title: 'Social caption — story-led', variant: 2 },
    { kind: 'social_post', title: 'Social caption — FOMO-led', variant: 3 },
    { kind: 'gbp_post', title: 'Google Business Profile post' },
    { kind: 'email_draft', title: 'Email draft' },
    { kind: 'sms_draft', title: 'SMS draft' },
    { kind: 'staff_script', title: 'Staff talking points' },
    { kind: 'campaign_brief', title: 'Measurement plan' },
  ];
  if (LONG_FORM_TYPES.has(findingType)) {
    out.push({ kind: 'website_block', title: 'Blog draft' });
  }
  if (LANDING_TYPES.has(findingType) || category === 'website') {
    out.push({ kind: 'website_block', title: 'Landing page copy' });
    if (findingType === 'private_party_conversion_gap') {
      out.push({ kind: 'inquiry_form_spec', title: 'Inquiry form spec' });
    }
  }
  return out;
}

function uid() { return crypto.randomUUID().slice(0, 12); }

async function callGateway(body: unknown): Promise<any> {
  const resp = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (resp.status === 429) throw new Error('rate_limited');
  if (resp.status === 402) throw new Error('payment_required');
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`gateway_${resp.status}:${t.slice(0, 200)}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    // Accept either the new GenerationContext shape or the legacy { finding } shape.
    let { mode, context, finding, venue, asset, refinement } = payload ?? {};
    if (!finding && context?.kind === 'finding') finding = context.finding;

    // ---- Build a synthetic "finding-shaped" object for non-finding contexts so
    // the rest of the prompt machinery (blueprint, system prompt, regenerate)
    // works unchanged. The synthetic object is never persisted.
    let contextLabel = 'Finding';
    let blueprintOverride: { kind: AssetKind; title: string; variant?: number }[] | null = null;
    if (!finding && context?.kind === 'campaign' && context.campaign) {
      const c = context.campaign;
      contextLabel = 'Campaign';
      finding = {
        id: `campaign:${c.id}`,
        type: 'soft_shift_opportunity',
        title: c.title,
        category: 'revenue',
        diagnosis: `Campaign "${c.title}" (${c.type})${c.description ? ` — ${c.description}` : ''}.`
          + (c.targetAudience ? ` Target audience: ${c.targetAudience}.` : '')
          + (Array.isArray(c.channels) && c.channels.length ? ` Channels: ${c.channels.join(', ')}.` : '')
          + (c.brandPartner ? ` Brand partner: ${c.brandPartner}.` : '')
          + (Array.isArray(c.linkedMenuItems) && c.linkedMenuItems.length ? ` Linked items: ${c.linkedMenuItems.join(', ')}.` : ''),
        recommendedAction: `Promote "${c.title}" across ${(c.channels ?? []).join(', ') || 'core channels'}.`,
        evidence: { summary: `Campaign of type ${c.type}.` },
      };
    }
    if (!finding && context?.kind === 'ad_hoc') {
      contextLabel = 'Ad-hoc request';
      const brief = (context.brief ?? '').toString().slice(0, 2000);
      const cat = (context.category ?? '').toString().slice(0, 80);
      finding = {
        id: `adhoc:${context.venueId}:${Date.now().toString(36)}`,
        type: 'soft_shift_opportunity',
        title: brief.split('\n')[0]?.slice(0, 80) || 'Ad-hoc Action Pack',
        category: 'revenue',
        diagnosis: brief || 'Ad-hoc marketing assets requested by GM.',
        recommendedAction: brief || 'Generate marketing assets per the brief.',
        evidence: { summary: cat ? `Category: ${cat}` : 'Ad-hoc request — no upstream finding.' },
      };
      // Restrict the blueprint to the requested asset kinds when provided.
      if (Array.isArray(context.assetKinds) && context.assetKinds.length) {
        blueprintOverride = (context.assetKinds as AssetKind[]).map((kind, i) => ({
          kind, title: `Ad-hoc ${kind.replace(/_/g, ' ')}`, variant: kind === 'social_post' ? i + 1 : undefined,
        }));
      }
    }

    if (!finding?.id || !finding?.type) {
      return new Response(JSON.stringify({ error: 'Missing finding/context' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const venueLine = venue?.venueName
      ? `${venue.venueName}${venue.city ? `, ${venue.city}` : ''}`
      : '[VENUE]';

    const findingContext = [
      `Context type: ${contextLabel}`,
      `Finding type (synthetic for non-finding): ${finding.type}`,
      `Title: ${finding.title}`,
      `Category: ${finding.category}`,
      `Diagnosis: ${finding.diagnosis}`,
      `Recommended action: ${finding.recommendedAction}`,
      `Evidence summary: ${finding.evidence?.summary ?? '—'}`,
      `Venue: ${venueLine}`,
      finding.gateReason ? `Operational caveat: ${finding.gateReason}` : '',
    ].filter(Boolean).join('\n');

    if (mode === 'asset') {
      const userPrompt = [
        `Regenerate the following ${asset.kind} asset. Keep it venue-specific and grounded.`,
        ``,
        `Existing title: ${asset.title}${asset.variant ? ` (v${asset.variant})` : ''}`,
        refinement ? `Refinement instructions: ${refinement}` : '',
        ``,
        `--- Context ---`,
        findingContext,
      ].filter(Boolean).join('\n');

      const data = await callGateway({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        tools: [ASSET_TOOL],
        tool_choice: { type: 'function', function: { name: 'emit_asset' } },
      });

      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      const args = call ? JSON.parse(call.function.arguments) : null;
      if (!args?.body) throw new Error('no_asset_returned');

      return new Response(JSON.stringify({
        body: args.body,
        meta: args.subject ? { subject: args.subject } : undefined,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- mode: pack ----
    const blueprint = blueprintOverride ?? packBlueprint(finding.type, finding.category);
    const blueprintList = blueprint.map((b, i) =>
      `${i + 1}. ${b.kind}${b.variant ? ` (v${b.variant})` : ''} — ${b.title}`,
    ).join('\n');

    const userPrompt = [
      `Generate the full Action Pack for the finding below.`,
      `Produce EXACTLY these assets, in this order, with matching kind/title fields:`,
      blueprintList,
      ``,
      `Each social_post variant should use a clearly different angle (data-led, story-led, FOMO-led).`,
      `email_draft must include a "subject" field.`,
      `Long-form drafts (blog, landing page) should be one strong draft, not multiple options.`,
      ``,
      `--- Finding context ---`,
      findingContext,
    ].join('\n');

    const data = await callGateway({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      tools: [PACK_TOOL],
      tool_choice: { type: 'function', function: { name: 'emit_action_pack' } },
    });

    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    if (!args?.assets?.length) throw new Error('no_assets_returned');

    const now = new Date().toISOString();

    // Determine context kind for persistence.
    const contextKind: 'finding' | 'campaign' | 'ad_hoc' =
      context?.kind === 'campaign' ? 'campaign'
      : context?.kind === 'ad_hoc' ? 'ad_hoc'
      : 'finding';

    // Try to identify caller for generated_by. Falls back to null (system).
    let generatedBy: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        if (data?.user) generatedBy = data.user.id;
      }
    } catch (_) { /* ignore */ }

    // Persist pack + assets via service role (RLS-bypassing).
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const venueId = venue?.venueId ?? null;
    let persistedPackId: string | null = null;
    const persistedAssets: any[] = [];

    if (venueId) {
      const { data: packRow, error: packErr } = await admin
        .from('growth_action_packs')
        .insert({
          venue_id: venueId,
          context_kind: contextKind,
          finding_id: finding.id,
          campaign_id: contextKind === 'campaign' ? context?.campaign?.id ?? null : null,
          ad_hoc_brief: contextKind === 'ad_hoc' ? (context?.brief ?? null) : null,
          ad_hoc_category: contextKind === 'ad_hoc' ? (context?.category ?? null) : null,
          generated_at: now,
          generated_by: generatedBy,
          engine_model: MODEL,
          source: 'ai',
          brand_voice: 'casual_professional_default',
        })
        .select('id')
        .single();
      if (packErr) {
        console.error('[growth-audit-action-pack] pack insert failed', packErr);
      } else {
        persistedPackId = packRow.id;
        const assetRows = (args.assets as any[]).map((a) => ({
          pack_id: persistedPackId,
          venue_id: venueId,
          finding_id: finding.id,
          finding_type: finding.type,
          kind: a.kind,
          title: a.title,
          body: a.body,
          meta: a.subject ? { subject: a.subject } : {},
          variant: a.variant ?? null,
          status: 'Draft',
          approval: 'Proposed',
          regeneration_count: 0,
          created_at: now,
        }));
        const { data: assetsBack, error: assetsErr } = await admin
          .from('growth_action_pack_assets')
          .insert(assetRows)
          .select('*');
        if (assetsErr) {
          console.error('[growth-audit-action-pack] assets insert failed', assetsErr);
        } else {
          persistedAssets.push(...(assetsBack ?? []));
          await admin.from('growth_action_pack_audit').insert({
            pack_id: persistedPackId,
            venue_id: venueId,
            event: 'pack_generated',
            new_value: { asset_count: assetsBack?.length ?? 0 },
            actor_user_id: generatedBy,
            actor_service: 'growth-audit-action-pack',
          });
        }
      }
    }

    // Build response in the same in-memory shape the client expects.
    const respPackId = persistedPackId ?? uid();
    const responseAssets = persistedAssets.length
      ? persistedAssets.map((row: any) => ({
          id: row.id,
          packId: row.pack_id,
          findingId: row.finding_id,
          findingType: row.finding_type,
          kind: row.kind,
          title: row.title,
          body: row.body,
          meta: row.meta && Object.keys(row.meta).length ? row.meta : undefined,
          variant: row.variant ?? undefined,
          status: row.status,
          approval: row.approval,
          createdAt: row.created_at,
          regenerationCount: row.regeneration_count,
        }))
      : (args.assets as any[]).map((a) => ({
          id: uid(),
          packId: respPackId,
          findingId: finding.id,
          findingType: finding.type,
          kind: a.kind,
          title: a.title,
          body: a.body,
          meta: a.subject ? { subject: a.subject } : undefined,
          variant: a.variant,
          status: 'Draft',
          approval: 'Proposed',
          createdAt: now,
          regenerationCount: 0,
        }));

    return new Response(JSON.stringify({
      id: respPackId,
      findingId: finding.id,
      venueId,
      generatedAt: now,
      source: 'ai',
      brandVoice: 'casual_professional_default',
      assets: responseAssets,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[growth-audit-action-pack]', msg);
    const status = msg === 'rate_limited' ? 429 : msg === 'payment_required' ? 402 : 500;
    const friendly = msg === 'rate_limited'
      ? 'Rate limit exceeded. Try again in a moment or switch to Mock mode.'
      : msg === 'payment_required'
      ? 'AI credits exhausted for this workspace. Switch to Mock mode or top up credits.'
      : `Generation failed: ${msg}`;
    return new Response(JSON.stringify({ error: friendly }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

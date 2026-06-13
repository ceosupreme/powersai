// Deterministic mock generator — same interface as the AI path.
// Useful for dev/demos with predictable output, and as a fallback when
// the AI Gateway is unavailable.

import type { Finding } from '../findings/mockFindings';
import { FINDING_TYPE_TEMPLATES } from '../findings/findingTypes';
import type { ActionPack, ActionPackAsset, GenerationContext, VenueContext } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

const SOCIAL_ANGLES = [
  { tone: 'data-led', tag: 'Insight' },
  { tone: 'story-led', tag: 'Story' },
  { tone: 'FOMO-led', tag: 'Don\'t miss' },
];

const LONG_FORM_TYPES = new Set([
  'reputation_theme_opportunity',
  'local_visibility_gap',
  'private_party_conversion_gap',
]);

const LANDING_PAGE_TYPES = new Set([
  'private_party_conversion_gap',
  'local_visibility_gap',
]);

/** Synthetic back-link id used by the asset store for non-finding contexts. */
function syntheticFindingId(ctx: GenerationContext): string {
  if (ctx.kind === 'finding') return ctx.finding.id;
  if (ctx.kind === 'campaign') return `campaign:${ctx.campaign.id}`;
  return `adhoc:${ctx.venueId}:${Date.now().toString(36)}-${uid()}`;
}

/** Synthesize a Finding-shaped object for non-finding contexts so the
 *  existing template-driven mock body still produces sensible output. */
function syntheticFindingFor(ctx: GenerationContext): Finding {
  if (ctx.kind === 'finding') return ctx.finding;
  const title = ctx.kind === 'campaign' ? ctx.campaign.title : (ctx.brief || 'Ad-hoc Action Pack');
  const diagnosis = ctx.kind === 'campaign'
    ? `Campaign: ${ctx.campaign.title} (${ctx.campaign.type})${ctx.campaign.description ? ` — ${ctx.campaign.description}` : ''}`
    : ctx.brief;
  const recommendedAction = ctx.kind === 'campaign'
    ? `Promote "${ctx.campaign.title}" across ${(ctx.campaign.channels ?? []).join(', ') || 'core channels'}`
    : ctx.brief;
  return {
    id: syntheticFindingId(ctx),
    title,
    category: 'revenue',
    type: 'soft_shift_opportunity',
    severity: 'Medium',
    revenueUpside: 3, ease: 3, confidence: 3, operationalRisk: 2,
    priorityScore: 0,
    isTrafficDriving: true,
    evidence: { summary: '', sources: [] },
    diagnosis,
    recommendedAction,
    status: 'New',
    createdAt: new Date().toISOString(),
  } as Finding;
}

export async function mockGenerateActionPack(
  context: GenerationContext,
  ctx: VenueContext,
): Promise<ActionPack> {
  const finding = syntheticFindingFor(context);
  const tmpl = FINDING_TYPE_TEMPLATES[finding.type];
  const packId = uid();
  const now = new Date().toISOString();
  const assets: ActionPackAsset[] = [];

  const venue = ctx.venueName;
  const where = ctx.city ? ` in ${ctx.city}` : '';

  // Ad-hoc may restrict to a subset of asset kinds.
  const adhocKinds = context.kind === 'ad_hoc' ? context.assetKinds : undefined;
  const wantKind = (k: ActionPackAsset['kind']) => !adhocKinds || adhocKinds.includes(k);

  const push = (a: Omit<ActionPackAsset, 'id' | 'packId' | 'findingId' | 'findingType' | 'createdAt' | 'status' | 'approval' | 'regenerationCount'>) => {
    if (!wantKind(a.kind)) return;
    assets.push({
      id: uid(),
      packId,
      findingId: finding.id,
      findingType: finding.type,
      createdAt: now,
      status: 'Draft',
      approval: 'Proposed',
      regenerationCount: 0,
      ...a,
    });
  };

  // Ops-only path: no marketing assets, only ops_fix_brief.
  if (finding.type === 'operational_readiness_blocker') {
    push({
      kind: 'ops_fix_brief',
      title: `Ops fix brief — ${venue}`,
      body: [
        `# Ops Fix Brief — ${venue}`,
        ``,
        `**Owner:** GM`,
        `**Re-evaluate:** 2 weeks from launch`,
        ``,
        `## What`,
        finding.diagnosis,
        ``,
        `## Action`,
        finding.recommendedAction,
        ``,
        `## Success metric`,
        `Re-evaluate gate state when ops indicators clear baseline for 2 consecutive weeks.`,
      ].join('\n'),
    });
    return { id: packId, findingId: finding.id, venueId: ctx.venueId, generatedAt: now, source: 'mock', brandVoice: 'casual_professional_default', assets };
  }

  // ===== Default pack =====
  // 1. Campaign Brief
  push({
    kind: 'campaign_brief',
    title: `${tmpl.label} — ${venue}`,
    body: [
      `**Name:** ${finding.title}`,
      `**Objective:** ${finding.recommendedAction}`,
      `**Target audience:** Local guests${where} matching the venue's core demographic`,
      `**Target window:** Pulled from finding context`,
      `**Offer:** Mock placeholder — replace with venue-specific offer`,
      `**Channels:** Instagram, Facebook, GBP, email, SMS, in-venue`,
      `**Baseline metric:** Current value from finding evidence`,
      `**Target metric:** +15% lift over 4-week test window`,
      `**Decision rule:** Repeat if lift ≥ target; iterate if 0–target; kill if below 0.`,
    ].join('\n\n'),
  });

  // 2. Three social captions
  SOCIAL_ANGLES.forEach((a, i) => {
    push({
      kind: 'social_post',
      variant: i + 1,
      title: `Social caption — ${a.tag}`,
      body: a.tone === 'data-led'
        ? `${venue} regulars already know — but here's the proof. ${finding.title.toLowerCase()}. Come see why.`
        : a.tone === 'story-led'
        ? `One of those nights at ${venue}${where}: ${finding.diagnosis.split('.')[0]}. Pull up a stool.`
        : `Heads up${where ? ` ${ctx.city}` : ''}: this week at ${venue}. ${finding.recommendedAction.split('.')[0]}.`,
    });
  });

  // 3. GBP post
  push({
    kind: 'gbp_post',
    title: `GBP post — ${venue}`,
    body: `${venue}${where}: ${finding.recommendedAction.split('.')[0]}. Stop in this week.`,
  });

  // 4. Email
  push({
    kind: 'email_draft',
    title: `Email draft`,
    meta: { subject: `Something new at ${venue}` },
    body: [
      `Hi {{first_name}},`,
      ``,
      `${finding.recommendedAction}`,
      ``,
      `If you've been meaning to come back to ${venue}, this week is a good one.`,
      ``,
      `— The ${venue} team`,
    ].join('\n'),
  });

  // 5. SMS
  push({
    kind: 'sms_draft',
    title: `SMS draft`,
    body: `${venue}: ${finding.recommendedAction.split('.')[0]}. Reply STOP to opt out.`,
  });

  // 6. Staff script
  push({
    kind: 'staff_script',
    title: `Staff talking points`,
    body: [
      `**When to use:** Tied to "${finding.title}"`,
      ``,
      `1. Acknowledge the moment ("Have you been in for…?")`,
      `2. Anchor to the offer: ${finding.recommendedAction.split('.')[0]}.`,
      `3. Close with a low-pressure ask ("Want me to grab one for you?")`,
    ].join('\n'),
  });

  // 7. Measurement plan — represented as a campaign_brief with explicit title
  push({
    kind: 'campaign_brief',
    title: `Measurement plan`,
    body: [
      `**Baseline window:** 4 weeks pre-launch`,
      `**Test window:** 4 weeks`,
      `**Primary metric:** From finding evidence`,
      `**Secondary metrics:** Cover count, attach rate, repeat-visit rate`,
      `**Decision date:** End of week 4`,
    ].join('\n'),
  });

  // 8. Blog draft (conditional)
  if (LONG_FORM_TYPES.has(finding.type)) {
    push({
      kind: 'website_block',
      title: `Blog draft`,
      body: [
        `# ${finding.title}`,
        ``,
        `${finding.diagnosis}`,
        ``,
        `## What we're doing about it`,
        finding.recommendedAction,
        ``,
        `## What this means for you`,
        `Mock long-form draft — refine with venue voice before publishing.`,
      ].join('\n'),
    });
  }

  // 9. Landing page copy (conditional)
  const isWebsite = finding.category === 'website';
  if (LANDING_PAGE_TYPES.has(finding.type) || isWebsite) {
    push({
      kind: 'website_block',
      title: `Landing page copy`,
      body: [
        `# ${finding.title}`,
        ``,
        `**Hero:** ${finding.recommendedAction.split('.')[0]}`,
        `**Sub:** ${venue}${where}`,
        ``,
        `## Section 1`,
        finding.diagnosis,
        ``,
        `## Section 2 — CTA`,
        `Inquire / book / call.`,
      ].join('\n'),
    });
    if (finding.type === 'private_party_conversion_gap') {
      push({
        kind: 'inquiry_form_spec',
        title: `Inquiry form spec`,
        body: [
          `**Fields:** name, email, phone, date, group size, budget, dietary notes`,
          `**Routing:** GM + marketing inbox`,
          `**Auto-reply:** Within 1 business hour, includes 2-tier package PDF`,
        ].join('\n'),
      });
    }
  }

  return { id: packId, findingId: finding.id, venueId: ctx.venueId, generatedAt: now, source: 'mock', brandVoice: 'casual_professional_default', assets };
}

/** Regenerate just one asset — keeps id/packId/findingId stable. */
export async function mockRegenerateAsset(
  asset: ActionPackAsset,
  context: GenerationContext,
  ctx: VenueContext,
  refinement?: string,
): Promise<ActionPackAsset> {
  // Re-run full pack and pull the matching kind+variant.
  const pack = await mockGenerateActionPack(context, ctx);
  const match = pack.assets.find(a => a.kind === asset.kind && a.variant === asset.variant && a.title === asset.title);
  const fresh = match ?? pack.assets.find(a => a.kind === asset.kind);
  if (!fresh) return { ...asset, regenerationCount: asset.regenerationCount + 1, editedAt: new Date().toISOString() };
  return {
    ...asset,
    body: refinement ? `${fresh.body}\n\n[Refinement applied: "${refinement}"]` : fresh.body,
    meta: fresh.meta ?? asset.meta,
    regenerationCount: asset.regenerationCount + 1,
    editedAt: new Date().toISOString(),
  };
}

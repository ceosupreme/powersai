// Post-Event Measurement Loop — analyzer.
// Phase B: live mode against daily_metrics + promo_redemptions + top_items,
// AI Gateway narrative, finding_campaign_links write-back, optional Asana comment.
// Mock mode preserved for demos via ?analyzeMock=1 / mode:'mock'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AnyRec = Record<string, any>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const sum = (xs: (number | null | undefined)[]) =>
  xs.reduce<number>((a, x) => a + (typeof x === 'number' && Number.isFinite(x) ? x : 0), 0);

// Stable hash for inputsHash (not crypto-secure).
const stableHash = (obj: unknown): string => {
  const s = JSON.stringify(obj, Object.keys(obj as AnyRec).sort());
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
};

// Manual ISO date math in PT to avoid UTC drift (project convention).
const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};
const fmtISO = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86400000);
const dayOfWeek = (d: Date) => d.getUTCDay(); // 0..6

// ──────────────────────────────────────────────────────────────────────────────
// Recommendation thresholds (deterministic, code-defined).
function deriveRecommendation(revDeltaPct: number | null) {
  if (revDeltaPct == null) {
    return {
      recommendation: 'Tweak' as const,
      reasoning: 'Revenue delta unavailable. Iterate before repeating.',
    };
  }
  if (revDeltaPct >= 10) {
    return {
      recommendation: 'Repeat' as const,
      reasoning: `Revenue beat baseline by ${revDeltaPct}%. Pattern is working.`,
    };
  }
  if (revDeltaPct <= -5) {
    return {
      recommendation: 'Retire' as const,
      reasoning: `Revenue underperformed baseline by ${Math.abs(revDeltaPct)}%. Stop or rebuild.`,
    };
  }
  return {
    recommendation: 'Tweak' as const,
    reasoning: `Result within ±10% of baseline. Iterate on offer or channels before repeating.`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MOCK mode (Phase A, kept for demos).
function mockAnalyze(c: AnyRec, generatedBy: 'auto' | 'manual') {
  const hasPromo = !!c.linked_toast_promo_code;
  const hasItems = Array.isArray(c.linked_menu_items) && c.linked_menu_items.length > 0;

  const tier: 1 | 2 | 3 = (hasPromo || hasItems) ? 1 : (c.start_date && c.end_date) ? 2 : 3;
  const confidence = tier === 1 ? 'High' : tier === 2 ? 'Medium' : 'Low';

  const expectedRevenue = Number(c.expected_revenue_impact ?? 0) || 4500;
  const expectedGuests = Number(c.expected_guest_count ?? 0) || 90;
  const budget = Number(c.budget ?? 0) || 400;

  const seed = (c.id || '').split('').reduce((a: number, ch: string) => a + ch.charCodeAt(0), 0);
  const lift = ((seed % 23) - 8) / 100;

  const actualRevenue = round(expectedRevenue * (1 + lift));
  const actualGuests = Math.round(expectedGuests * (1 + lift * 0.7));
  const baselineRevenue = round(expectedRevenue * 0.85);
  const baselineGuests = Math.round(expectedGuests * 0.85);
  const avgTicket = actualGuests ? round(actualRevenue / actualGuests) : null;
  const baselineAvgTicket = baselineGuests ? round(baselineRevenue / baselineGuests) : null;
  const laborCost = round(actualRevenue * (0.27 + ((seed % 5) / 100)));
  const laborRatio = actualRevenue ? round(laborCost / actualRevenue, 3) : null;
  const baselineLaborRatio = 0.28;
  const roi = budget ? round((actualRevenue - baselineRevenue) / budget, 2) : null;

  const redemptions = hasPromo ? Math.max(8, Math.round(actualGuests * 0.45)) : 0;
  const featuredUnits = hasItems ? Math.max(12, Math.round(actualGuests * 0.6)) : 0;

  const tier1 = {
    available: tier === 1,
    unavailableReason: tier === 1 ? undefined : 'No promo code or linked menu items set on this campaign.',
    promoCode: hasPromo
      ? { code: c.linked_toast_promo_code, redemptions, revenue: round(redemptions * (avgTicket ?? 18)) }
      : null,
    linkedItems: hasItems
      ? (c.linked_menu_items as string[]).map((name, i) => ({
          name,
          units: Math.max(6, Math.round(featuredUnits / (i + 1))),
          revenue: round(Math.max(6, Math.round(featuredUnits / (i + 1))) * 14),
          period: 'weekly_rollup' as const,
        }))
      : [],
    trackedLinks: [],
  };

  const revDeltaPct = round(((actualRevenue - baselineRevenue) / baselineRevenue) * 100, 1);
  const tier2 = {
    available: tier <= 2,
    unavailableReason: tier <= 2 ? undefined : 'Insufficient prior matching weeks to compute a baseline.',
    window: { start: c.start_date, end: c.end_date },
    baselineWeeks: 4,
    revenue: { actual: actualRevenue, baseline: baselineRevenue, deltaPct: revDeltaPct },
    guests: {
      actual: actualGuests, baseline: baselineGuests,
      deltaPct: round(((actualGuests - baselineGuests) / baselineGuests) * 100, 1),
    },
    avgTicket: {
      actual: avgTicket, baseline: baselineAvgTicket,
      deltaPct: avgTicket && baselineAvgTicket
        ? round(((avgTicket - baselineAvgTicket) / baselineAvgTicket) * 100, 1) : null,
    },
    topItems: hasItems
      ? (c.linked_menu_items as string[]).slice(0, 3).map((n, i) => ({ name: n, units: 40 - i * 12 }))
      : [{ name: 'House Margarita', units: 38 }, { name: 'Modelo', units: 31 }],
    labor: { cost: laborCost, ratio: laborRatio, baselineRatio: baselineLaborRatio },
  };

  const tier3 = {
    available: true,
    dayLevel: {
      actual: round(actualRevenue * 1.1), baseline: round(baselineRevenue * 1.1),
      deltaPct: revDeltaPct,
    },
  };

  const { recommendation, reasoning } = deriveRecommendation(revDeltaPct);
  const dayLabel = c.start_date
    ? new Date(c.start_date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    : 'this campaign';
  const lines = [
    `${c.title} ran on ${dayLabel} and brought in $${actualRevenue.toLocaleString()}, ${revDeltaPct >= 0 ? `${revDeltaPct}% above` : `${Math.abs(revDeltaPct)}% below`} the trailing 4-week baseline.`,
    hasPromo ? `The ${c.linked_toast_promo_code} discount was redeemed ${redemptions} times.` : null,
    hasItems ? `Linked items moved ${featuredUnits} units across ${tier1.linkedItems.length} SKU(s).` : null,
  ].filter(Boolean) as string[];

  return buildResults({
    campaign: c, generatedBy, mode: 'mock' as const,
    tier: tier as 1 | 2 | 3, confidence,
    actualRevenue, actualGuests, expectedRevenue, expectedGuests,
    laborCost, laborRatio, roi, redemptions, featuredUnits,
    tier1, tier2, tier3, narrativeSummary: lines.join(' '),
    narrativeFallback: false, recommendation, recommendationReasoning: reasoning,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// LIVE mode.
async function liveAnalyze(
  admin: ReturnType<typeof createClient>,
  c: AnyRec, generatedBy: 'auto' | 'manual',
) {
  if (!c.start_date || !c.end_date) {
    throw new Error('Campaign missing start_date/end_date — required for live attribution');
  }
  if (!c.venue_id) throw new Error('Campaign missing venue_id');

  const start = parseISO(c.start_date);
  const end = parseISO(c.end_date);
  const expectedRevenue = c.expected_revenue_impact != null ? Number(c.expected_revenue_impact) : null;
  const expectedGuests = c.expected_guest_count != null ? Number(c.expected_guest_count) : null;
  const budget = c.budget != null ? Number(c.budget) : null;

  // Build the in-window day list.
  const days: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) days.push(d);
  const inWindowISO = days.map(fmtISO);

  // Pull window daily_metrics for this venue.
  const { data: windowRows, error: wErr } = await admin
    .from('daily_metrics')
    .select('date, net_sales, guests, labor_cost, food_sales, bev_sales')
    .eq('venue_id', c.venue_id)
    .in('date', inWindowISO);
  if (wErr) throw wErr;

  // Build trailing 4-week baseline (same day-of-week set).
  const baselineDays: string[] = [];
  for (let w = 1; w <= 4; w++) {
    for (const d of days) baselineDays.push(fmtISO(addDays(d, -7 * w)));
  }
  const { data: baselineRows, error: bErr } = await admin
    .from('daily_metrics')
    .select('date, net_sales, guests, labor_cost')
    .eq('venue_id', c.venue_id)
    .in('date', baselineDays);
  if (bErr) throw bErr;

  // Tier 2 — windowed uplift.
  const winNet = sum(windowRows?.map((r: AnyRec) => Number(r.net_sales)));
  const winGuests = sum(windowRows?.map((r: AnyRec) => Number(r.guests)));
  const winLabor = sum(windowRows?.map((r: AnyRec) => Number(r.labor_cost)));

  // Group baseline rows by ISO week and require ≥2 complete weeks (each with all
  // window-day equivalents present and net_sales non-null).
  const baselineByWeek: Record<number, AnyRec[]> = {};
  for (const r of baselineRows ?? []) {
    const d = parseISO((r as AnyRec).date);
    const weeksAgo = Math.round((start.getTime() - d.getTime()) / (7 * 86400000));
    (baselineByWeek[weeksAgo] ||= []).push(r);
  }
  const completeBaselineWeeks: AnyRec[][] = [];
  for (let w = 1; w <= 4; w++) {
    const wk = baselineByWeek[w] ?? [];
    const hasAllDays = wk.length === days.length && wk.every(r => r.net_sales != null);
    if (hasAllDays) completeBaselineWeeks.push(wk);
  }
  const baselineWeeksUsed = completeBaselineWeeks.length;
  const tier2Available = baselineWeeksUsed >= 2 && (windowRows?.length ?? 0) > 0;

  let baselineNet: number | null = null;
  let baselineGuests: number | null = null;
  let baselineLabor: number | null = null;
  if (tier2Available) {
    const perWeekNet = completeBaselineWeeks.map(wk => sum(wk.map(r => Number((r as AnyRec).net_sales))));
    const perWeekGuests = completeBaselineWeeks.map(wk => sum(wk.map(r => Number((r as AnyRec).guests))));
    const perWeekLabor = completeBaselineWeeks.map(wk => sum(wk.map(r => Number((r as AnyRec).labor_cost))));
    baselineNet = round(perWeekNet.reduce((a, b) => a + b, 0) / perWeekNet.length);
    baselineGuests = Math.round(perWeekGuests.reduce((a, b) => a + b, 0) / perWeekGuests.length);
    baselineLabor = round(perWeekLabor.reduce((a, b) => a + b, 0) / perWeekLabor.length);
  }

  const revDeltaPct = tier2Available && baselineNet
    ? round(((winNet - baselineNet) / baselineNet) * 100, 1) : null;
  const guestsDeltaPct = tier2Available && baselineGuests
    ? round(((winGuests - baselineGuests) / baselineGuests) * 100, 1) : null;
  const avgTicket = winGuests ? round(winNet / winGuests) : null;
  const baselineAvgTicket = baselineGuests ? round((baselineNet ?? 0) / baselineGuests) : null;
  const avgTicketDeltaPct = avgTicket != null && baselineAvgTicket
    ? round(((avgTicket - baselineAvgTicket) / baselineAvgTicket) * 100, 1) : null;
  const laborRatio = winNet ? round(winLabor / winNet, 3) : null;
  const baselineLaborRatio = baselineNet ? round((baselineLabor ?? 0) / baselineNet, 3) : null;
  const roi = budget && tier2Available && baselineNet
    ? round((winNet - baselineNet) / budget, 2) : null;

  // Tier 1 — promo redemptions + linked items (weekly rollup).
  const hasPromo = !!c.linked_toast_promo_code;
  const hasItems = Array.isArray(c.linked_menu_items) && c.linked_menu_items.length > 0;

  let promoBlock: AnyRec | null = null;
  let promoRedemptions = 0;
  if (hasPromo) {
    const code = String(c.linked_toast_promo_code).trim();
    const { data: promos } = await admin
      .from('promotions')
      .select('id, name')
      .eq('venue_id', c.venue_id)
      .ilike('name', code);
    const promoIds = (promos ?? []).map((p: AnyRec) => p.id);
    if (promoIds.length > 0) {
      const { data: redemps } = await admin
        .from('promo_redemptions')
        .select('redemption_count, total_discount_given, estimated_revenue_lift, redemption_date')
        .in('promotion_id', promoIds)
        .gte('redemption_date', c.start_date)
        .lte('redemption_date', c.end_date);
      promoRedemptions = sum((redemps ?? []).map((r: AnyRec) => Number(r.redemption_count)));
      const promoRevenue = round(sum((redemps ?? []).map((r: AnyRec) => Number(r.estimated_revenue_lift))));
      promoBlock = { code, redemptions: promoRedemptions, revenue: promoRevenue };
    } else {
      promoBlock = { code, redemptions: 0, revenue: 0, note: 'No matching promotion in promotions table' };
    }
  }

  let linkedItemsBlock: AnyRec[] = [];
  let featuredUnits = 0;
  if (hasItems) {
    const names = (c.linked_menu_items as string[]).map(s => s.toLowerCase());
    // Find weeks overlapping the window, then top_items rows for those weeks.
    const { data: weeksRows } = await admin
      .from('weeks')
      .select('id, week_start, week_end')
      .lte('week_start', c.end_date)
      .gte('week_end', c.start_date);
    const weekIds = (weeksRows ?? []).map((w: AnyRec) => w.id);
    if (weekIds.length > 0) {
      const { data: items } = await admin
        .from('top_items')
        .select('item_name, quantity_sold, net_sales')
        .eq('venue_id', c.venue_id)
        .in('week_id', weekIds);
      const matched = (items ?? []).filter((it: AnyRec) =>
        names.includes(String(it.item_name).toLowerCase()),
      );
      // Aggregate units/revenue across overlapping weeks per item name.
      const grouped: Record<string, { units: number; revenue: number }> = {};
      for (const m of matched) {
        const key = String(m.item_name);
        const g = (grouped[key] ||= { units: 0, revenue: 0 });
        g.units += Number(m.quantity_sold) || 0;
        g.revenue += Number(m.net_sales) || 0;
      }
      linkedItemsBlock = Object.entries(grouped).map(([name, v]) => ({
        name, units: v.units, revenue: round(v.revenue), period: 'weekly_rollup' as const,
      }));
      featuredUnits = sum(linkedItemsBlock.map(i => i.units));
    }
  }

  const tier1Available = !!promoBlock || linkedItemsBlock.length > 0;
  const tier1: AnyRec = {
    available: tier1Available,
    unavailableReason: tier1Available ? undefined :
      (hasPromo || hasItems
        ? 'Promo/items linked but no matching rows found in Toast promo or weekly item data.'
        : 'No promo code or linked menu items set on this campaign.'),
    promoCode: promoBlock,
    linkedItems: linkedItemsBlock,
    trackedLinks: [],
  };

  const tier: 1 | 2 | 3 = tier1Available ? 1 : tier2Available ? 2 : 3;
  const confidence = tier === 1 ? 'High' : tier === 2 ? 'Medium' : 'Low';

  const tier2: AnyRec = {
    available: tier2Available,
    unavailableReason: tier2Available ? undefined :
      (windowRows?.length ? 'Insufficient baseline coverage (need ≥2 complete trailing weeks)' :
        'No daily_metrics rows for this venue within the campaign window.'),
    window: { start: c.start_date, end: c.end_date },
    baselineWeeks: baselineWeeksUsed,
    revenue: tier2Available ? { actual: round(winNet), baseline: baselineNet, deltaPct: revDeltaPct } : undefined,
    guests: tier2Available && winGuests ? { actual: winGuests, baseline: baselineGuests, deltaPct: guestsDeltaPct } : undefined,
    avgTicket: avgTicket != null ? { actual: avgTicket, baseline: baselineAvgTicket, deltaPct: avgTicketDeltaPct } : undefined,
    labor: { cost: round(winLabor) || null, ratio: laborRatio, baselineRatio: baselineLaborRatio },
  };

  const tier3: AnyRec = {
    available: (windowRows?.length ?? 0) > 0,
    dayLevel: tier2Available ? { actual: round(winNet), baseline: baselineNet, deltaPct: revDeltaPct } : undefined,
  };

  // AI narrative via Lovable AI Gateway. Numbers are passed as facts.
  const { narrative, fallback } = await generateNarrative({
    title: c.title, dayRange: `${c.start_date} → ${c.end_date}`,
    actualRevenue: round(winNet), revDeltaPct, baselineWeeks: baselineWeeksUsed,
    promoCode: hasPromo ? c.linked_toast_promo_code : null, redemptions: promoRedemptions,
    linkedItemUnits: featuredUnits, laborRatio, baselineLaborRatio,
  });

  const { recommendation, reasoning } = deriveRecommendation(revDeltaPct);

  return buildResults({
    campaign: c, generatedBy, mode: 'live' as const,
    tier, confidence,
    actualRevenue: round(winNet), actualGuests: winGuests || null,
    expectedRevenue, expectedGuests,
    laborCost: round(winLabor) || null, laborRatio, roi,
    redemptions: promoRedemptions, featuredUnits,
    tier1, tier2, tier3,
    narrativeSummary: narrative, narrativeFallback: fallback,
    recommendation, recommendationReasoning: reasoning,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// AI narrative — restates deterministic numbers + 1 actionable sentence.
async function generateNarrative(facts: AnyRec): Promise<{ narrative: string; fallback: boolean }> {
  const fallback = () => {
    const dir = facts.revDeltaPct == null ? 'with no baseline available' :
      facts.revDeltaPct >= 0 ? `${facts.revDeltaPct}% above the trailing baseline` :
      `${Math.abs(facts.revDeltaPct)}% below the trailing baseline`;
    const parts = [
      `${facts.title} (${facts.dayRange}) brought in $${(facts.actualRevenue ?? 0).toLocaleString()}, ${dir}.`,
      facts.promoCode ? `${facts.promoCode} was redeemed ${facts.redemptions} time(s).` : null,
      facts.linkedItemUnits ? `Linked items moved ${facts.linkedItemUnits} units (weekly rollup).` : null,
    ].filter(Boolean);
    return parts.join(' ');
  };

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return { narrative: fallback(), fallback: true };

  const system = [
    'You write 2–3 sentence campaign post-mortem summaries for restaurant operators.',
    'You MUST only use the numeric facts provided in the user message. Never invent numbers.',
    'Restate the headline result, then add ONE actionable next-step sentence.',
    'No bullet points, no markdown headings, no emojis.',
  ].join(' ');

  try {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Facts (JSON): ${JSON.stringify(facts)}\n\nWrite the summary.` },
        ],
      }),
    });
    if (!r.ok) {
      console.warn('[analyze] AI gateway non-200:', r.status, await r.text());
      return { narrative: fallback(), fallback: true };
    }
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    if (!text) return { narrative: fallback(), fallback: true };
    return { narrative: text, fallback: false };
  } catch (e) {
    console.error('[analyze] AI gateway error:', e);
    return { narrative: fallback(), fallback: true };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
function buildResults(args: AnyRec) {
  const { campaign: c, generatedBy, mode, tier, confidence,
    actualRevenue, actualGuests, expectedRevenue, expectedGuests,
    laborCost, laborRatio, roi, redemptions, featuredUnits,
    tier1, tier2, tier3, narrativeSummary, narrativeFallback,
    recommendation, recommendationReasoning } = args;

  return {
    attributedRevenue: actualRevenue,
    redemptions,
    featuredItemUnitsSold: featuredUnits,
    actualGuestCount: actualGuests,
    actualVsExpectedDelta: expectedRevenue && actualRevenue != null
      ? round(((actualRevenue - expectedRevenue) / expectedRevenue) * 100, 1) : null,
    laborCost,
    laborToRevenueRatio: laborRatio,
    roi,
    confidence,
    narrativeSummary,
    narrativeFallback,
    recommendation,
    recommendationReasoning,

    attributionTier: tier,
    tier1, tier2, tier3,
    expectations: {
      revenue: { expected: expectedRevenue, actual: actualRevenue },
      guests: { expected: expectedGuests, actual: actualGuests },
    },

    generatedAt: new Date().toISOString(),
    generatedBy,
    analysisMode: mode,
    analysisVersion: 2,
    inputsHash: stableHash({
      id: c.id, sd: c.start_date, ed: c.end_date,
      pc: c.linked_toast_promo_code ?? null,
      mi: c.linked_menu_items ?? [],
      er: expectedRevenue, eg: expectedGuests, m: mode,
    }),
    asanaCommentGid: null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Feedback loop: write/upsert finding_campaign_links row.
// Auto-resolve uses Tier 2 revenue achievement as primary signal (per Phase B
// clarification). Tier 1 redemptions are evidence, not threshold (units mismatch).
async function writeFindingLink(
  admin: ReturnType<typeof createClient>,
  c: AnyRec, results: AnyRec, findingType: string | null,
) {
  if (!c.originating_finding_id) return;

  const expectedRev = c.expected_revenue_impact != null ? Number(c.expected_revenue_impact) : null;
  const actualRev = results.attributedRevenue ?? null;
  const revDeltaPct = results.tier2?.revenue?.deltaPct ?? null;

  let outcome: 'Resolved' | 'Open' | 'Failed' | 'Inconclusive' = 'Inconclusive';
  if (results.confidence === 'High' && expectedRev != null && actualRev != null
      && actualRev >= expectedRev) {
    outcome = 'Resolved';
  } else if (
    (results.confidence === 'High' || results.confidence === 'Medium')
    && revDeltaPct != null && revDeltaPct <= -5
  ) {
    outcome = 'Failed';
  } else if (results.confidence === 'Low') {
    outcome = 'Inconclusive';
  } else {
    outcome = 'Open';
  }

  const scoreDelta = (expectedRev != null && actualRev != null)
    ? round(actualRev - expectedRev) : null;

  const { error } = await admin
    .from('finding_campaign_links')
    .upsert({
      finding_id: String(c.originating_finding_id),
      campaign_id: c.id,
      venue_id: c.venue_id,
      finding_type: findingType,
      outcome,
      score_delta: scoreDelta,
      confidence: results.confidence ?? 'Low',
      attribution_tier: results.attributionTier ?? 3,
      notes: results.narrativeSummary?.slice(0, 500) ?? null,
    }, { onConflict: 'finding_id,campaign_id' });
  if (error) console.error('[analyze] finding_campaign_links upsert error:', error);
}

// ──────────────────────────────────────────────────────────────────────────────
// Optional Asana write-back.
async function maybePostAsanaComment(
  admin: ReturnType<typeof createClient>,
  c: AnyRec, results: AnyRec, authHeader: string,
) {
  const ext = c.execution_adapter?.external_id;
  if (!ext) return;
  // Idempotency: skip if same inputsHash already posted.
  if (c.results?.asanaCommentGid && c.results?.inputsHash === results.inputsHash) return;

  const lines = [
    `📊 Post-event analysis — ${results.recommendation} (${results.confidence} confidence, Tier ${results.attributionTier}).`,
    results.tier2?.revenue
      ? `Revenue: $${Math.round(results.tier2.revenue.actual).toLocaleString()} vs $${Math.round(results.tier2.revenue.baseline).toLocaleString()} baseline (${results.tier2.revenue.deltaPct >= 0 ? '+' : ''}${results.tier2.revenue.deltaPct}%).`
      : null,
    results.tier1?.promoCode?.redemptions
      ? `Promo redemptions: ${results.tier1.promoCode.redemptions}.`
      : null,
    results.tier1?.linkedItems?.length
      ? `Linked items: ${results.tier1.linkedItems.reduce((a: number, i: AnyRec) => a + (i.units || 0), 0)} units (weekly rollup).`
      : null,
    '',
    results.narrativeSummary,
  ].filter(Boolean);

  try {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/marketing-asana-comment`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_task_id: ext, text: lines.join('\n') }),
    });
    if (r.ok) {
      const j = await r.json();
      results.asanaCommentGid = j?.comment_gid ?? null;
      await admin.from('marketing_campaigns').update({ results }).eq('id', c.id);
    } else {
      console.warn('[analyze] asana comment failed:', r.status, await r.text());
    }
  } catch (e) {
    console.error('[analyze] asana comment error:', e);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } =
      await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { campaign_id, mode = 'live', generated_by = 'manual', finding_type = null } = await req.json();
    if (!campaign_id) return json({ error: "campaign_id required" }, 400);
    if (!['live', 'mock'].includes(mode)) return json({ error: "mode must be 'live' or 'mock'" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: campaign, error: gErr } = await admin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!campaign) return json({ error: "Campaign not found" }, 404);

    const results = mode === 'live'
      ? await liveAnalyze(admin, campaign, generated_by)
      : mockAnalyze(campaign, generated_by);

    const { error: uErr } = await admin
      .from("marketing_campaigns")
      .update({ results, updated_at: new Date().toISOString() })
      .eq("id", campaign_id);
    if (uErr) throw uErr;

    // Feedback loop + Asana write-back (best-effort).
    await writeFindingLink(admin, campaign, results, finding_type);
    await maybePostAsanaComment(admin, campaign, results, authHeader);

    return json({ ok: true, results });
  } catch (err) {
    console.error("[marketing-campaign-analyze]", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// Post-Event Measurement Loop — analysis card.
// Shape contract documented in marketing-hub/types.ts (`CampaignResults`).
// Phase A: backed by deterministic mock analyzer. Phase B: real Toast/7shifts.

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowDownRight, ArrowUpRight, Loader2, RefreshCw, Sparkles, ShieldCheck, ShieldAlert, Shield,
} from 'lucide-react';
import type { Campaign, CampaignResults, ConfidenceLevel, Recommendation, TierMetric } from './types';
import { useCampaignStore } from './useCampaignStore';
import { RecommendationBadge } from './badges';

// Phase A: legacy seeded `results` blocks only carry headline fields.
// Derive provenance + expectations from the campaign so the card renders fully
// even before a fresh `marketing-campaign-analyze` run. Never invent values:
// expectations are populated only when BOTH expected and actual are known.
const deriveResults = (campaign: Campaign, r: CampaignResults): CampaignResults => {
  const out: CampaignResults = { ...r };
  if (!out.generatedAt) out.generatedAt = campaign.updatedAt;
  if (!out.generatedBy) out.generatedBy = 'manual';
  if (!out.expectations) {
    const eg = campaign.expectedGuestCount;
    const er = campaign.expectedRevenueImpact;
    out.expectations = {
      revenue: { expected: er ?? null, actual: r.attributedRevenue ?? null },
      guests: { expected: eg ?? null, actual: r.actualGuestCount ?? null },
    };
  }
  return out;
};

const fmt$ = (n?: number | null) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString()}`;
const fmtNum = (n?: number | null) => n == null ? '—' : n.toLocaleString();
const fmtPct = (n?: number | null) =>
  n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtRatio = (n?: number | null) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;
const fmtRel = (iso?: string) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const ConfidenceChip = ({ level, tier }: { level?: ConfidenceLevel; tier?: 1 | 2 | 3 }) => {
  if (!level) return null;
  const Icon = level === 'High' ? ShieldCheck : level === 'Medium' ? Shield : ShieldAlert;
  // Use semantic tokens (no raw colors).
  const cls =
    level === 'High'
      ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/5'
      : level === 'Medium'
      ? 'border-amber-500/40 text-amber-700 bg-amber-500/5'
      : 'border-muted-foreground/40 text-muted-foreground bg-muted/30';
  const explain =
    level === 'High'
      ? 'Tier 1 — Direct linkage. Promo redemptions or linked menu items measured against actuals.'
      : level === 'Medium'
      ? 'Tier 2 — Time-window uplift. Compared against the trailing 4 matching weekday/daypart windows.'
      : 'Tier 3 — Halo estimate. Day/shift-level lift; indirect attribution only.';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${cls}`}>
            <Icon className="w-3.5 h-3.5" />
            {level} confidence{tier ? ` · Tier ${tier}` : ''}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{explain}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const Delta = ({ pct }: { pct?: number | null }) => {
  if (pct == null) return <span className="text-muted-foreground text-xs">—</span>;
  const good = pct >= 0;
  const Icon = good ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${good ? 'text-emerald-600' : 'text-destructive'}`}>
      <Icon className="w-3 h-3" />
      {fmtPct(pct)}
    </span>
  );
};

const DashWithReason = ({ reason }: { reason?: string }) => {
  if (!reason) return <span>—</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
            —
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const MetricCell = ({
  label, value, sub, delta, unavailableReason,
}: { label: string; value: string; sub?: string; delta?: number | null; unavailableReason?: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">
      {value === '—' ? <DashWithReason reason={unavailableReason} /> : value}
    </div>
    <div className="flex items-center gap-2 mt-0.5">
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      {delta != null && <Delta pct={delta} />}
    </div>
  </div>
);

const ExpectationsBar = ({
  label, expected, actual,
}: { label: string; expected?: number | null; actual?: number | null; }) => {
  // All-or-nothing: only render bars when BOTH sides are populated.
  if (expected == null || actual == null) {
    const reason =
      expected == null && actual == null
        ? 'Set Expected Guests / Expected Revenue on the campaign and run analysis to enable comparison.'
        : expected == null
        ? 'No expected value set for this campaign.'
        : 'Actual values not yet available for this campaign.';
    return (
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
        <div className="text-sm text-muted-foreground"><DashWithReason reason={reason} /></div>
      </div>
    );
  }
  const e = expected;
  const a = actual;
  const max = Math.max(e, a, 1);
  const ePct = (e / max) * 100;
  const aPct = (a / max) * 100;
  const delta = e ? ((a - e) / e) * 100 : null;
  const good = (delta ?? 0) >= 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <Delta pct={delta} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-muted-foreground">Expected</span>
          <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full bg-muted-foreground/50 rounded-full" style={{ width: `${ePct}%` }} />
          </div>
          <span className="w-20 text-right text-xs">{label.toLowerCase().includes('revenue') ? fmt$(e) : fmtNum(e)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-muted-foreground">Actual</span>
          <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${good ? 'bg-emerald-500' : 'bg-destructive'}`}
              style={{ width: `${aPct}%` }}
            />
          </div>
          <span className="w-20 text-right text-xs font-medium">
            {label.toLowerCase().includes('revenue') ? fmt$(a) : fmtNum(a)}
          </span>
        </div>
      </div>
    </div>
  );
};

const TierStatus = ({ available, reason }: { available: boolean; reason?: string }) =>
  available ? (
    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">Used</Badge>
  ) : (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      Not used{reason ? ` · ${reason}` : ''}
    </Badge>
  );

export const CampaignResultsCard = ({
  campaign, onCampaignChange,
}: {
  campaign: Campaign;
  onCampaignChange?: (c: Campaign) => void;
}) => {
  const { update } = useCampaignStore();
  const [running, setRunning] = useState(false);
  const raw = campaign.results ?? {};
  const has = !!raw.attributionTier || !!raw.narrativeSummary;
  const r = has ? deriveResults(campaign, raw) : raw;

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-campaign-analyze', {
        body: { campaign_id: campaign.id, mode: 'mock', generated_by: 'manual' },
      });
      if (error) throw error;
      const next = { ...campaign, results: data.results };
      onCampaignChange?.(next);
      await update(campaign.id, { results: data.results });
      sonnerToast.success('Analysis generated');
    } catch (e) {
      console.error(e);
      sonnerToast.error('Analysis failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setRunning(false);
    }
  };

  if (!has) {
    return (
      <Card className="p-4 border-l-4 border-l-amber-500/70">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Post-Event Analysis
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Generate AI-powered attribution analysis for this campaign.
            </p>
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate Analysis
          </Button>
        </div>
      </Card>
    );
  }

  const tier1 = r.tier1;
  const tier2 = r.tier2;
  const tier3 = r.tier3;

  return (
    <Card className="p-4 border-l-4 border-l-amber-500/70 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Post-Event Analysis
          </h3>
          <ConfidenceChip level={r.confidence} tier={r.attributionTier} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            Generated {fmtRel(r.generatedAt)} · {r.generatedBy ?? 'manual'}
          </span>
          <Button size="sm" variant="ghost" onClick={runAnalysis} disabled={running} className="gap-1.5 h-7">
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regenerate
          </Button>
        </div>
      </div>

      {/* Recommendation banner */}
      {r.recommendation && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 flex items-start gap-3">
          <RecommendationBadge rec={r.recommendation as Recommendation} />
          <p className="text-sm text-foreground flex-1">{r.recommendationReasoning ?? ''}</p>
        </div>
      )}

      {/* Narrative */}
      {r.narrativeSummary && (
        <div className="border-l-2 border-primary/40 pl-3">
          <p className="text-sm italic text-foreground">{r.narrativeSummary}</p>
        </div>
      )}

      {/* Key metrics grid */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Key metrics</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <MetricCell
            label="Attributed revenue"
            value={fmt$(r.attributedRevenue)}
            delta={tier2?.revenue?.deltaPct}
            unavailableReason="Attribution unavailable at the current tier."
          />
          <MetricCell
            label="Redemptions"
            value={fmtNum(r.redemptions)}
            unavailableReason="No promo code linked to this campaign — Tier 1 direct redemption tracking unavailable."
          />
          <MetricCell
            label="Featured units"
            value={fmtNum(r.featuredItemUnitsSold)}
            unavailableReason="No menu items linked to this campaign — Tier 1 direct item tracking unavailable."
          />
          <MetricCell
            label="Guests"
            value={fmtNum(r.actualGuestCount)}
            sub={tier2?.guests?.baseline != null ? `vs ${fmtNum(tier2.guests.baseline)} baseline` : undefined}
            delta={tier2?.guests?.deltaPct}
            unavailableReason="Guest count not available for the campaign window."
          />
          <MetricCell
            label="Avg ticket"
            value={tier2?.avgTicket?.actual != null ? fmt$(tier2.avgTicket.actual) : '—'}
            sub={tier2?.avgTicket?.baseline != null ? `vs ${fmt$(tier2.avgTicket.baseline)} baseline` : undefined}
            delta={tier2?.avgTicket?.deltaPct}
            unavailableReason="Avg ticket requires hourly Toast data for this window; not available at the current attribution tier."
          />
          <MetricCell
            label="ROI"
            value={r.roi != null ? `${r.roi}x` : '—'}
            unavailableReason="Requires a campaign budget and a baseline to compute return on investment."
          />
          <MetricCell
            label="Labor cost"
            value={fmt$(r.laborCost)}
            unavailableReason="Requires 7shifts labor cost for the campaign window; not available at the current attribution tier."
          />
          <MetricCell
            label="Labor : revenue"
            value={fmtRatio(r.laborToRevenueRatio)}
            sub={tier2?.labor?.baselineRatio != null ? `vs ${fmtRatio(tier2.labor.baselineRatio)} baseline` : undefined}
            unavailableReason="Requires labor cost + attributed revenue; not available at the current attribution tier."
          />
        </div>
      </div>

      <Separator />

      {/* vs Expectations */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">vs. Expectations</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExpectationsBar
            label="Revenue"
            expected={r.expectations?.revenue?.expected}
            actual={r.expectations?.revenue?.actual}
          />
          <ExpectationsBar
            label="Guests"
            expected={r.expectations?.guests?.expected}
            actual={r.expectations?.guests?.actual}
          />
        </div>
      </div>

      {/* Tier accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="tiers" className="border-none">
          <AccordionTrigger className="text-xs uppercase tracking-wide text-muted-foreground hover:no-underline py-2">
            Attribution tier breakdown
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            {/* Tier 1 */}
            <Card className="p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">Tier 1 — Direct linkage</div>
                <TierStatus available={!!tier1?.available} reason={tier1?.unavailableReason} />
              </div>
              {tier1?.available ? (
                <div className="space-y-1 text-xs">
                  {tier1.promoCode && (
                    <div>Promo <code className="bg-muted px-1 rounded">{tier1.promoCode.code}</code> · {tier1.promoCode.redemptions} redemptions · {fmt$(tier1.promoCode.revenue)}</div>
                  )}
                  {tier1.linkedItems && tier1.linkedItems.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Linked items</div>
                      <ul className="ml-3 list-disc">
                        {tier1.linkedItems.map(it => (
                          <li key={it.name}>{it.name} — {it.units} units · {fmt$(it.revenue)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{tier1?.unavailableReason ?? 'Not used.'}</div>
              )}
            </Card>

            {/* Tier 2 */}
            <Card className="p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">Tier 2 — Time-window uplift</div>
                <TierStatus available={!!tier2?.available} reason={tier2?.unavailableReason} />
              </div>
              {tier2?.available ? (
                <div className="space-y-1 text-xs">
                  <div className="text-muted-foreground">
                    Window {tier2.window?.start} → {tier2.window?.end} · baseline = trailing {tier2.baselineWeeks} matching weeks
                  </div>
                  <div>Revenue: {fmt$(tier2.revenue?.actual)} vs {fmt$(tier2.revenue?.baseline)} baseline ({fmtPct(tier2.revenue?.deltaPct)})</div>
                  <div>Guests: {fmtNum(tier2.guests?.actual)} vs {fmtNum(tier2.guests?.baseline)} baseline ({fmtPct(tier2.guests?.deltaPct)})</div>
                  {tier2.topItems && tier2.topItems.length > 0 && (
                    <div>Top items in window: {tier2.topItems.map(i => `${i.name} (${i.units})`).join(', ')}</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{tier2?.unavailableReason ?? 'Not used.'}</div>
              )}
            </Card>

            {/* Tier 3 */}
            <Card className="p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold">Tier 3 — Halo estimate</div>
                <TierStatus available={!!tier3?.available} reason={tier3?.unavailableReason} />
              </div>
              {tier3?.available && tier3.dayLevel ? (
                <div className="text-xs">
                  Day-level revenue: {fmt$(tier3.dayLevel.actual)} vs {fmt$(tier3.dayLevel.baseline)} baseline ({fmtPct(tier3.dayLevel.deltaPct)})
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{tier3?.unavailableReason ?? 'Not used.'}</div>
              )}
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

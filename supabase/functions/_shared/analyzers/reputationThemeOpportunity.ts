// Analyzer — Reputation Theme Opportunity
// Detects positive customer themes that aren't yet in active marketing.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'reputation_theme_opportunity';
const CATEGORY = 'reputation';
const DAY = 86_400_000;

const MARKETABLE_CATEGORIES = new Set(['food', 'drinks', 'event', 'atmosphere', 'menu_item']);

function tokens(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function isThemeInCampaign(themeLabel: string, campaign: any): boolean {
  const themeTokens = themeLabel.toLowerCase().split('_').filter((t) => t.length >= 3);
  if (themeTokens.length === 0) return false;

  const haystack = new Set<string>([
    ...tokens(campaign.title),
    ...tokens(campaign.description),
    ...tokens(campaign.objective),
  ]);

  // linked_menu_items can be array of strings or array of objects {name?, item?}
  const items = Array.isArray(campaign.linked_menu_items) ? campaign.linked_menu_items : [];
  for (const it of items) {
    if (typeof it === 'string') tokens(it).forEach((t) => haystack.add(t));
    else if (it && typeof it === 'object') {
      tokens(it.name ?? it.item ?? '').forEach((t) => haystack.add(t));
    }
  }

  return themeTokens.every((t) => haystack.has(t)) || themeTokens.some((t) => haystack.has(t));
}

export const reputationThemeOpportunityAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const since90 = new Date(Date.now() - 90 * DAY).toISOString();
      const since30 = new Date(Date.now() - 30 * DAY).toISOString();

      const { data: themes, error } = await supabase
        .from('review_themes')
        .select('id, review_id, theme_label, theme_category, theme_sentiment, excerpt, confidence, created_at')
        .eq('venue_id', venueId)
        .gte('created_at', since90);
      if (error) throw error;

      if (!themes || themes.length === 0) {
        result.note = 'no themes';
        result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, []);
        result.ms = Date.now() - t0;
        return result;
      }

      // Aggregate by canonical label, only for marketable categories.
      type Agg = {
        label: string; category: string;
        positive: number; negative: number; neutral: number;
        count30: number;
        excerpts: string[];
      };
      const agg = new Map<string, Agg>();
      for (const t of themes) {
        if (!MARKETABLE_CATEGORIES.has(t.theme_category)) continue;
        const a = agg.get(t.theme_label) ?? {
          label: t.theme_label, category: t.theme_category,
          positive: 0, negative: 0, neutral: 0, count30: 0, excerpts: [],
        };
        a[t.theme_sentiment as 'positive' | 'negative' | 'neutral'] += 1;
        if (t.created_at >= since30) a.count30 += 1;
        if (t.excerpt && a.excerpts.length < 3) a.excerpts.push(t.excerpt);
        agg.set(t.theme_label, a);
      }

      // Pull active/recent campaigns for cross-reference.
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, title, description, objective, linked_menu_items, status, end_date, start_date')
        .eq('venue_id', venueId)
        .or(`end_date.gte.${since90.slice(0, 10)},end_date.is.null`);

      const activeCampaigns = (campaigns ?? []).filter((c) => c.status !== 'archived');
      const campaignsChecked = activeCampaigns.map((c) => ({ id: c.id, title: c.title }));

      const currentKeys: string[] = [];

      for (const a of agg.values()) {
        const total = a.positive + a.negative + a.neutral;
        if (total < 3) continue;
        if (a.positive / total < 0.7) continue;

        // Skip if any active campaign already promotes this theme.
        const inMarketing = activeCampaigns.some((c) => isThemeInCampaign(a.label, c));
        if (inMarketing) continue;

        let severity: FindingSeverity =
          total >= 10 ? 'High' : total >= 5 ? 'Medium' : 'Low';
        // Trend bump: if last-30d count is ≥ half of total, treat as rising.
        const rising = a.count30 >= Math.max(2, total / 2);
        if (rising && severity !== 'High') {
          severity = severity === 'Low' ? 'Medium' : 'High';
        }

        const conf = total >= 10 ? 5 : total >= 5 ? 4 : 3;
        const sk = `reputation_opp:${a.label}`;
        currentKeys.push(sk);

        const themeDisplay = a.label.replace(/_/g, ' ');
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity,
          title: `Customers love "${themeDisplay}" — not in current marketing`,
          diagnosis: `${a.positive} of the last ${total} reviews touching "${themeDisplay}" are positive (${Math.round((a.positive / total) * 100)}%). No active campaign in the last 90 days promotes this theme.`,
          recommended_action: `Build a campaign or social post featuring "${themeDisplay}" — customers are already talking about it.`,
          evidence: {
            summary: `${total} mentions in last 90 days, ${a.count30} in last 30 days. Sample: ${a.excerpts.slice(0, 2).map((e) => `"${e}"`).join(' • ') || '(no excerpts)'}`,
            sources: [{ label: 'Review theme extraction', ref: `venue:${venueId}:${a.label}` }],
          },
          revenue_upside: severity === 'High' ? 4 : severity === 'Medium' ? 3 : 2,
          ease: 4, confidence: conf, operational_risk: 1,
          is_traffic_driving: true,
          metadata: {
            theme_label: a.label,
            theme_category: a.category,
            mention_count_30d: a.count30,
            mention_count_90d: total,
            sentiment_breakdown: { positive: a.positive, negative: a.negative, neutral: a.neutral },
            sample_excerpts: a.excerpts,
            campaigns_checked: campaignsChecked,
          },
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, currentKeys);
      result.ms = Date.now() - t0;
      return result;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      result.ms = Date.now() - t0;
      return result;
    }
  },
};

// Analyzer 4 — Menu Item Under-Promotion
// Top-20% items by net_sales (over the trailing 90 days, weekly grain) that
// haven't been linked to any marketing campaign in the same window.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'menu_item_under_promotion';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const menuItemUnderPromotionAnalyzer: AnalyzerModule = {
  id: 'menu_item_under_promotion',
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      // 1) Resolve the last ~12 week_ids for this venue.
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data: weeks, error: wErr } = await supabase
        .from('weeks')
        .select('id, week_start')
        .eq('bar_id', venueId)  // weeks.bar_id is uuid pointing at venues.id
        .gte('week_start', sinceStr)
        .order('week_start', { ascending: false });
      if (wErr) throw wErr;

      const weekIds = (weeks ?? []).map(w => w.id);
      if (weekIds.length === 0) {
        result.note = 'no recent weeks';
        result.ms = Date.now() - t0;
        return result;
      }

      // 2) Pull top_items rows for those weeks.
      const { data: items, error: iErr } = await supabase
        .from('top_items')
        .select('week_id, item_name, category, net_sales')
        .eq('venue_id', venueId)
        .in('week_id', weekIds);
      if (iErr) throw iErr;

      if (!items || items.length === 0) {
        result.note = 'no top_items data';
        result.ms = Date.now() - t0;
        return result;
      }

      // 3) Compute per-week percentile per item, then aggregate.
      type Agg = {
        itemName: string; category: string | null;
        bestPctile: number; weeksInTop20: number; recentNetSales: number;
        weeksSeen: number;
      };
      const byWeek = new Map<string, any[]>();
      for (const r of items) {
        if (!byWeek.has(r.week_id)) byWeek.set(r.week_id, []);
        byWeek.get(r.week_id)!.push(r);
      }
      const agg = new Map<string, Agg>();
      for (const [, rows] of byWeek) {
        const sorted = [...rows].filter(r => Number(r.net_sales) > 0).sort((a, b) => Number(b.net_sales) - Number(a.net_sales));
        const total = sorted.length;
        if (total === 0) continue;
        sorted.forEach((r, idx) => {
          const pctile = 1 - idx / total; // top item = pctile ~1
          const key = r.item_name as string;
          const a = agg.get(key) ?? {
            itemName: r.item_name, category: r.category ?? null,
            bestPctile: 0, weeksInTop20: 0, recentNetSales: 0, weeksSeen: 0,
          };
          a.bestPctile = Math.max(a.bestPctile, pctile);
          if (pctile >= 0.80) a.weeksInTop20 += 1;
          a.recentNetSales += Number(r.net_sales);
          a.weeksSeen += 1;
          agg.set(key, a);
        });
      }

      // 4) Filter: eligible = top-20% in ≥1 of last 12 weeks.
      const eligible = [...agg.values()].filter(a => a.weeksInTop20 >= 1);
      if (eligible.length === 0) {
        result.ms = Date.now() - t0;
        return result;
      }

      // 5) Pull recent campaign linked_menu_items.
      const { data: camps, error: cErr } = await supabase
        .from('marketing_campaigns')
        .select('id, linked_menu_items, start_date')
        .eq('venue_id', venueId)
        .gte('start_date', sinceStr);
      if (cErr) throw cErr;

      const promoted = new Set<string>();
      for (const c of camps ?? []) {
        const arr = Array.isArray(c.linked_menu_items) ? c.linked_menu_items : [];
        for (const item of arr) {
          const name = typeof item === 'string' ? item : item?.name ?? item?.item_name;
          if (typeof name === 'string') promoted.add(name.trim().toLowerCase());
        }
      }

      const currentKeys: string[] = [];

      for (const a of eligible) {
        if (promoted.has(a.itemName.trim().toLowerCase())) continue;

        let severity: FindingSeverity;
        if (a.bestPctile >= 0.95) severity = 'Critical';
        else if (a.bestPctile >= 0.90) severity = 'High';
        else severity = 'Medium';

        const confidence = a.weeksInTop20 >= 8 ? 5 : a.weeksInTop20 >= 2 ? 3 : 2;
        const signalKey = `menu_under:item=${slug(a.itemName)}`;
        currentKeys.push(signalKey);

        const pctileStr = `${Math.round(a.bestPctile * 100)}th`;
        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'menu',
          severity,
          title: `"${a.itemName}" sells well but isn't featured anywhere`,
          diagnosis: `"${a.itemName}" has been a top-${100 - Math.round(a.bestPctile * 100)}% seller in ${a.weeksInTop20} of the last ${weekIds.length} weeks (${Math.round(a.recentNetSales).toLocaleString()} in net sales over the window) but does not appear in any marketing campaign in the last 90 days.`,
          recommended_action: `Feature "${a.itemName}" in a 2-week social + GBP push and add it to staff suggestive-sell scripts; measure the volume lift against the trailing 4-week average.`,
          evidence: {
            summary: `Top ${pctileStr} percentile across ${a.weeksInTop20} of last ${weekIds.length} weeks. Zero linked campaigns in last 90 days.`,
            sources: [
              { label: 'Toast — Item mix (top_items)', ref: `top_items:venue=${venueId}` },
              { label: 'Marketing campaigns', ref: `marketing_campaigns:venue=${venueId}` },
            ],
          },
          revenue_upside: 4,
          ease: 4,
          confidence,
          operational_risk: 1,
          is_traffic_driving: false,
          metadata: {
            itemName: a.itemName,
            category: a.category,
            bestPercentile: a.bestPctile,
            weeksInTop20: a.weeksInTop20,
            weeksSeen: a.weeksSeen,
            recentNetSales: Math.round(a.recentNetSales),
          },
        });
        if (inserted) result.inserted += 1; else result.updated += 1;
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'item now featured in active marketing', 'menu-under-analyzer',
        );
      } catch (e) {
        result.errors.push(`reconcile: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
    result.ms = Date.now() - t0;
    return result;
  },
};

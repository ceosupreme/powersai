// Analyzer 3 — Event Underperformance
// Recurring events whose actual revenue trails the DOW baseline by >10%
// across the last 4 instances. Single-instance / one-time events are skipped.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { getShiftBaselines } from './shiftBaselines.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'event_underperformance';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const eventUnderperformanceAnalyzer: AnalyzerModule = {
  id: 'event_underperformance',
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      // marketing_campaigns.venue_id is text holding the UUID string.
      const { data: campaigns, error } = await supabase
        .from('marketing_campaigns')
        .select('id, title, type, status, recurrence, start_date, end_date, results')
        .eq('venue_id', venueId)
        .eq('type', 'Event')
        .eq('status', 'Ended')
        .not('results', 'is', null)
        .order('end_date', { ascending: false });
      if (error) throw error;

      const baselines = await getShiftBaselines(supabase, venueId);

      // Group by title (case-insensitive trimmed).
      const groups = new Map<string, any[]>();
      for (const c of campaigns ?? []) {
        const key = (c.title ?? '').trim().toLowerCase();
        if (!key) continue;
        // Skip pure one-time singletons later when we count.
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }

      const currentKeys: string[] = [];

      for (const [titleKey, instances] of groups.entries()) {
        if (instances.length < 2) { result.skipped += 1; continue; }

        const recent = instances.slice(0, 4);
        const eventTitle = recent[0].title as string;

        // Pull actual revenue from each instance's results (best-effort).
        const actuals: { id: string; revenue: number; dow: number; baseline: number }[] = [];
        for (const inst of recent) {
          const rev = pickRevenue(inst.results);
          if (rev == null || rev <= 0) continue;
          const [y, m, d] = String(inst.start_date).split('-').map(Number);
          const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          const baseline = baselines.byDow[dow]?.baseline ?? 0;
          if (baseline <= 0) continue;
          actuals.push({ id: inst.id, revenue: rev, dow, baseline });
        }
        if (actuals.length < 2) { result.skipped += 1; continue; }

        const avgActual = actuals.reduce((a, b) => a + b.revenue, 0) / actuals.length;
        const avgBaseline = actuals.reduce((a, b) => a + b.baseline, 0) / actuals.length;
        const deltaPct = (avgActual - avgBaseline) / avgBaseline;
        if (deltaPct >= -0.10) continue; // not underperforming enough

        const missCount = actuals.filter(a => a.revenue < a.baseline).length;
        const missRatio = missCount / actuals.length;
        const severity: FindingSeverity = missRatio > 0.5 ? 'High' : 'Medium';
        const confidence = actuals.length >= 4 ? 5 : 3;

        const worst = [...actuals].sort((a, b) => (a.revenue - a.baseline) - (b.revenue - b.baseline)).slice(0, 2);
        const signalKey = `event_under:title=${slug(titleKey)}`;
        currentKeys.push(signalKey);
        const dropPct = Math.round(-deltaPct * 100);

        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'events',
          severity,
          title: `"${eventTitle}" trailing baseline by ${dropPct}% across last ${actuals.length} runs`,
          diagnosis: `The recurring event "${eventTitle}" averaged ${Math.round(avgActual).toLocaleString()} in net sales across its last ${actuals.length} instances — ${dropPct}% below the venue's typical revenue for those nights (${Math.round(avgBaseline).toLocaleString()}). It missed baseline on ${missCount} of ${actuals.length} runs.`,
          recommended_action: `Decide before the next instance: kill, change theme/offer/timing, or hold for one more measured run with a clear go/no-go threshold.`,
          evidence: {
            summary: `Avg actual ${Math.round(avgActual).toLocaleString()} vs DOW baseline ${Math.round(avgBaseline).toLocaleString()} across ${actuals.length} instances.`,
            sources: [
              { label: 'Marketing campaigns', ref: `marketing_campaigns:venue=${venueId}` },
              { label: 'Toast — Daily metrics', ref: `daily_metrics:venue=${venueId}` },
            ],
          },
          revenue_upside: 3,
          ease: 2,
          confidence,
          operational_risk: 2,
          is_traffic_driving: false,
          metadata: {
            eventTitle,
            instances: actuals.length,
            avgActual: Math.round(avgActual),
            avgBaseline: Math.round(avgBaseline),
            deltaPct,
            worstInstanceIds: worst.map(w => w.id),
          },
        });
        if (inserted) result.inserted += 1; else result.updated += 1;
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'event returned to baseline', 'event-under-analyzer',
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

/** Best-effort revenue extraction from campaign results JSONB. */
function pickRevenue(results: any): number | null {
  if (!results || typeof results !== 'object') return null;
  const candidates = [
    results.actualRevenue, results.actual_revenue, results.netSales, results.net_sales,
    results.revenue, results.totalRevenue, results.total_revenue,
    results.actuals?.netSales, results.actuals?.revenue,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

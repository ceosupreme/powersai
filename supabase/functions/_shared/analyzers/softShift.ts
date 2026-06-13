// Analyzer 1 — Soft Shift Opportunity (DOW granularity)
// See mem://features/growth-audit/shift-analyzer-granularity for the daypart deferral.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { getShiftBaselines, DOW_FULL } from './shiftBaselines.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'soft_shift_opportunity';

function severityFor(deltaPct: number): FindingSeverity | null {
  const drop = -deltaPct; // positive number = how far below baseline
  if (drop > 0.30) return 'Critical';
  if (drop > 0.20) return 'High';
  if (drop >= 0.15) return 'Medium';
  return null;
}

export const softShiftAnalyzer: AnalyzerModule = {
  id: 'soft_shift_opportunity',
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const snap = await getShiftBaselines(supabase, venueId);
      if (snap.weeksAvailable < 4) {
        result.note = `insufficient data: ${snap.weeksAvailable} weeks`;
        result.ms = Date.now() - t0;
        return result;
      }

      const confidence = snap.weeksAvailable >= 12 ? 5 : 3;
      const currentKeys: string[] = [];

      for (let dow = 0; dow < 7; dow++) {
        const s = snap.byDow[dow];
        if (s.n < 4 || s.recent4 === 0 || s.baseline === 0) continue;
        const sev = severityFor(s.deltaPct);
        if (!sev) continue;

        const signalKey = `soft_shift:dow=${dow}`;
        currentKeys.push(signalKey);
        const dropPct = Math.round(-s.deltaPct * 100);
        const dayName = DOW_FULL[dow];

        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'revenue',
          severity: sev,
          title: `${dayName} revenue running ${dropPct}% below baseline`,
          diagnosis: `${dayName}s have averaged ${Math.round(s.recent4).toLocaleString()} in net sales over the last 4 weeks — ${dropPct}% below this venue's typical ${dayName} baseline of ${Math.round(s.baseline).toLocaleString()}.`,
          recommended_action: `Test a targeted promo or content push aimed at ${dayName} traffic; measure for 4 weeks against the current 4-week baseline.`,
          evidence: {
            summary: `Trailing 12-week ${dayName} baseline vs. last 4 ${dayName}s.`,
            sources: [{ label: 'Toast — Daily metrics', ref: `daily_metrics:venue=${venueId}` }],
          },
          revenue_upside: 4,
          ease: 3,
          confidence,
          operational_risk: 2,
          is_traffic_driving: true,
          metadata: {
            dow, dayName,
            baseline: Math.round(s.baseline),
            recent4: Math.round(s.recent4),
            deltaPct: s.deltaPct,
            weeksAvailable: snap.weeksAvailable,
          },
        });
        if (inserted) result.inserted += 1; else result.updated += 1;
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'shift recovered above threshold', 'soft-shift-analyzer',
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

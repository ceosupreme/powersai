// Analyzer 2 — Strong Shift Amplification (mirror of Soft Shift)

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { getShiftBaselines, DOW_FULL } from './shiftBaselines.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'strong_shift_amplification';

function severityFor(deltaPct: number): FindingSeverity | null {
  if (deltaPct > 0.30) return 'Critical';
  if (deltaPct > 0.20) return 'High';
  if (deltaPct >= 0.15) return 'Medium';
  return null;
}

export const strongShiftAnalyzer: AnalyzerModule = {
  id: 'strong_shift_amplification',
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
        if (s.n < 4 || s.baseline === 0) continue;
        const sev = severityFor(s.deltaPct);
        if (!sev) continue;

        const signalKey = `strong_shift:dow=${dow}`;
        currentKeys.push(signalKey);
        const liftPct = Math.round(s.deltaPct * 100);
        const dayName = DOW_FULL[dow];

        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'revenue',
          severity: sev,
          title: `${dayName} running ${liftPct}% above baseline — amplify it`,
          diagnosis: `${dayName}s have averaged ${Math.round(s.recent4).toLocaleString()} in net sales over the last 4 weeks — ${liftPct}% above this venue's typical ${dayName} baseline of ${Math.round(s.baseline).toLocaleString()}.`,
          recommended_action: `Build a content series + email feature around ${dayName} to compound the lift while it's hot.`,
          evidence: {
            summary: `Trailing 12-week ${dayName} baseline vs. last 4 ${dayName}s.`,
            sources: [{ label: 'Toast — Daily metrics', ref: `daily_metrics:venue=${venueId}` }],
          },
          revenue_upside: 3,
          ease: 4,
          confidence,
          operational_risk: 1,
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
          'shift no longer outperforms baseline', 'strong-shift-analyzer',
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

// Analyzer — Reputation Risk
// Negative review themes, optionally enriched with operational signals
// (labor variance, manager logs) when timing context is present.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'reputation_risk';
const CATEGORY = 'reputation';
const DAY = 86_400_000;

const FIXABLE_CATEGORIES = new Set(['service', 'food', 'cleanliness', 'staff', 'menu_item']);
const CRITICAL_CATEGORIES = new Set(['cleanliness', 'safety']);
const CRITICAL_LABEL_HINTS = ['food_safety', 'food_poisoning', 'harassment', 'unsafe', 'sick', 'rodent', 'roach'];

const TIME_CONTEXTS = new Set([
  'late_night', 'weekend', 'lunch', 'happy_hour', 'brunch', 'dinner',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

const KITCHEN_KEYWORDS = ['backed up', 'backup', '86', 'eighty-six', 'out of', 'kitchen slow', 'short staffed', 'shortstaffed'];

export const reputationRiskAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const since90 = new Date(Date.now() - 90 * DAY).toISOString();
      const since30 = new Date(Date.now() - 30 * DAY).toISOString();

      const { data: themes, error } = await supabase
        .from('review_themes')
        .select('id, review_id, theme_label, theme_category, theme_sentiment, context, excerpt, created_at')
        .eq('venue_id', venueId)
        .gte('created_at', since90)
        .eq('theme_sentiment', 'negative');
      if (error) throw error;

      if (!themes || themes.length === 0) {
        result.note = 'no negative themes';
        result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, []);
        result.ms = Date.now() - t0;
        return result;
      }

      // Aggregate by (label, optional context).
      type Agg = {
        label: string; category: string; context: string | null;
        count30: number; count90: number;
        excerpts: string[];
      };
      const agg = new Map<string, Agg>();
      for (const t of themes) {
        if (!FIXABLE_CATEGORIES.has(t.theme_category) && !CRITICAL_CATEGORIES.has(t.theme_category)) continue;
        const ctx = t.context && TIME_CONTEXTS.has(t.context) ? t.context : null;
        const key = ctx ? `${t.theme_label}|${ctx}` : t.theme_label;
        const a = agg.get(key) ?? {
          label: t.theme_label, category: t.theme_category, context: ctx,
          count30: 0, count90: 0, excerpts: [],
        };
        a.count90 += 1;
        if (t.created_at >= since30) a.count30 += 1;
        if (t.excerpt && a.excerpts.length < 3) a.excerpts.push(t.excerpt);
        agg.set(key, a);
      }

      // Recent manager logs for cross-reference.
      const { data: recentLogs } = await supabase
        .from('logs')
        .select('id, content, created_at, log_type')
        .eq('bar_id', venueId)
        .gte('created_at', since30)
        .limit(200);

      // Recent labor variance (weekly_core last 4 weeks if available).
      const { data: recentWeeks } = await supabase
        .from('weekly_core')
        .select('week_id, schedule_variance_pct')
        .eq('bar_id', venueId)
        .order('created_at', { ascending: false })
        .limit(4);

      const laborUnderTarget = (recentWeeks ?? []).filter(
        (w) => typeof w.schedule_variance_pct === 'number' && w.schedule_variance_pct < -5,
      ).length;

      const currentKeys: string[] = [];

      for (const a of agg.values()) {
        const isCritical =
          CRITICAL_CATEGORIES.has(a.category) ||
          CRITICAL_LABEL_HINTS.some((h) => a.label.includes(h));

        if (!isCritical) {
          if (a.count30 < 2 && a.count90 < 4) continue;
        }

        // Cross-source enrichment.
        const operationalSignals: Array<Record<string, unknown>> = [];

        if (a.context && (a.label.includes('service') || a.label.includes('slow') || a.label.includes('wait'))) {
          if (laborUnderTarget > 0) {
            operationalSignals.push({
              kind: 'labor_under_target',
              detail: `Schedule variance below target on ${laborUnderTarget} of the last ${(recentWeeks ?? []).length} weeks.`,
            });
          }
        }

        if (a.category === 'food' || a.label.includes('kitchen') || a.label.includes('slow_food')) {
          const matched = (recentLogs ?? []).filter((l) => {
            const text = String(l.content ?? '').toLowerCase();
            return KITCHEN_KEYWORDS.some((k) => text.includes(k));
          });
          if (matched.length > 0) {
            operationalSignals.push({
              kind: 'manager_logs',
              detail: `${matched.length} manager log(s) in the last 30 days flagged kitchen capacity issues.`,
              log_ids: matched.slice(0, 5).map((l) => l.id),
            });
          }
        }

        let severity: FindingSeverity;
        if (isCritical) {
          severity = 'Critical';
        } else if (operationalSignals.length > 0 && a.count30 >= 5) {
          severity = 'High';
        } else if (a.count30 >= 5 || a.count90 >= 8) {
          severity = 'High';
        } else if (a.count30 >= 3 || operationalSignals.length > 0) {
          severity = 'Medium';
        } else {
          severity = 'Low';
        }

        const conf = operationalSignals.length > 0 ? 5 : a.count30 >= 3 ? 4 : 3;
        const sk = a.context
          ? `reputation_risk:${a.label}:${a.context}`
          : `reputation_risk:${a.label}`;
        currentKeys.push(sk);

        const themeDisplay = a.label.replace(/_/g, ' ');
        const ctxStr = a.context ? ` (${a.context.replace(/_/g, ' ')})` : '';

        let diagnosis = `${a.count30} review${a.count30 === 1 ? '' : 's'} in the last 30 days and ${a.count90} in the last 90 mention "${themeDisplay}"${ctxStr} negatively.`;
        for (const sig of operationalSignals) {
          diagnosis += ` ${sig.detail}`;
        }

        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity,
          title: isCritical
            ? `Critical guest complaint: ${themeDisplay}${ctxStr}`
            : `Recurring complaint: ${themeDisplay}${ctxStr}`,
          diagnosis,
          recommended_action: operationalSignals.length > 0
            ? `Address the underlying operational driver (see signals) and follow up directly with reviewers where possible.`
            : `Investigate root cause for "${themeDisplay}"${ctxStr} and respond to recent reviews citing the issue.`,
          evidence: {
            summary: a.excerpts.length
              ? a.excerpts.slice(0, 2).map((e) => `"${e}"`).join(' • ')
              : `${a.count90} negative mentions in last 90 days.`,
            sources: [{ label: 'Review theme extraction', ref: `venue:${venueId}:${a.label}` }],
          },
          revenue_upside: severity === 'Critical' ? 5 : severity === 'High' ? 3 : 2,
          ease: 3,
          confidence: conf,
          operational_risk: severity === 'Critical' ? 5 : 3,
          is_traffic_driving: false,
          metadata: {
            theme_label: a.label,
            theme_category: a.category,
            context: a.context,
            mention_count_30d: a.count30,
            mention_count_90d: a.count90,
            sample_excerpts: a.excerpts,
            operational_signals: operationalSignals,
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

// Analyzer — Event Lift Opportunity
// For each recurring Event campaign in the last 90 days, compare event-night
// food/bev sales (from daily_metrics) against same-DOW non-event nights.
// Emit a finding for each lifted category (>15%) NOT referenced in the
// campaign's title/description/linked_menu_items/tags.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'event_lift_opportunity';

// daily_metrics has food_sales and bev_sales — treat each as a "category".
type CategoryKey = 'food' | 'beverage';
const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
  food: ['food', 'menu', 'eat', 'wing', 'app', 'appetizer', 'burger', 'taco', 'pizza', 'snack', 'kitchen', 'dinner', 'brunch'],
  beverage: ['drink', 'cocktail', 'beer', 'wine', 'shot', 'pour', 'happy hour', 'special', 'bev', 'whiskey', 'tequila'],
};

const DOW_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseISO(d: string): Date {
  const [y, m, dd] = String(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
}
function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function categoryReferencedInCampaign(
  campaign: any,
  category: CategoryKey,
): boolean {
  const haystack = [
    campaign.title ?? '',
    campaign.description ?? '',
    campaign.success_metric ?? '',
    JSON.stringify(campaign.linked_menu_items ?? []),
    JSON.stringify(campaign.channels ?? []),
  ].join(' ').toLowerCase();
  return CATEGORY_KEYWORDS[category].some((kw) => haystack.includes(kw));
}

export const eventLiftOpportunityAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const since = daysAgoIso(90);

      const { data: campaigns, error: cErr } = await supabase
        .from('marketing_campaigns')
        .select('id, title, type, status, recurrence, start_date, end_date, description, success_metric, linked_menu_items, channels')
        .eq('venue_id', venueId)
        .eq('type', 'Event')
        .in('status', ['Ongoing', 'Ended', 'ongoing', 'completed'])
        .gte('end_date', since);
      if (cErr) throw cErr;

      const { data: dm, error: dErr } = await supabase
        .from('daily_metrics')
        .select('id, date, food_sales, bev_sales, net_sales')
        .eq('venue_id', venueId)
        .gte('date', since);
      if (dErr) throw dErr;

      const dmByDate = new Map<string, any>();
      for (const r of dm ?? []) dmByDate.set(r.date, r);

      const currentKeys: string[] = [];

      // Group campaigns by title-as-event.
      const groups = new Map<string, any[]>();
      for (const c of campaigns ?? []) {
        const key = (c.title ?? '').trim().toLowerCase();
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }

      for (const [titleKey, instances] of groups) {
        // Build set of event dates by expanding each instance (same DOW between start/end).
        const eventDates = new Set<string>();
        let dominantDow: number | null = null;
        const dowCounts = new Map<number, number>();
        for (const inst of instances) {
          const start = parseISO(inst.start_date);
          const end = parseISO(inst.end_date);
          // Iterate days in window — capped at 90 to be safe.
          let cur = start.getTime();
          let n = 0;
          while (cur <= end.getTime() && n < 90) {
            const iso = new Date(cur).toISOString().slice(0, 10);
            const d = new Date(cur).getUTCDay();
            // For multi-week recurring events we keep all dates; for single-night
            // events start==end so only one date is added.
            eventDates.add(iso);
            dowCounts.set(d, (dowCounts.get(d) ?? 0) + 1);
            cur += 86_400_000;
            n += 1;
          }
        }
        // Pick the most-common DOW as the recurring event night.
        let max = 0;
        for (const [d, c] of dowCounts) if (c > max) { max = c; dominantDow = d; }
        if (dominantDow == null) { result.skipped += 1; continue; }

        // Restrict event nights to the dominant DOW; baseline = same DOW non-event nights in window.
        const eventNightDates = Array.from(eventDates).filter(
          (d) => parseISO(d).getUTCDay() === dominantDow,
        );
        if (eventNightDates.length < 4) { result.skipped += 1; continue; }

        const baselineDates: string[] = [];
        for (const [d] of dmByDate) {
          if (parseISO(d).getUTCDay() !== dominantDow) continue;
          if (eventDates.has(d)) continue;
          if (d < since) continue;
          baselineDates.push(d);
        }
        if (baselineDates.length < 3) { result.skipped += 1; continue; }

        for (const category of ['food', 'beverage'] as CategoryKey[]) {
          const col = category === 'food' ? 'food_sales' : 'bev_sales';
          const eventVals = eventNightDates
            .map((d) => Number(dmByDate.get(d)?.[col]))
            .filter((n) => Number.isFinite(n) && n > 0);
          const baseVals = baselineDates
            .map((d) => Number(dmByDate.get(d)?.[col]))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (eventVals.length < 4 || baseVals.length < 3) continue;

          const eventAvg = eventVals.reduce((a, b) => a + b, 0) / eventVals.length;
          const baseAvg = baseVals.reduce((a, b) => a + b, 0) / baseVals.length;
          if (baseAvg <= 0) continue;
          const lift = (eventAvg - baseAvg) / baseAvg;
          if (lift < 0.15) continue;

          // Gather a "primary" representative campaign for the marketing reference test.
          const primary = instances[0];
          if (categoryReferencedInCampaign(primary, category)) continue;

          // Cross-source enrichment from positive review themes.
          const { data: themes } = await supabase
            .from('review_themes')
            .select('id, theme_label, theme_category, excerpt')
            .eq('venue_id', venueId)
            .eq('theme_sentiment', 'positive')
            .in('theme_category', category === 'food' ? ['food', 'menu_item'] : ['drinks'])
            .limit(5);

          const liftPct = Math.round(lift * 100);
          const severity: FindingSeverity = liftPct > 30 ? 'High' : liftPct >= 15 ? 'Medium' : 'Low';
          const confidence = eventVals.length >= 8 ? 5 : eventVals.length >= 6 ? 4 : 3;

          const eventTitle = primary.title as string;
          const dowName = DOW_NAMES[dominantDow!];
          const signalKey = `event_lift:${slug(titleKey)}:${dowName}:${category}`;
          currentKeys.push(signalKey);

          const themeBlurb = themes && themes.length > 0
            ? ` Customer reviews praise ${Array.from(new Set(themes.map((t) => t.theme_label))).slice(0, 3).join(', ')} — strong corroborating signal.`
            : '';

          const diagnosis =
            `${eventTitle} (${dowName}s) drives ${category} sales ${liftPct}% above the ${dowName} baseline ` +
            `(event avg $${Math.round(eventAvg).toLocaleString()} vs baseline $${Math.round(baseAvg).toLocaleString()} ` +
            `across ${eventVals.length} event nights and ${baseVals.length} baseline nights).${themeBlurb} ` +
            `The current campaign copy does not reference ${category}, leaving meaningful per-cover revenue on the table.`;

          const recommended_action =
            `Add a ${category}-focused promo to the ${eventTitle} campaign — e.g., a featured ${category === 'food' ? 'food item or limited menu' : 'drink special or signature pour'} highlighted in marketing copy, social posts, and on-premise signage.`;

          const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
            type_id: TYPE_ID,
            category: 'events',
            severity,
            title: `${eventTitle} drives ${liftPct}% ${category} lift not in marketing`,
            diagnosis,
            recommended_action,
            evidence: {
              summary: `Event avg $${Math.round(eventAvg).toLocaleString()} vs baseline $${Math.round(baseAvg).toLocaleString()} across ${eventVals.length} ${dowName} event nights.`,
              sources: [
                { label: 'Marketing campaigns', ref: `marketing_campaigns:${primary.id}` },
                { label: 'Toast — Daily metrics', ref: `daily_metrics:venue=${venueId}` },
                ...(themes && themes.length > 0
                  ? [{ label: 'Review themes', ref: `review_themes:${themes[0].id}` }]
                  : []),
              ],
            },
            revenue_upside: liftPct >= 30 ? 4 : 3,
            ease: 4,
            confidence,
            operational_risk: 2,
            is_traffic_driving: true,
            metadata: {
              event_id: primary.id,
              event_name: eventTitle,
              dow: dowName,
              category,
              lift_pct: liftPct,
              event_avg: Math.round(eventAvg),
              baseline_avg: Math.round(baseAvg),
              event_nights: eventVals.length,
              baseline_nights: baseVals.length,
              instances_analyzed: eventVals.length,
              marketing_reference_status: 'absent',
              corroborating_themes: (themes ?? []).map((t) => ({
                id: t.id, label: t.theme_label, excerpt: t.excerpt,
              })),
            },
          });
          if (inserted) result.inserted += 1; else result.updated += 1;
        }
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'event lift no longer detected or marketing now references category',
          'event-lift-analyzer',
        );
      } catch (e) {
        result.errors.push(`reconcile: ${e instanceof Error ? e.message : String(e)}`);
      }

      result.note = `events analyzed: ${groups.size}; emitted: ${currentKeys.length}`;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    result.ms = Date.now() - t0;
    return result;
  },
};

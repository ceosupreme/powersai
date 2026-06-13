// Analyzer — Context Marketing Opportunity
// Reads cached context_items (calendar/weather/news/sports/events) for the
// next 21 days. For each upcoming item, checks coverage against
// marketing_campaigns (date overlap + keyword/tag match) AND relevance
// against venue_programming_context. Emits a finding when a relevant
// upcoming context item has NO marketing coverage.
//
// All matching is deterministic; if a venue lacks programming_context, the
// analyzer falls back to per-item historical_relevance_score >= 3.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'context_marketing_opportunity';
const HORIZON_DAYS = 21;

function isoToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function tokenize(s: string): Set<string> {
  return new Set(
    String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
      .filter((w) => w.length >= 4),
  );
}

function campaignCoversItem(campaign: any, itemDate: string, itemTokens: Set<string>): boolean {
  if (!campaign.start_date || !campaign.end_date) return false;
  if (itemDate < campaign.start_date || itemDate > campaign.end_date) return false;
  const haystack = [
    campaign.title, campaign.description, campaign.success_metric, campaign.target_audience,
    JSON.stringify(campaign.linked_menu_items ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  // Need at least one meaningful token overlap to call it "covered".
  for (const t of itemTokens) if (haystack.includes(t)) return true;
  return false;
}

function programmingMatch(programming: any | null, item: any): { matched: boolean; reasons: string[] } {
  if (!programming) return { matched: false, reasons: [] };
  const reasons: string[] = [];
  const itemCats: string[] = item.payload?.relevance_categories ?? [];
  const cat = programming.primary_category;
  if (cat && itemCats.length > 0 && itemCats.includes(cat)) {
    reasons.push(`matches your venue type (${cat})`);
  }
  const features: string[] = programming.programming_features ?? [];
  const themes: string[] = programming.themes ?? [];
  const tags: string[] = item.payload?.tags ?? [];
  const haystack = tags.map((t) => String(t).toLowerCase());
  for (const f of features) {
    if (haystack.some((h) => h.includes(String(f).toLowerCase()))) reasons.push(`matches feature "${f}"`);
  }
  for (const t of themes) {
    if (haystack.some((h) => h.includes(String(t).toLowerCase()))) reasons.push(`matches theme "${t}"`);
  }
  return { matched: reasons.length > 0, reasons };
}

function severityForItem(item: any, programmingMatched: boolean): FindingSeverity {
  const baseRel = Number(item.payload?.historical_relevance_score ?? 3);
  const isWeatherSevere = item.source_type === 'weather'
    && (item.payload?.alerts?.length > 0 || item.payload?.heat_wave === true);
  const isMajorSports = item.source_type === 'sports'
    && (item.payload?.is_local_team === true || item.payload?.is_marquee === true);
  if (isWeatherSevere || baseRel >= 5 || (isMajorSports && programmingMatched)) return 'High';
  if (baseRel >= 4 || (programmingMatched && baseRel >= 3)) return 'Medium';
  return 'Low';
}

async function historicalLiftSummary(
  supabase: SupabaseClient, venueId: string, eventDate: string,
): Promise<string | null> {
  // Look at same MM-DD a year ago, +/- 3 days, vs trailing 14-day average.
  const [y, m, d] = eventDate.split('-').map(Number);
  const lastYear = `${y - 1}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const winStart = addDaysISO(lastYear, -3);
  const winEnd = addDaysISO(lastYear, 3);
  const baseStart = addDaysISO(lastYear, -17);
  const baseEnd = addDaysISO(lastYear, -4);
  try {
    const { data } = await supabase
      .from('daily_metrics')
      .select('date, net_sales')
      .eq('venue_id', venueId)
      .gte('date', baseStart)
      .lte('date', winEnd);
    if (!data || data.length < 6) return null;
    const win = data.filter((r: any) => r.date >= winStart && r.date <= winEnd && Number(r.net_sales) > 0);
    const base = data.filter((r: any) => r.date >= baseStart && r.date <= baseEnd && Number(r.net_sales) > 0);
    if (win.length < 1 || base.length < 4) return null;
    const winAvg = win.reduce((a: number, r: any) => a + Number(r.net_sales), 0) / win.length;
    const baseAvg = base.reduce((a: number, r: any) => a + Number(r.net_sales), 0) / base.length;
    if (baseAvg <= 0) return null;
    const lift = Math.round(((winAvg - baseAvg) / baseAvg) * 100);
    if (Math.abs(lift) < 5) return null;
    return `Last year, this date window averaged $${Math.round(winAvg).toLocaleString()} ` +
      `(${lift >= 0 ? '+' : ''}${lift}% vs the prior two weeks).`;
  } catch {
    return null;
  }
}

export const contextMarketingOpportunityAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const today = isoToday();
      const horizon = addDaysISO(today, HORIZON_DAYS);

      // 1) Pull cached context items in window.
      const { data: items, error: iErr } = await supabase
        .from('context_items')
        .select('id, source_type, source_ref, event_date, valid_until, payload')
        .eq('venue_id', venueId)
        .gte('event_date', today)
        .lte('event_date', horizon)
        .order('event_date', { ascending: true });
      if (iErr) throw iErr;

      // 2) Pull active marketing campaigns covering any part of the window.
      const { data: campaigns, error: cErr } = await supabase
        .from('marketing_campaigns')
        .select('id, title, description, success_metric, target_audience, type, status, start_date, end_date, linked_menu_items')
        .eq('venue_id', venueId)
        .in('status', ['Live', 'Scheduled', 'Ongoing', 'Draft'])
        .gte('end_date', today)
        .lte('start_date', horizon);
      if (cErr) throw cErr;

      // 3) Pull venue programming context (optional).
      const { data: programming } = await supabase
        .from('venue_programming_context')
        .select('primary_category, audience_demographics, programming_features, themes')
        .eq('venue_id', venueId)
        .maybeSingle();

      const currentKeys: string[] = [];

      for (const item of items ?? []) {
        const title = item.payload?.title ?? item.source_ref;
        const itemTokens = new Set<string>([
          ...tokenize(title),
          ...tokenize(item.payload?.summary ?? ''),
          ...((item.payload?.tags ?? []) as string[]).flatMap((t) => Array.from(tokenize(t))),
        ]);

        // Coverage check
        const covered = (campaigns ?? []).some((c: any) =>
          campaignCoversItem(c, item.event_date, itemTokens),
        );
        if (covered) continue;

        // Relevance check
        const match = programmingMatch(programming, item);
        const baseRel = Number(item.payload?.historical_relevance_score ?? 3);
        const relevant = match.matched || baseRel >= 3
          || ['weather', 'sports', 'events'].includes(item.source_type);
        if (!relevant) { result.skipped += 1; continue; }

        const severity = severityForItem(item, match.matched);
        const daysOut = Math.max(0, Math.round(
          (new Date(item.event_date).getTime() - new Date(today).getTime()) / 86_400_000
        ));

        const liftBlurb = await historicalLiftSummary(supabase, venueId, item.event_date);

        const sourceLabel = ({
          calendar: 'Calendar', weather: 'Weather (NWS)', news: 'Local news',
          sports: 'Local sports', events: 'Local events',
        } as Record<string, string>)[item.source_type] ?? item.source_type;

        const reasonText = match.reasons.length > 0
          ? ` This ${match.reasons.slice(0, 2).join(' and ')}.`
          : '';

        const diagnosis =
          `${title} is ${daysOut === 0 ? 'today' : daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`} ` +
          `(${item.event_date}). No marketing campaign currently addresses it.${reasonText}` +
          (liftBlurb ? ` ${liftBlurb}` : '') +
          (item.payload?.summary ? ` Source: ${item.payload.summary}` : '');

        const recommended_action =
          `Spin up a campaign tied to "${title}" — promo + social posts + on-premise signage. ` +
          `Use the Action Pack to draft date-specific copy and link to a Toast promo if applicable.`;

        const signalKey = `context:${item.source_type}:${item.source_ref}`;
        currentKeys.push(signalKey);

        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'context',
          severity,
          title: `Upcoming: ${title} — no marketing coverage`,
          diagnosis,
          recommended_action,
          evidence: {
            summary: `${sourceLabel} item on ${item.event_date}; relevance ${baseRel}/5; ` +
              `${campaigns?.length ?? 0} active/scheduled campaigns scanned for coverage.`,
            sources: [
              { label: sourceLabel, ref: `context_items:${item.id}` },
              { label: 'Marketing campaigns', ref: `marketing_campaigns:venue=${venueId}` },
            ],
          },
          revenue_upside: severity === 'High' ? 4 : severity === 'Medium' ? 3 : 2,
          ease: 4,
          confidence: match.matched ? 4 : 3,
          operational_risk: 2,
          is_traffic_driving: true,
          metadata: {
            source_type: item.source_type,
            source_ref: item.source_ref,
            event_date: item.event_date,
            days_out: daysOut,
            historical_relevance_score: baseRel,
            programming_matched: match.matched,
            match_reasons: match.reasons,
            historical_lift_text: liftBlurb,
            item_payload: item.payload,
          },
        });
        if (inserted) result.inserted += 1; else result.updated += 1;
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'context item past or now covered by a campaign',
          'context-analyzer',
        );
      } catch (e) {
        result.errors.push(`reconcile: ${e instanceof Error ? e.message : String(e)}`);
      }

      result.note = `items scanned: ${items?.length ?? 0}; emitted: ${currentKeys.length}`;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    result.ms = Date.now() - t0;
    return result;
  },
};

// Analyzer — Operational Readiness Blocker
// Cross-source convergence detector. A finding emits ONLY when ≥2 distinct
// signal sources point at the same root cause (shift slot, category bucket,
// or rating decline). Single-signal noise never emits.
//
// Signal sources (last 30d, with 14d windows for shift patterns):
//   1. Labor variance vs demand    — daily_metrics.labor_pct vs venue median
//   2. Schedule variance           — daily_metrics scheduled vs actual hours
//   3. Negative review themes      — review_themes (service/cleanliness/food)
//   4. Manager log keywords        — manager_logs.content regex scan
//   5. Cover-to-labor ratio anomaly — revenue per labor hour vs venue median
//   6. Recent rating decline       — google_reviews avg 30d vs prior 90d

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'operational_readiness_blocker';

type SourceId =
  | 'labor_variance'
  | 'schedule_variance'
  | 'review_themes'
  | 'manager_logs'
  | 'cover_labor_ratio'
  | 'rating_decline';

type SignalStrength = 'mild' | 'moderate' | 'strong';

type Signal = {
  source: SourceId;
  rootCauseKey: string;          // e.g. friday_late_night | kitchen | rating_decline_30d
  strength: SignalStrength;
  summary: string;               // human-readable one-liner with specifics
  refs: string[];                // table:id pointers
  flags?: string[];              // e.g. ['cleanliness','food_safety']
};

const DOW_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function parseISO(d: string): Date {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
}
function daysAgoIso(n: number): string {
  const t = new Date(Date.now() - n * 86_400_000);
  return t.toISOString().slice(0, 10);
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---- Signal collectors ---------------------------------------------------

async function collectLaborSignals(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since = daysAgoIso(30);
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('id, date, net_sales, labor_pct, labor_hours, scheduled_hours')
    .eq('venue_id', venueId)
    .gte('date', since)
    .order('date', { ascending: true });
  if (error || !data?.length) return [];

  // Venue median labor_pct (only positive net_sales rows).
  const valid = data.filter((r: any) => Number(r.labor_pct) > 0 && Number(r.net_sales) > 0);
  if (valid.length < 7) return [];
  const med = median(valid.map((r: any) => Number(r.labor_pct)));
  if (med <= 0) return [];

  // Recent 14d understaffed days (labor_pct ≤ 70% of median).
  const recentStart = daysAgoIso(14);
  const understaffed = valid.filter(
    (r: any) => r.date >= recentStart && Number(r.labor_pct) <= med * 0.70,
  );

  // Group by DOW and shift slot (we only have day grain — slot = "all-day").
  const byDow = new Map<number, any[]>();
  for (const r of understaffed) {
    const dow = parseISO(r.date).getUTCDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(r);
  }

  const signals: Signal[] = [];
  for (const [dow, rows] of byDow) {
    if (rows.length < 3) continue;
    const dates = rows.map((r) => r.date).slice(0, 4);
    const avgPct = rows.reduce((s, r) => s + Number(r.labor_pct), 0) / rows.length;
    const dropPct = Math.round((1 - avgPct / med) * 100);
    const strength: SignalStrength = dropPct >= 40 ? 'strong' : dropPct >= 25 ? 'moderate' : 'mild';
    signals.push({
      source: 'labor_variance',
      rootCauseKey: `${DOW_NAMES[dow]}_understaffed`,
      strength,
      summary: `Labor ran ${dropPct}% below venue median on ${rows.length} of the last 14 ${DOW_NAMES[dow]}s (${dates.join(', ')}).`,
      refs: rows.map((r) => `daily_metrics:${r.id}`),
    });
  }
  return signals;
}

async function collectScheduleVarianceSignals(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since = daysAgoIso(14);
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('id, date, labor_hours, scheduled_hours')
    .eq('venue_id', venueId)
    .gte('date', since);
  if (error || !data?.length) return [];

  const shortfalls = data.filter((r: any) => {
    const sch = Number(r.scheduled_hours);
    const act = Number(r.labor_hours);
    return sch > 0 && act > 0 && (sch - act) / sch >= 0.15;
  });
  const byDow = new Map<number, any[]>();
  for (const r of shortfalls) {
    const dow = parseISO(r.date).getUTCDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(r);
  }
  const signals: Signal[] = [];
  for (const [dow, rows] of byDow) {
    if (rows.length < 3) continue;
    const avgGap = rows.reduce((s, r) => {
      const sch = Number(r.scheduled_hours), act = Number(r.labor_hours);
      return s + (sch - act) / sch;
    }, 0) / rows.length;
    const gapPct = Math.round(avgGap * 100);
    const strength: SignalStrength = gapPct >= 30 ? 'strong' : gapPct >= 20 ? 'moderate' : 'mild';
    signals.push({
      source: 'schedule_variance',
      rootCauseKey: `${DOW_NAMES[dow]}_understaffed`,
      strength,
      summary: `Actual hours ran ${gapPct}% under schedule on ${rows.length} of the last 14 ${DOW_NAMES[dow]}s — likely no-shows or early-outs.`,
      refs: rows.map((r) => `daily_metrics:${r.id}`),
    });
  }
  return signals;
}

async function collectReviewThemeSignals(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('review_themes')
    .select('id, theme_category, theme_label, theme_sentiment, context, excerpt, created_at')
    .eq('venue_id', venueId)
    .eq('theme_sentiment', 'negative')
    .in('theme_category', ['service', 'cleanliness', 'food', 'staff'])
    .gte('created_at', since);
  if (error || !data?.length) return [];

  // Bucket by (category) and (timing context if present).
  const buckets = new Map<string, any[]>();
  for (const t of data) {
    const ctx = (t.context ?? '').toLowerCase();
    let timing = '';
    for (const dow of DOW_NAMES) if (ctx.includes(dow)) { timing = dow; break; }
    if (!timing && /late[- ]?night|after\s*10|after\s*11|closing/.test(ctx)) timing = 'late_night';
    if (!timing && /weekend/.test(ctx)) timing = 'weekend';

    const catBucket = `category_${t.theme_category}`;
    push(buckets, catBucket, t);
    if (timing) push(buckets, `${timing}_${t.theme_category === 'food' ? 'kitchen' : 'service'}`, t);
  }

  const signals: Signal[] = [];
  for (const [key, rows] of buckets) {
    if (rows.length < 2) continue;
    const flags: string[] = [];
    if (rows.some((r) => r.theme_category === 'cleanliness')) flags.push('cleanliness');
    if (rows.some((r) => /food[- ]?safety|sick|undercooked|raw/i.test(r.excerpt ?? ''))) flags.push('food_safety');
    if (rows.some((r) => /harass/i.test(r.excerpt ?? ''))) flags.push('harassment');
    const strength: SignalStrength = rows.length >= 4 ? 'strong' : rows.length >= 3 ? 'moderate' : 'mild';
    const labels = Array.from(new Set(rows.map((r) => r.theme_label))).slice(0, 3).join(', ');
    signals.push({
      source: 'review_themes',
      rootCauseKey: key,
      strength,
      summary: `${rows.length} negative review themes in the last 30 days mention ${labels}.`,
      refs: rows.map((r) => `review_themes:${r.id}`),
      flags,
    });
  }
  return signals;
}

const LOG_KEYWORDS: Array<{ re: RegExp; bucket: string }> = [
  { re: /kitchen\s+(was\s+)?backed\s*up|kitchen\s+slammed/i, bucket: 'kitchen' },
  { re: /\b86'?d|\bran\s+out\s+of|\bout\s+of\s+\w+/i, bucket: 'kitchen' },
  { re: /short[- ]?staff(?:ed)?|understaff(?:ed)?/i, bucket: 'understaffed' },
  { re: /slammed|couldn'?t\s+keep\s+up|in\s+the\s+weeds/i, bucket: 'service' },
  { re: /walked\s+out|guest\s+(left|walked)/i, bucket: 'service' },
  { re: /complain(?:t|ed|ing)/i, bucket: 'service' },
];

async function collectManagerLogSignals(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since = daysAgoIso(30);
  const { data, error } = await supabase
    .from('manager_logs')
    .select('id, date, content')
    .eq('venue_id', venueId)
    .gte('date', since);
  if (error || !data?.length) return [];

  const buckets = new Map<string, { rows: any[]; matched: string[] }>();
  for (const row of data) {
    const text = String(row.content ?? '');
    for (const { re, bucket } of LOG_KEYWORDS) {
      const m = text.match(re);
      if (!m) continue;
      // Bucket by keyword target. If the log mentions a DOW, refine the key.
      const dow = DOW_NAMES.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(text));
      const key = dow ? `${dow}_${bucket === 'service' ? 'service' : bucket}` : bucket;
      if (!buckets.has(key)) buckets.set(key, { rows: [], matched: [] });
      const b = buckets.get(key)!;
      if (!b.rows.find((r) => r.id === row.id)) b.rows.push(row);
      b.matched.push(m[0]);
    }
  }
  const signals: Signal[] = [];
  for (const [key, { rows, matched }] of buckets) {
    if (rows.length < 2) continue;
    const sample = Array.from(new Set(matched.map((s) => s.toLowerCase()))).slice(0, 3).join(', ');
    const strength: SignalStrength = rows.length >= 4 ? 'strong' : rows.length >= 3 ? 'moderate' : 'mild';
    signals.push({
      source: 'manager_logs',
      rootCauseKey: key,
      strength,
      summary: `Manager logs flagged "${sample}" on ${rows.length} days in the last 30.`,
      refs: rows.map((r) => `manager_logs:${r.id}`),
    });
  }
  return signals;
}

async function collectCoverLaborSignals(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since = daysAgoIso(30);
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('id, date, net_sales, labor_hours')
    .eq('venue_id', venueId)
    .gte('date', since);
  if (error || !data?.length) return [];

  const ratios = data
    .map((r: any) => ({
      ...r,
      ratio: Number(r.labor_hours) > 0 ? Number(r.net_sales) / Number(r.labor_hours) : 0,
    }))
    .filter((r) => r.ratio > 0);
  if (ratios.length < 10) return [];
  const med = median(ratios.map((r) => r.ratio));
  if (med <= 0) return [];

  const recentStart = daysAgoIso(14);
  const high = ratios.filter((r) => r.date >= recentStart && r.ratio >= med * 1.6);
  if (high.length < 3) return [];
  const byDow = new Map<number, any[]>();
  for (const r of high) {
    const dow = parseISO(r.date).getUTCDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(r);
  }
  const signals: Signal[] = [];
  for (const [dow, rows] of byDow) {
    if (rows.length < 3) continue;
    signals.push({
      source: 'cover_labor_ratio',
      rootCauseKey: `${DOW_NAMES[dow]}_understaffed`,
      strength: 'moderate',
      summary: `Revenue per labor hour ran 60%+ above venue median on ${rows.length} of the last 14 ${DOW_NAMES[dow]}s — staff likely overwhelmed.`,
      refs: rows.map((r) => `daily_metrics:${r.id}`),
    });
  }
  return signals;
}

async function collectRatingDeclineSignal(
  supabase: SupabaseClient, venueId: string,
): Promise<Signal[]> {
  const since120 = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('google_reviews')
    .select('id, rating, publish_time')
    .eq('bar_id', venueId)
    .gte('publish_time', since120)
    .order('publish_time', { ascending: false });
  if (error || !data?.length) return [];
  const now = Date.now();
  const recent = data.filter((r: any) => r.publish_time && now - Date.parse(r.publish_time) <= 30 * 86_400_000);
  const prior = data.filter((r: any) => {
    if (!r.publish_time) return false;
    const age = now - Date.parse(r.publish_time);
    return age > 30 * 86_400_000 && age <= 120 * 86_400_000;
  });
  if (recent.length < 3 || prior.length < 5) return [];
  const recentAvg = recent.reduce((s, r) => s + Number(r.rating), 0) / recent.length;
  const priorAvg = prior.reduce((s, r) => s + Number(r.rating), 0) / prior.length;
  const drop = priorAvg - recentAvg;
  if (drop < 0.2) return [];
  const strength: SignalStrength = drop >= 0.5 ? 'strong' : drop >= 0.3 ? 'moderate' : 'mild';
  return [{
    source: 'rating_decline',
    rootCauseKey: 'rating_decline_30d',
    strength,
    summary: `Average rating dropped ${drop.toFixed(2)} stars over the last 30 days (${recentAvg.toFixed(2)}★ vs ${priorAvg.toFixed(2)}★ trailing 90).`,
    refs: [`google_reviews:venue=${venueId}`],
    flags: drop >= 0.3 ? ['rating_drop_significant'] : [],
  }];
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  if (!m.has(k)) m.set(k, []);
  m.get(k)!.push(v);
}

// ---- Convergence + emit --------------------------------------------------

function severityFor(group: Signal[]): FindingSeverity | null {
  const sources = new Set(group.map((s) => s.source));
  if (sources.size < 2) return null;
  const flags = new Set(group.flatMap((s) => s.flags ?? []));
  const hasCritical =
    flags.has('food_safety') || flags.has('cleanliness') || flags.has('harassment') ||
    flags.has('rating_drop_significant');
  if (sources.size >= 3 && hasCritical) return 'Critical';
  if (sources.size >= 3) return 'High';
  // 2-source convergence
  const allModeratePlus = group.every((s) => s.strength !== 'mild');
  return allModeratePlus ? 'Medium' : 'Low';
}

export const operationalReadinessBlockerAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();

    try {
      const [labor, sched, themes, logs, coverLabor, rating] = await Promise.all([
        collectLaborSignals(supabase, venueId).catch((e) => { result.errors.push(`labor: ${e.message}`); return [] as Signal[]; }),
        collectScheduleVarianceSignals(supabase, venueId).catch((e) => { result.errors.push(`sched: ${e.message}`); return [] as Signal[]; }),
        collectReviewThemeSignals(supabase, venueId).catch((e) => { result.errors.push(`themes: ${e.message}`); return [] as Signal[]; }),
        collectManagerLogSignals(supabase, venueId).catch((e) => { result.errors.push(`logs: ${e.message}`); return [] as Signal[]; }),
        collectCoverLaborSignals(supabase, venueId).catch((e) => { result.errors.push(`cover: ${e.message}`); return [] as Signal[]; }),
        collectRatingDeclineSignal(supabase, venueId).catch((e) => { result.errors.push(`rating: ${e.message}`); return [] as Signal[]; }),
      ]);

      const all: Signal[] = [...labor, ...sched, ...themes, ...logs, ...coverLabor, ...rating];

      // Group by rootCauseKey.
      const byKey = new Map<string, Signal[]>();
      for (const s of all) push(byKey, s.rootCauseKey, s);

      // Rating decline alone is not a root cause; merge it into every other key
      // for severity escalation purposes (it counts as a corroborating source).
      const ratingSigs = byKey.get('rating_decline_30d') ?? [];

      const currentKeys: string[] = [];

      for (const [key, group] of byKey) {
        // Only emit on the rating_decline_30d standalone if it's the sole signal
        // AND ≥1 other source converges; otherwise standalone rating drop is not
        // emitted as its own finding.
        if (key === 'rating_decline_30d') continue;

        // Dedupe sources within the group.
        const uniqBySource = new Map<SourceId, Signal>();
        for (const s of group) {
          const cur = uniqBySource.get(s.source);
          if (!cur || strengthRank(s.strength) > strengthRank(cur.strength)) {
            uniqBySource.set(s.source, s);
          }
        }
        const groupArr = Array.from(uniqBySource.values());
        if (groupArr.length < 2) continue;

        // Pull rating decline in as corroborating source if present.
        const enriched = ratingSigs.length ? [...groupArr, ratingSigs[0]] : groupArr;
        const severity = severityFor(enriched);
        if (!severity) continue;

        const signalKey = `ops_blocker:${key}`;
        currentKeys.push(signalKey);

        const sourceLabels: Record<SourceId, string> = {
          labor_variance: 'Labor variance',
          schedule_variance: 'Schedule variance',
          review_themes: 'Customer reviews',
          manager_logs: 'Manager logs',
          cover_labor_ratio: 'Cover-to-labor ratio',
          rating_decline: 'Rating trend',
        };
        const evidenceBullets = enriched
          .map((s) => `• ${sourceLabels[s.source]}: ${s.summary}`)
          .join('\n');

        const rootCauseLabel = humanizeRootCause(key);
        const diagnosis =
          `Multiple operational signals indicate ${rootCauseLabel} can't currently support additional traffic.\n\n` +
          evidenceBullets +
          `\n\nMarketing campaigns aimed at driving more volume into this window are not recommended until the underlying capacity issues are addressed.`;

        const recommended_action =
          `Hold all traffic-driving campaigns targeting ${rootCauseLabel}. Address the underlying capacity issue first: ` +
          `review staffing levels and skill mix, validate kitchen/bar prep par levels, and brief managers on the specific signals above.`;

        const { inserted } = await upsertFinding(supabase, venueId, signalKey, {
          type_id: TYPE_ID,
          category: 'operational',
          severity,
          title: `Operational capacity strain: ${rootCauseLabel}`,
          diagnosis,
          recommended_action,
          evidence: {
            summary: `${enriched.length} converging signal sources detected over the last 14–30 days.`,
            sources: enriched.map((s) => ({
              label: sourceLabels[s.source],
              ref: s.refs[0] ?? `${s.source}:venue=${venueId}`,
            })),
          },
          revenue_upside: 2,
          ease: 1,
          confidence: enriched.length >= 3 ? 5 : enriched.length >= 2 ? 4 : 3,
          operational_risk: 5,
          is_traffic_driving: false,
          gate_reason: severity === 'Critical' || severity === 'High'
            ? `Operational readiness blocker active for ${rootCauseLabel}. Resolve before pushing traffic-driving campaigns.`
            : null,
          metadata: {
            root_cause: key,
            root_cause_label: rootCauseLabel,
            convergence_count: enriched.length,
            contributing_signals: enriched.map((s) => ({
              source: s.source,
              source_label: sourceLabels[s.source],
              strength: s.strength,
              summary: s.summary,
              refs: s.refs,
              flags: s.flags ?? [],
            })),
          },
        });
        if (inserted) result.inserted += 1; else result.updated += 1;
      }

      try {
        result.resolved = await bulkReconcile(
          supabase, venueId, TYPE_ID, currentKeys,
          'operational signals no longer converge', 'ops-blocker-analyzer',
        );
      } catch (e) {
        result.errors.push(`reconcile: ${e instanceof Error ? e.message : String(e)}`);
      }

      result.note = `signals: labor=${labor.length}, sched=${sched.length}, themes=${themes.length}, logs=${logs.length}, cover=${coverLabor.length}, rating=${rating.length}; emitted=${currentKeys.length}`;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }

    result.ms = Date.now() - t0;
    return result;
  },
};

function strengthRank(s: SignalStrength): number {
  return s === 'strong' ? 3 : s === 'moderate' ? 2 : 1;
}

function humanizeRootCause(key: string): string {
  // friday_understaffed | late_night_kitchen | category_service | kitchen | service
  const dowMatch = DOW_NAMES.find((d) => key.startsWith(d + '_'));
  if (dowMatch) {
    const rest = key.slice(dowMatch.length + 1).replace(/_/g, ' ');
    return `${dowMatch[0].toUpperCase()}${dowMatch.slice(1)} ${rest}`;
  }
  if (key.startsWith('late_night_')) return `Late-night ${key.slice('late_night_'.length)}`;
  if (key.startsWith('weekend_')) return `Weekend ${key.slice('weekend_'.length)}`;
  if (key.startsWith('category_')) return `${key.slice('category_'.length)} quality`;
  return key.replace(/_/g, ' ');
}

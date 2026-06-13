// aiSearchVisibilityGap — emits findings when a venue has weak presence in
// ChatGPT/Claude/Gemini/Perplexity recommendations for high-priority queries.
// Cross-references GBP, review, and website signals for richer diagnoses.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'ai_search_visibility_gap';
const CATEGORY = 'local';
const DAY = 86_400_000;

type Snap = {
  id: string;
  engine: string;
  mentioned: boolean | null;
  position: number | null;
  detection_method: string | null;
  query_error: string | null;
  checked_at: string;
};

const normKey = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export const aiSearchVisibilityGapAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();
    const currentKeys: string[] = [];

    try {
      const { data: queries, error: qErr } = await supabase
        .from('ai_search_queries')
        .select('id, query, priority, is_active')
        .eq('venue_id', venueId).eq('is_active', true);
      if (qErr) throw qErr;

      if (!queries || queries.length === 0) {
        result.note = 'no queries configured';
        result.ms = Date.now() - t0;
        return result;
      }

      // Cross-source pulls
      const [{ data: gbpSnap }, { data: themes }, { data: webSnap }] = await Promise.all([
        supabase.from('gbp_snapshots')
          .select('id, description, post_count, last_post_at, photo_count')
          .eq('venue_id', venueId).is('fetch_error', null)
          .order('captured_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('review_themes')
          .select('theme_label, theme_sentiment').eq('venue_id', venueId)
          .eq('theme_sentiment', 'positive'),
        supabase.from('website_snapshots')
          .select('id, has_localbusiness_schema, has_menu_page')
          .eq('venue_id', venueId).is('fetch_error', null)
          .order('captured_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const themeLabels = new Set<string>();
      for (const t of themes ?? []) themeLabels.add(String(t.theme_label).toLowerCase());

      let portfolioMentions = 0;
      let portfolioChecks = 0;

      for (const q of queries) {
        const { data: snaps } = await supabase
          .from('ai_search_snapshots')
          .select('id, engine, mentioned, position, detection_method, query_error, checked_at')
          .eq('venue_id', venueId).eq('query_id', q.id)
          .order('checked_at', { ascending: false }).limit(20);

        const recent = (snaps ?? []) as Snap[];
        if (recent.length === 0) continue;

        // Latest cycle = snapshots from the most-recent run timestamp window
        const latestTs = Date.parse(recent[0].checked_at);
        const cycle = recent.filter((s) => latestTs - Date.parse(s.checked_at) < DAY);

        const valid = cycle.filter((s) => s.detection_method !== 'engine_skipped' && !s.query_error);
        if (valid.length === 0) continue;

        const mentions = valid.filter((s) => s.mentioned === true).length;
        const total = valid.length;
        const hitRate = mentions / total;
        portfolioMentions += mentions;
        portfolioChecks += total;

        const isHigh = q.priority === 'high';
        if (!isHigh) continue; // only high-priority emits per-query findings

        let severity: FindingSeverity | null = null;
        let titlePrefix = '';
        let upside = 3;
        if (mentions === 0) {
          severity = 'Critical';
          titlePrefix = 'Invisible to AI';
          upside = 5;
        } else if (hitRate < 0.5) {
          severity = 'High';
          titlePrefix = 'Weak AI visibility';
          upside = 4;
        } else if (hitRate < 0.75) {
          severity = 'Medium';
          titlePrefix = 'Inconsistent AI visibility';
          upside = 3;
        }
        if (!severity) continue;

        const sk = `ai_search_gap:${normKey(q.query)}`;
        currentKeys.push(sk);

        const missingEngines = valid.filter((s) => !s.mentioned).map((s) => s.engine);
        const presentEngines = valid.filter((s) => s.mentioned).map((s) => s.engine);

        const diagnosisParts: string[] = [];
        diagnosisParts.push(
          mentions === 0
            ? `Not mentioned in any AI engine for "${q.query}" (tested ${valid.map((s) => s.engine).join(', ')}).`
            : `Mentioned in ${mentions}/${total} engines for "${q.query}" — missing from ${missingEngines.join(', ')}.`,
        );

        // Cross-source enrichment
        const gbpGaps: string[] = [];
        if (gbpSnap) {
          if (!gbpSnap.description || gbpSnap.description.trim().length < 30) gbpGaps.push('GBP business description is missing');
          const lastPostAge = gbpSnap.last_post_at
            ? (Date.now() - Date.parse(gbpSnap.last_post_at)) / DAY : Infinity;
          if (lastPostAge > 30) gbpGaps.push(gbpSnap.last_post_at ? `no GBP post in ${Math.round(lastPostAge)} days` : 'no GBP posts ever published');
          if ((gbpSnap.photo_count ?? 0) < 10) gbpGaps.push(`only ${gbpSnap.photo_count ?? 0} photos on GBP`);
        }
        if (gbpGaps.length) diagnosisParts.push(`Likely contributing factors: ${gbpGaps.join(', ')}.`);

        if (webSnap && !webSnap.has_localbusiness_schema) {
          diagnosisParts.push('Website is missing LocalBusiness schema markup — LLMs rely on this to surface venues.');
        }

        const qLower = q.query.toLowerCase();
        const themeMatch = [...themeLabels].find((t) => qLower.includes(t));
        if (themeMatch) {
          diagnosisParts.push(`Customers actively praise "${themeMatch}" in reviews — your reputation is strong but AI engines don't know it yet.`);
        }

        const sources = valid.map((s) => ({
          label: `${s.engine} · ${s.checked_at.slice(0, 10)}`,
          ref: `ai_search_snapshot:${s.id}`,
        }));
        if (gbpSnap) sources.push({ label: 'GBP profile audit', ref: `gbp_snapshot:${gbpSnap.id}` });
        if (webSnap) sources.push({ label: 'Website audit', ref: `website_snapshot:${webSnap.id}` });

        const action = mentions === 0
          ? `Publish keyword-targeted content (a dedicated landing page + blog post answering "${q.query}"), add LocalBusiness schema, and refresh GBP description + photos. Re-test in 4 weeks.`
          : `Strengthen content depth for "${q.query}" on your website, add structured FAQ schema, and ensure GBP signals stay fresh. Aim to reach all ${enabledEnginesLabel(valid)} engines.`;

        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity,
          title: `${titlePrefix}: "${q.query}"`,
          diagnosis: diagnosisParts.join(' '),
          recommended_action: action,
          evidence: { summary: `${mentions}/${total} engines mentioned the venue.`, sources },
          revenue_upside: upside,
          ease: gbpGaps.length || (webSnap && !webSnap.has_localbusiness_schema) ? 4 : 3,
          confidence: total >= 3 ? 4 : 3,
          operational_risk: 1,
          is_traffic_driving: true,
          metadata: {
            query: q.query, query_id: q.id, priority: q.priority,
            mentions, total, hit_rate: hitRate,
            present_engines: presentEngines,
            missing_engines: missingEngines,
            gbp_snapshot_id: gbpSnap?.id ?? null,
            website_snapshot_id: webSnap?.id ?? null,
            theme_match: themeMatch ?? null,
          },
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      result.resolved += await bulkReconcile(supabase, venueId, TYPE_ID, currentKeys);
      result.ms = Date.now() - t0;
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(msg);
      result.ms = Date.now() - t0;
      return result;
    }
  },
};

function enabledEnginesLabel(snaps: Array<{ engine: string }>): number {
  return new Set(snaps.map((s) => s.engine)).size;
}

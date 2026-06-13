// mapPackRankingGap — emits findings when a venue's local search rank for a
// tracked keyword represents a missed opportunity. Cross-references GBP
// profile gaps and positive review themes for richer diagnoses.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { upsertFinding, bulkReconcile, type FindingSeverity } from '../findings.ts';
import { emptyResult, type AnalyzerModule, type AnalyzerResult } from './types.ts';

const TYPE_ID = 'map_pack_ranking_gap';
const CATEGORY = 'local';
const DAY = 86_400_000;

type Snapshot = {
  id: string;
  rank: number | null;
  in_map_pack: boolean | null;
  total_results: number;
  top_competitors: Array<{ place_id: string; name: string; rank: number }>;
  checked_at: string;
  query_error: string | null;
};

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export const mapPackRankingGapAnalyzer: AnalyzerModule = {
  id: TYPE_ID,
  async run(supabase: SupabaseClient, venueId: string): Promise<AnalyzerResult> {
    const t0 = Date.now();
    const result = emptyResult();
    const currentKeys: string[] = [];

    try {
      const { data: keywords, error: kwErr } = await supabase
        .from('map_pack_keywords')
        .select('id, keyword, priority, is_active')
        .eq('venue_id', venueId)
        .eq('is_active', true);
      if (kwErr) throw kwErr;

      if (!keywords || keywords.length === 0) {
        // No keywords configured — nothing to do, no resolves either (don't
        // wipe other analyzer findings).
        result.note = 'no keywords configured';
        result.ms = Date.now() - t0;
        return result;
      }

      // Cross-source: latest GBP snapshot for diagnosis enrichment
      const { data: gbpSnap } = await supabase
        .from('gbp_snapshots')
        .select('id, description, post_count, last_post_at, photo_count')
        .eq('venue_id', venueId)
        .is('fetch_error', null)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Cross-source: positive review themes
      const { data: themes } = await supabase
        .from('review_themes')
        .select('theme_label')
        .eq('venue_id', venueId)
        .eq('theme_sentiment', 'positive');
      const themeLabels = new Set<string>();
      for (const t of themes ?? []) themeLabels.add(String(t.theme_label).toLowerCase());

      let mediumDeclines = 0;
      const mediumDeclineKeywords: string[] = [];

      for (const kw of keywords) {
        const { data: snaps } = await supabase
          .from('map_pack_snapshots')
          .select('id, rank, in_map_pack, total_results, top_competitors, checked_at, query_error')
          .eq('venue_id', venueId)
          .eq('keyword_id', kw.id)
          .order('checked_at', { ascending: false })
          .limit(8);

        const recent = (snaps ?? []) as Snapshot[];
        if (recent.length === 0) continue;

        const latest = recent[0];
        const prev = recent[1];

        // Confidence based on consecutive consistent snapshots
        const confidence: 1 | 2 | 3 | 4 | 5 = recent.length >= 4 ? 5 : recent.length >= 2 ? 3 : 2;

        const sk = `map_pack_gap:${normalizeKey(kw.keyword)}`;
        const isHigh = kw.priority === 'high';

        // Check for "previously in pack, now slipped" within last 30 days
        const wasInPackRecently = recent.some(
          (s) => s.in_map_pack && (Date.now() - Date.parse(s.checked_at)) <= 30 * DAY,
        );
        const slippedFromPack =
          wasInPackRecently && latest.rank !== null && latest.rank > 3 && latest.rank <= 10;

        let severity: FindingSeverity | null = null;
        let titlePrefix = '';
        let upside = 3;

        if (isHigh) {
          if (latest.rank === null || latest.rank > 20) {
            severity = 'Critical';
            titlePrefix = 'Invisible';
            upside = 5;
          } else if (latest.rank >= 4 && latest.rank <= 10) {
            severity = slippedFromPack ? 'Medium' : 'High';
            titlePrefix = slippedFromPack ? 'Dropped from Map Pack' : 'Just outside Map Pack';
            upside = 4;
          }
        } else if (kw.priority === 'medium') {
          // Track decline for the rollup finding; no per-keyword finding
          if (prev && latest.rank !== null && prev.rank !== null && latest.rank > prev.rank + 2) {
            mediumDeclines++;
            mediumDeclineKeywords.push(kw.keyword);
          }
          continue;
        } else {
          // low priority — never emits
          continue;
        }

        if (!severity) {
          // Healthy ranking on a high-priority keyword — let bulkReconcile
          // resolve any prior gap finding for this keyword.
          continue;
        }

        currentKeys.push(sk);

        // Build cross-source diagnosis
        const diagnosisParts: string[] = [];
        const rankLabel = latest.rank === null ? `not in top ${MAX_RESULTS_TO_SCAN_LABEL}` : `#${latest.rank}`;
        diagnosisParts.push(
          `Ranked ${rankLabel} for "${kw.keyword}" (target: top 3).`,
        );
        if (slippedFromPack && prev?.rank) {
          diagnosisParts.push(`Slipped from #${prev.rank} → #${latest.rank} since the last check.`);
        }

        // GBP enrichment
        const gbpGaps: string[] = [];
        if (gbpSnap) {
          if (!gbpSnap.description || gbpSnap.description.trim().length < 30) {
            gbpGaps.push('GBP business description is missing');
          }
          const lastPostAge = gbpSnap.last_post_at
            ? (Date.now() - Date.parse(gbpSnap.last_post_at)) / DAY : Infinity;
          if (lastPostAge > 30) {
            gbpGaps.push(
              gbpSnap.last_post_at
                ? `no GBP post in ${Math.round(lastPostAge)} days`
                : 'no GBP posts ever published',
            );
          }
          if ((gbpSnap.photo_count ?? 0) < 10) {
            gbpGaps.push(`only ${gbpSnap.photo_count ?? 0} photos on GBP`);
          }
        }
        if (gbpGaps.length) {
          diagnosisParts.push(
            `Your GBP is incomplete (${gbpGaps.join(', ')}) — fixing this typically lifts rankings.`,
          );
        }

        // Theme overlap
        const kwLower = kw.keyword.toLowerCase();
        const themeMatch = [...themeLabels].find(
          (t) => kwLower.includes(t) || t.includes(kwLower.split(' ')[0]),
        );
        if (themeMatch) {
          diagnosisParts.push(
            `Customers actively praise "${themeMatch}" in reviews — your reputation is strong but discoverability isn't keeping up.`,
          );
        }

        const sources = [
          { label: `Ranking snapshot · ${latest.checked_at.slice(0, 10)}`, ref: `map_pack_snapshot:${latest.id}` },
        ];
        if (gbpSnap) sources.push({ label: 'GBP profile audit', ref: `gbp_snapshot:${gbpSnap.id}` });

        const action =
          severity === 'Critical'
            ? `Audit GBP profile completeness, ensure primary category matches the keyword intent, and publish keyword-targeted content (GBP post + website page).`
            : `Strengthen GBP signals (description, posts, photos) and add a website section dedicated to "${kw.keyword}". Re-check ranking after 4 weeks.`;

        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity,
          title: `${titlePrefix}: "${kw.keyword}"`,
          diagnosis: diagnosisParts.join(' '),
          recommended_action: action,
          evidence: { summary: `Current rank ${rankLabel}, ${recent.length} snapshots evaluated.`, sources },
          revenue_upside: upside,
          ease: gbpGaps.length ? 4 : 3,
          confidence,
          operational_risk: 1,
          is_traffic_driving: true,
          metadata: {
            keyword: kw.keyword,
            keyword_id: kw.id,
            priority: kw.priority,
            current_rank: latest.rank,
            previous_rank: prev?.rank ?? null,
            top_competitors: latest.top_competitors,
            snapshots_evaluated: recent.length,
            slipped_from_pack: slippedFromPack,
            gbp_snapshot_id: gbpSnap?.id ?? null,
            theme_match: themeMatch ?? null,
          },
        });
        if (inserted) result.inserted++; else result.updated++;
      }

      // Rollup finding for ≥3 medium-priority declines
      if (mediumDeclines >= 3) {
        const sk = 'map_pack_gap:medium_priority_decline_rollup';
        currentKeys.push(sk);
        const { inserted } = await upsertFinding(supabase, venueId, sk, {
          type_id: TYPE_ID,
          category: CATEGORY,
          severity: 'Low',
          title: `${mediumDeclines} tracked keywords are losing rank`,
          diagnosis: `Multiple medium-priority keywords have slipped 3+ positions since the last check: ${mediumDeclineKeywords.slice(0, 5).join(', ')}${mediumDeclineKeywords.length > 5 ? '…' : ''}.`,
          recommended_action: 'Review the Ranking Trends panel and look for shared content gaps (e.g., a category Google now favors).',
          evidence: { summary: `${mediumDeclines} keywords with rank decline ≥3.`, sources: [] },
          revenue_upside: 2, ease: 3, confidence: 3, operational_risk: 1,
          is_traffic_driving: true,
          metadata: { keywords: mediumDeclineKeywords },
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

const MAX_RESULTS_TO_SCAN_LABEL = '20 results';

// Aggregates the map_pack_* tables into a per-venue summary used by both the
// Local Search Visibility scoring blend and the Ranking Trends UI panel.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type KeywordTrend = {
  id: string;
  keyword: string;
  priority: 'high' | 'medium' | 'low';
  currentRank: number | null;
  previousRank: number | null;
  history: Array<{ rank: number | null; checked_at: string }>;
  lastCheckedAt: string | null;
};

export type MapPackSummary = {
  hasKeywords: boolean;
  totalKeywords: number;
  highPriorityCount: number;
  highInPack: number;            // high-priority keywords currently ranking 1-3
  highCovered: number;           // high-priority keywords with at least one snapshot
  hitRate: number | null;        // 0-1 (high-priority in pack / high-priority covered)
  avgRank: number | null;        // mean rank across covered keywords (nulls treated as 21)
  trend: 'up' | 'down' | 'flat'; // avgRank delta vs previous run, smaller=better
  snapshotsCount: number;
  lastCheckedAt: string | null;
  keywords: KeywordTrend[];
};

export const mapPackKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'map-pack-summary', venueId ?? 'none'] as const;

const NOT_FOUND_RANK = 21;

export function useMapPackSummary(venueId: string | null | undefined) {
  return useQuery({
    queryKey: mapPackKey(venueId),
    enabled: !!venueId,
    staleTime: 60_000,
    queryFn: async (): Promise<MapPackSummary> => {
      const { data: keywords, error: kwErr } = await supabase
        .from('map_pack_keywords')
        .select('id, keyword, priority, is_active, last_checked_at')
        .eq('venue_id', venueId!)
        .eq('is_active', true);
      if (kwErr) throw kwErr;

      const keywordRows = (keywords ?? []) as Array<{
        id: string; keyword: string; priority: 'high' | 'medium' | 'low';
        is_active: boolean; last_checked_at: string | null;
      }>;

      if (keywordRows.length === 0) {
        return {
          hasKeywords: false, totalKeywords: 0, highPriorityCount: 0,
          highInPack: 0, highCovered: 0, hitRate: null, avgRank: null,
          trend: 'flat', snapshotsCount: 0, lastCheckedAt: null, keywords: [],
        };
      }

      const { data: snaps, error: snErr } = await supabase
        .from('map_pack_snapshots')
        .select('keyword_id, rank, checked_at')
        .eq('venue_id', venueId!)
        .order('checked_at', { ascending: false })
        .limit(800);
      if (snErr) throw snErr;

      const grouped = new Map<string, Array<{ rank: number | null; checked_at: string }>>();
      for (const r of (snaps ?? []) as Array<{ keyword_id: string | null; rank: number | null; checked_at: string }>) {
        if (!r.keyword_id) continue;
        const arr = grouped.get(r.keyword_id) ?? [];
        arr.push({ rank: r.rank, checked_at: r.checked_at });
        grouped.set(r.keyword_id, arr);
      }

      let highInPack = 0;
      let highCovered = 0;
      let totalRankSum = 0;
      let totalRankCount = 0;
      let prevRankSum = 0;
      let prevRankCount = 0;
      let lastCheckedAt: string | null = null;

      const out: KeywordTrend[] = keywordRows.map((k) => {
        const hist = (grouped.get(k.id) ?? []).slice(0, 12);
        const current = hist[0]?.rank ?? null;
        const previous = hist[1]?.rank ?? null;
        const checked = hist[0]?.checked_at ?? k.last_checked_at;
        if (checked && (!lastCheckedAt || checked > lastCheckedAt)) lastCheckedAt = checked;

        if (k.priority === 'high' && hist.length > 0) {
          highCovered++;
          if (current !== null && current <= 3) highInPack++;
        }
        if (hist.length > 0) {
          totalRankSum += current ?? NOT_FOUND_RANK;
          totalRankCount++;
        }
        if (hist.length > 1) {
          prevRankSum += previous ?? NOT_FOUND_RANK;
          prevRankCount++;
        }

        return {
          id: k.id, keyword: k.keyword, priority: k.priority,
          currentRank: current, previousRank: previous,
          history: hist.reverse(),
          lastCheckedAt: checked,
        };
      });

      const avgRank = totalRankCount > 0 ? totalRankSum / totalRankCount : null;
      const prevAvg = prevRankCount > 0 ? prevRankSum / prevRankCount : null;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (avgRank !== null && prevAvg !== null) {
        if (avgRank < prevAvg - 0.5) trend = 'up';
        else if (avgRank > prevAvg + 0.5) trend = 'down';
      }

      return {
        hasKeywords: true,
        totalKeywords: keywordRows.length,
        highPriorityCount: keywordRows.filter((k) => k.priority === 'high').length,
        highInPack,
        highCovered,
        hitRate: highCovered > 0 ? highInPack / highCovered : null,
        avgRank,
        trend,
        snapshotsCount: snaps?.length ?? 0,
        lastCheckedAt,
        keywords: out.sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 } as const;
          if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
          return a.keyword.localeCompare(b.keyword);
        }),
      };
    },
  });
}

// Aggregates ai_search_* tables into a per-venue summary used by both the
// Local Search Visibility scoring blend and the AI Search trends UI.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Engine = 'chatgpt' | 'claude' | 'gemini' | 'perplexity';

export type AiQueryTrend = {
  id: string;
  query: string;
  priority: 'high' | 'medium' | 'low';
  perEngine: Partial<Record<Engine, { mentioned: boolean | null; position: number | null }>>;
  hitRate: number | null; // current cycle
  history: Array<{ checked_at: string; hitRate: number }>;
};

export type AiSearchSummary = {
  hasQueries: boolean;
  totalQueries: number;
  highPriorityCount: number;
  mentionsFound: number;        // current cycle, all queries
  totalChecks: number;          // current cycle, all queries (excl. skipped)
  hitRate: number | null;       // mentions / totalChecks
  highHitRate: number | null;   // restricted to high-priority queries
  trend: 'up' | 'down' | 'flat';
  perEngine: Record<Engine, { mentions: number; checks: number; skipped: boolean }>;
  lastCheckedAt: string | null;
  perplexityActive: boolean;
  queries: AiQueryTrend[];
};

export const aiSearchKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'ai-search-summary', venueId ?? 'none'] as const;

const DAY = 86_400_000;
const ENGINES: Engine[] = ['chatgpt', 'claude', 'gemini', 'perplexity'];

export function useAiSearchSummary(venueId: string | null | undefined) {
  return useQuery({
    queryKey: aiSearchKey(venueId),
    enabled: !!venueId,
    staleTime: 60_000,
    queryFn: async (): Promise<AiSearchSummary> => {
      const { data: queries, error: qErr } = await supabase
        .from('ai_search_queries')
        .select('id, query, priority, is_active, last_checked_at')
        .eq('venue_id', venueId!)
        .eq('is_active', true);
      if (qErr) throw qErr;

      const queryRows = (queries ?? []) as Array<{
        id: string; query: string; priority: 'high' | 'medium' | 'low';
        is_active: boolean; last_checked_at: string | null;
      }>;

      const empty: AiSearchSummary = {
        hasQueries: false, totalQueries: 0, highPriorityCount: 0,
        mentionsFound: 0, totalChecks: 0, hitRate: null, highHitRate: null,
        trend: 'flat',
        perEngine: {
          chatgpt: { mentions: 0, checks: 0, skipped: false },
          claude: { mentions: 0, checks: 0, skipped: false },
          gemini: { mentions: 0, checks: 0, skipped: false },
          perplexity: { mentions: 0, checks: 0, skipped: false },
        },
        lastCheckedAt: null, perplexityActive: false, queries: [],
      };

      if (queryRows.length === 0) return empty;

      const { data: snaps, error: sErr } = await supabase
        .from('ai_search_snapshots')
        .select('id, query_id, engine, mentioned, position, detection_method, query_error, checked_at')
        .eq('venue_id', venueId!)
        .order('checked_at', { ascending: false })
        .limit(2000);
      if (sErr) throw sErr;

      type SnapRow = {
        id: string; query_id: string | null;
        engine: Engine; mentioned: boolean | null; position: number | null;
        detection_method: string | null; query_error: string | null;
        checked_at: string;
      };
      const all = (snaps ?? []) as SnapRow[];

      // Group by query
      const byQuery = new Map<string, SnapRow[]>();
      for (const s of all) {
        if (!s.query_id) continue;
        const arr = byQuery.get(s.query_id) ?? [];
        arr.push(s);
        byQuery.set(s.query_id, arr);
      }

      // Group snapshots into "cycles" — same calendar day.
      const cycleKey = (iso: string) => iso.slice(0, 10);

      const perEngine: AiSearchSummary['perEngine'] = {
        chatgpt: { mentions: 0, checks: 0, skipped: false },
        claude: { mentions: 0, checks: 0, skipped: false },
        gemini: { mentions: 0, checks: 0, skipped: false },
        perplexity: { mentions: 0, checks: 0, skipped: false },
      };

      let lastCheckedAt: string | null = null;
      let perplexityActive = false;

      // Find latest cycle key across all snapshots
      let latestCycle: string | null = null;
      for (const s of all) {
        if (!latestCycle || s.checked_at > latestCycle) {
          latestCycle = s.checked_at;
          lastCheckedAt = s.checked_at;
        }
      }
      const latestCycleDay = latestCycle ? cycleKey(latestCycle) : null;
      // Previous cycle = the most recent day before latestCycleDay
      const previousCycleDay = latestCycleDay
        ? [...new Set(all.map((s) => cycleKey(s.checked_at)))]
            .filter((d) => d < latestCycleDay).sort().reverse()[0] ?? null
        : null;

      let mentionsFound = 0, totalChecks = 0;
      let highMentions = 0, highChecks = 0;
      let prevMentions = 0, prevChecks = 0;

      const queryTrends: AiQueryTrend[] = queryRows.map((q) => {
        const list = (byQuery.get(q.id) ?? []).slice(0, 60);
        const perEng: AiQueryTrend['perEngine'] = {};
        const cycles = new Map<string, { mentions: number; checks: number }>();

        for (const s of list) {
          const day = cycleKey(s.checked_at);
          const c = cycles.get(day) ?? { mentions: 0, checks: 0 };
          const skipped = s.detection_method === 'engine_skipped';
          if (skipped && s.engine === 'perplexity') perEngine.perplexity.skipped = true;
          if (skipped || s.query_error) {
            cycles.set(day, c);
            continue;
          }
          c.checks++;
          if (s.mentioned) c.mentions++;
          cycles.set(day, c);

          // Engine-level rollup (latest cycle only)
          if (latestCycleDay && day === latestCycleDay) {
            perEngine[s.engine].checks++;
            if (s.mentioned) perEngine[s.engine].mentions++;
            // Per-query latest-cycle engine result (first wins = latest)
            if (!perEng[s.engine]) {
              perEng[s.engine] = { mentioned: s.mentioned, position: s.position };
            }
            if (s.engine === 'perplexity') perplexityActive = true;
          }
        }

        const latest = latestCycleDay ? cycles.get(latestCycleDay) : null;
        const prev = previousCycleDay ? cycles.get(previousCycleDay) : null;
        const hitRate = latest && latest.checks > 0 ? latest.mentions / latest.checks : null;

        if (latest) {
          mentionsFound += latest.mentions;
          totalChecks += latest.checks;
          if (q.priority === 'high') {
            highMentions += latest.mentions;
            highChecks += latest.checks;
          }
        }
        if (prev) {
          prevMentions += prev.mentions;
          prevChecks += prev.checks;
        }

        const history = [...cycles.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([day, c]) => ({ checked_at: day, hitRate: c.checks > 0 ? c.mentions / c.checks : 0 }));

        return {
          id: q.id, query: q.query, priority: q.priority,
          perEngine: perEng, hitRate, history,
        };
      });

      const hitRate = totalChecks > 0 ? mentionsFound / totalChecks : null;
      const highHitRate = highChecks > 0 ? highMentions / highChecks : null;
      const prevRate = prevChecks > 0 ? prevMentions / prevChecks : null;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (hitRate !== null && prevRate !== null) {
        if (hitRate > prevRate + 0.05) trend = 'up';
        else if (hitRate < prevRate - 0.05) trend = 'down';
      }

      return {
        hasQueries: true,
        totalQueries: queryRows.length,
        highPriorityCount: queryRows.filter((q) => q.priority === 'high').length,
        mentionsFound, totalChecks, hitRate, highHitRate, trend,
        perEngine, lastCheckedAt,
        perplexityActive,
        queries: queryTrends.sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 } as const;
          if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
          return a.query.localeCompare(b.query);
        }),
      };
    },
  });
}

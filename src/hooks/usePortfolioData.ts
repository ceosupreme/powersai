import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { getGradeFromScore } from '@/utils/scoring';
import { useQuery } from '@tanstack/react-query';
import { fetchEffectivePillars } from '@/lib/effectivePillars';
import {
  fetchEffectiveFoundationCategories,
  fetchEffectiveFoundationItems,
} from '@/lib/effectiveFoundation';
import { deriveFoundationScores } from '@/components/foundation-audit/deriveFoundationScores';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';

export interface PortfolioVenue {
  id: string;
  name: string;
  address: string | null;
  score: number | null;
  scoreWoW: number | null;
  grade: string | null;
  weeklyRevenue: number | null;
  revenueChange: number | null;
  revenueScore: number | null;
  laborScore: number | null;
  operationsScore: number | null;
  guestScore: number | null;
  confidence: number | null;
  missingData: string[];
  gm: { name: string };
  statusTone: 'critical' | 'high' | 'medium' | 'positive';
}

export interface GMRanking {
  id: string;
  name: string;
  venue: { name: string };
  avgScore: number | null;
  trend: number | null;
  thisWeekScore: number | null;
  thisWeekGrade: string | null;
  taskCompletionPct: number | null;
}

type ScorecardRow = {
  overall_score: number | null;
  overall_grade: string | null;
  revenue_score: number | null;
  labor_score: number | null;
  operations_score: number | null;
  guest_score: number | null;
  confidence: number | null;
  trend_4wk: string | null;
  net_sales?: number | null;
  yoy_change_pct?: number | null;
};

type VenueInsightRow = {
  bar_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  created_at: string;
};

const SEVERITY_RANK: Record<NonNullable<VenueInsightRow['severity']>, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
};

export function usePortfolioData() {
  const { accessibleBars, isLoading: appLoading, selectedWeek } = useApp();

  const barIds = useMemo(() => accessibleBars.map((bar) => bar.id), [accessibleBars]);

  const { data: scorecardData, isLoading: scorecardsLoading } = useQuery({
    queryKey: ['portfolio-scorecards', barIds, selectedWeek?.id ?? 'latest'],
    queryFn: async () => {
      if (barIds.length === 0) {
        return {
          scorecards: {} as Record<string, ScorecardRow>,
          highestSeverityByBar: {} as Record<string, VenueInsightRow['severity'] | null>,
        };
      }

      const result: Record<string, ScorecardRow> = {};
      const weekRowsByBar: Record<string, { id: string; week_start: string; week_end: string } | null> = {};

      for (const barId of barIds) {
        let weekRow: { id: string; week_start: string; week_end: string } | null = null;

        if (selectedWeek) {
          const { data } = await supabase
            .from('weeks')
            .select('id, week_start, week_end')
            .eq('bar_id', barId)
            .eq('week_start', selectedWeek.week_start)
            .limit(1)
            .maybeSingle();
          weekRow = data;
        }

        weekRowsByBar[barId] = weekRow;

        if (weekRow?.id) {
          const [scorecardResult, coreResult] = await Promise.all([
            supabase
              .from('weekly_scorecard')
              .select('overall_score, overall_grade, revenue_score, labor_score, operations_score, guest_score, confidence, trend_4wk')
              .eq('bar_id', barId)
              .eq('week_id', weekRow.id)
              .maybeSingle(),
            supabase
              .from('weekly_core')
              .select('net_sales, yoy_change_pct')
              .eq('week_id', weekRow.id)
              .maybeSingle(),
          ]);

          if (scorecardResult.data) {
            result[barId] = {
              ...scorecardResult.data,
              net_sales: coreResult.data?.net_sales ?? null,
              yoy_change_pct: coreResult.data?.yoy_change_pct ?? null,
            };
          }
        }
      }

      const validWeekRows = Object.entries(weekRowsByBar)
        .filter(([, row]) => !!row?.id)
        .map(([barId, row]) => ({ barId, weekId: row!.id }));

      if (validWeekRows.length === 0) {
        return {
          scorecards: result,
          highestSeverityByBar: {} as Record<string, VenueInsightRow['severity'] | null>,
        };
      }

      const { data: insightRows } = await supabase
        .from('insights')
        .select('bar_id, severity, created_at')
        .in('bar_id', validWeekRows.map((row) => row.barId))
        .in('week_id', validWeekRows.map((row) => row.weekId))
        .neq('status', 'Dismissed');

      const highestSeverityByBar = new Map<string, VenueInsightRow['severity']>();
      ((insightRows || []) as VenueInsightRow[])
        .sort((a, b) => {
          const severityDelta = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
          if (severityDelta !== 0) return severityDelta;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .forEach((insight) => {
          if (!highestSeverityByBar.has(insight.bar_id)) {
            highestSeverityByBar.set(insight.bar_id, insight.severity);
          }
        });

      return {
        scorecards: result,
        highestSeverityByBar: Object.fromEntries(
          barIds.map((barId) => [barId, highestSeverityByBar.get(barId) ?? null])
        ) as Record<string, VenueInsightRow['severity'] | null>,
      };
    },
    enabled: barIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: taskCompletionData, isLoading: tasksLoading } = useQuery({
    queryKey: ['portfolio-task-completion', barIds],
    queryFn: async () => {
      if (barIds.length === 0) return {} as Record<string, number>;

      const { data } = await supabase
        .from('action_items')
        .select('bar_id, status, approval_status')
        .eq('approval_status', 'Approved');

      const byBar: Record<string, { total: number; done: number }> = {};
      (data || []).forEach((item) => {
        if (!byBar[item.bar_id]) byBar[item.bar_id] = { total: 0, done: 0 };
        byBar[item.bar_id].total += 1;
        if (item.status === 'Done') byBar[item.bar_id].done += 1;
      });

      const result: Record<string, number> = {};
      Object.entries(byBar).forEach(([barId, counts]) => {
        result[barId] = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
      });
      return result;
    },
    enabled: barIds.length > 0,
  });

  const scorecardRows = scorecardData?.scorecards ?? {};
  const highestSeverityByBar = scorecardData?.highestSeverityByBar ?? {};

  const venues: PortfolioVenue[] = useMemo(() => {
    if (accessibleBars.length === 0) return [];

    return accessibleBars.map((bar) => {
      const scorecard = scorecardRows?.[bar.id];
      const score = scorecard?.overall_score ?? null;
      const highestSeverity = highestSeverityByBar[bar.id] ?? null;
      const statusTone = highestSeverity === 'Critical'
        ? 'critical'
        : highestSeverity === 'High'
          ? 'high'
          : highestSeverity === 'Medium'
            ? 'medium'
            : 'positive';

      return {
        id: bar.id,
        name: bar.bar_name,
        address: null,
        score,
        scoreWoW: null,
        grade: scorecard?.overall_grade ?? (score != null ? getGradeFromScore(score) : null),
        weeklyRevenue: scorecard?.net_sales ?? null,
        revenueChange: scorecard?.yoy_change_pct ?? null,
        revenueScore: scorecard?.revenue_score ?? null,
        laborScore: scorecard?.labor_score ?? null,
        operationsScore: scorecard?.operations_score ?? null,
        guestScore: scorecard?.guest_score ?? null,
        confidence: scorecard?.confidence ?? null,
        missingData: [],
        gm: { name: bar.gm_name || 'Not assigned' },
        statusTone,
      };
    });
  }, [accessibleBars, scorecardRows, highestSeverityByBar]);

  const gmRankings: GMRanking[] = useMemo(() => {
    return venues
      .filter((venue) => venue.gm.name !== 'Not assigned')
      .map((venue) => {
        const scorecard = scorecardRows?.[venue.id];
        const thisWeekScore = scorecard?.overall_score ?? null;

        return {
          id: venue.id,
          name: venue.gm.name,
          venue: { name: venue.name },
          avgScore: thisWeekScore,
          trend: null,
          thisWeekScore,
          thisWeekGrade: thisWeekScore != null ? getGradeFromScore(thisWeekScore) : null,
          taskCompletionPct: taskCompletionData?.[venue.id] ?? null,
        };
      })
      .filter((gm) => gm.avgScore != null)
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  }, [venues, taskCompletionData, scorecardRows]);

  const isLoading = appLoading || tasksLoading || scorecardsLoading;

  return { venues, gmRankings, isLoading };
}

// ---------------------------------------------------------------------------
// Non-client ("My brands" / "Prospects") portfolio layer.
// The canonical client scorecard path above is untouched.
// ---------------------------------------------------------------------------

/** Project types that belong to the owner's own brands rather than clients. */
export const MY_BRAND_TYPES = [
  'internal_brand',
  'content_channel',
  'app_build',
  'service_offer',
] as const;

export type PortfolioGroup = 'brands' | 'clients' | 'prospects';

export interface ProjectDirectoryRow {
  id: string;
  name: string;
  project_type: string | null;
  is_prospect_shell: boolean;
  focus_status: string;
  group: PortfolioGroup;
}

export function projectGroup(row: {
  project_type: string | null;
  is_prospect_shell: boolean | null;
}): PortfolioGroup {
  if (row.is_prospect_shell) return 'prospects';
  if (row.project_type && (MY_BRAND_TYPES as readonly string[]).includes(row.project_type)) {
    return 'brands';
  }
  return 'clients';
}

/** venues metadata for every accessible project (type, prospect flag, focus). */
export function useProjectDirectory() {
  const { accessibleBars, isLoading: appLoading } = useApp();
  const ids = useMemo(() => accessibleBars.map((b) => b.id), [accessibleBars]);

  const query = useQuery({
    queryKey: ['project-directory', ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectDirectoryRow[]> => {
      const { data, error } = await supabase
        .from('venues')
        .select('id,name,project_type,is_prospect_shell,focus_status')
        .in('id', ids);
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((v) => ({
          id: v.id as string,
          name: (v.name as string) ?? 'Project',
          project_type: (v.project_type as string) ?? null,
          is_prospect_shell: !!v.is_prospect_shell,
          focus_status: (v.focus_status as string) ?? 'active',
          group: projectGroup(v),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return { ...query, isLoading: appLoading || query.isLoading };
}

export interface NonClientPillarBar {
  key: string;
  label: string;
  short: string;
  score: number | null;
}

export interface NonClientCardData {
  id: string;
  name: string;
  focusStatus: string;
  overall: number | null;
  overallWoW: number | null;
  pillars: NonClientPillarBar[];
  monthRevenue: number | null;
  potential: number | null;
}

/** First letters of each word in a pillar label — "Brand Presence" -> "BP". */
function pillarInitials(label: string) {
  return (
    label
      .split(/[\s/&-]+/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase())
      .join('')
      .slice(0, 3) || '?'
  );
}

function weightedOverall(
  pillars: { weight: number; score: number | null }[],
): number | null {
  const tracked = pillars.filter((p) => p.score != null);
  if (tracked.length === 0) return null;
  let totalW = tracked.reduce((s, p) => s + (p.weight ?? 0), 0);
  if (totalW <= 0) totalW = tracked.length;
  const num = tracked.reduce(
    (s, p) => s + (p.score as number) * ((p.weight ?? 0) > 0 ? p.weight : 1),
    0,
  );
  return Math.round(num / totalW);
}

function monthStartISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Card data for non-client projects: weighted current-week overall from
 * project_pillar_scores over the project's effective pillars, week-over-week
 * change, this month's channel_revenue, and the Money Lanes Potential percent.
 */
export function useNonClientPortfolio(projects: ProjectDirectoryRow[]) {
  const weekStart = currentWeekRange().week_start;
  const priorWeekStart = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number);
    const dt = new Date(y, m - 1, d - 7);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }, [weekStart]);
  const monthStart = monthStartISO();
  const ids = projects.map((p) => p.id).join(',');

  return useQuery({
    queryKey: ['non-client-portfolio', ids, weekStart, monthStart],
    enabled: projects.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<NonClientCardData[]> =>
      Promise.all(
        projects.map(async (p) => {
          const type = p.project_type ?? 'client';
          const [pillars, scoresRes, revenueRes, categories, items, statusesRes] =
            await Promise.all([
              fetchEffectivePillars(p.id, type),
              supabase
                .from('project_pillar_scores')
                .select('pillar_key,score,week_start')
                .eq('project_id', p.id)
                .in('week_start', [weekStart, priorWeekStart]),
              supabase
                .from('channel_revenue')
                .select('amount')
                .eq('project_id', p.id)
                .eq('period_month', monthStart),
              fetchEffectiveFoundationCategories(p.id, type),
              fetchEffectiveFoundationItems(p.id, type),
              supabase
                .from('venue_foundation_item_status')
                .select('item_key,status,evidence_url,notes,source,detected_at,updated_at')
                .eq('venue_id', p.id),
            ]);

          const rows = (scoresRes.data ?? []) as any[];
          const scoreFor = (pillarKey: string, ws: string) => {
            const row = rows.find((r) => r.pillar_key === pillarKey && r.week_start === ws);
            return row?.score == null ? null : Number(row.score);
          };

          const bars: NonClientPillarBar[] = pillars.map((pl) => ({
            key: pl.pillar_key,
            label: pl.pillar_label,
            short: pillarInitials(pl.pillar_label),
            score: scoreFor(pl.pillar_key, weekStart),
          }));

          const overall = weightedOverall(
            pillars.map((pl) => ({ weight: pl.weight, score: scoreFor(pl.pillar_key, weekStart) })),
          );
          const priorOverall = weightedOverall(
            pillars.map((pl) => ({
              weight: pl.weight,
              score: scoreFor(pl.pillar_key, priorWeekStart),
            })),
          );

          const revenueRows = (revenueRes.data ?? []) as any[];
          const monthRevenue = revenueRows.length
            ? revenueRows.reduce((s, r) => s + Number(r.amount ?? 0), 0)
            : null;

          const foundation = deriveFoundationScores(
            categories,
            items,
            (statusesRes.data ?? []) as any[],
          );

          return {
            id: p.id,
            name: p.name,
            focusStatus: p.focus_status,
            overall,
            overallWoW: overall != null && priorOverall != null ? overall - priorOverall : null,
            pillars: bars,
            monthRevenue,
            potential: foundation.overall,
          };
        }),
      ),
  });
}

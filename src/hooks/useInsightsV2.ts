import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import type { InsightV2, ActionItemV2, PillarV2, SeverityV2 } from '@/types/insights-v2';

// Build the .or() clause that surfaces both week-keyed insights and
// period-keyed (week_id IS NULL) insights whose [period_start, period_end]
// overlaps the selected Mon-Sun week.
const buildInsightOrClause = (
  targetWeekId: string,
  barId: string | undefined,
  weekStart: string | undefined,
  weekEnd: string | undefined,
): string | null => {
  if (!barId || !weekStart || !weekEnd) return null;
  return `week_id.eq.${targetWeekId},and(week_id.is.null,bar_id.eq.${barId},period_start.lte.${weekEnd},period_end.gte.${weekStart})`;
};

// Fetch insights for a week with nested actions
export const useInsightsV2 = (weekId?: string) => {
  const { selectedBar, selectedWeek } = useApp();
  const targetWeekId = weekId || selectedWeek?.id;
  const weekStart = selectedWeek?.week_start;
  const weekEnd = selectedWeek?.week_end;

  return useQuery({
    queryKey: ['insightsV2', targetWeekId, selectedBar?.id, weekStart, weekEnd],
    queryFn: async () => {
      if (!targetWeekId) return { insights: [], actions: [] };

      const orClause = buildInsightOrClause(targetWeekId, selectedBar?.id, weekStart, weekEnd);

      // Insights: include week-keyed AND period-overlapping week-less rows
      let insightsQuery = supabase
        .from('insights')
        .select('*')
        .neq('insight_type', 'Pillar Summary')
        .order('severity', { ascending: true });
      insightsQuery = orClause
        ? insightsQuery.or(orClause)
        : insightsQuery.eq('week_id', targetWeekId);

      // Action items remain strictly week-keyed (inventory insights have no actions yet)
      const [insightsResult, actionsResult] = await Promise.all([
        insightsQuery,
        supabase
          .from('action_items')
          .select('*')
          .eq('week_id', targetWeekId),
      ]);

      const insightsRaw = (insightsResult.data || []) as any[];
      const actionsRaw = (actionsResult.data || []) as unknown as ActionItemV2[];

      // Map actions to their insight IDs
      const actionsByInsight = new Map<string, ActionItemV2[]>();
      actionsRaw.forEach(action => {
        const insightId = (action as any).insight_id || action.insight?.[0];
        if (insightId) {
          const existing = actionsByInsight.get(insightId) || [];
          existing.push(action);
          actionsByInsight.set(insightId, existing);
        }
      });

      // Attach actions to insights
      const insights = insightsRaw.map(insight => ({
        ...insight,
        actions: actionsByInsight.get(insight.id) || [],
      }));

      return { insights, actions: actionsRaw };
    },
    enabled: !!targetWeekId,
    staleTime: 2 * 60 * 1000,
  });
};

// Fetch pillar summary insights only (week-keyed only — pillar summaries are always weekly)
export const usePillarSummaries = (weekId?: string) => {
  const { selectedBar, selectedWeek } = useApp();
  const targetWeekId = weekId || selectedWeek?.id;

  return useQuery({
    queryKey: ['pillarSummaries', targetWeekId, selectedBar?.id],
    queryFn: async () => {
      if (!targetWeekId) return [];
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('week_id', targetWeekId)
        .eq('insight_type', 'Pillar Summary');
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetWeekId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch all actions for a week (for counts and filtering)
export const useActionsV2 = (weekId?: string) => {
  const { selectedBar, selectedWeek } = useApp();
  const targetWeekId = weekId || selectedWeek?.id;

  return useQuery({
    queryKey: ['actionsV2', targetWeekId, selectedBar?.id],
    queryFn: async () => {
      if (!targetWeekId) return [];
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('week_id', targetWeekId);
      if (error) throw error;
      return (data || []) as unknown as ActionItemV2[];
    },
    enabled: !!targetWeekId,
    staleTime: 2 * 60 * 1000,
  });
};

// Helper to count actions by status
export const countActionsByStatus = (actions: ActionItemV2[]) => {
  return {
    proposed: actions.filter(a => a.approval_status === 'Proposed').length,
    approved: actions.filter(a => a.approval_status === 'Approved').length,
    rejected: actions.filter(a => a.approval_status === 'Rejected').length,
    done: actions.filter(a => a.status === 'Done').length,
    inProgress: actions.filter(a => a.status === 'In Progress').length,
  };
};

// Filter and sort insights
export const filterInsights = (
  insights: InsightV2[],
  pillar: PillarV2 | null,
  severityFilter: SeverityV2[],
  sortBy: 'severity' | 'newest' | 'pillar' | 'dueDate'
): InsightV2[] => {
  let filtered = [...insights];

  if (pillar) {
    filtered = filtered.filter(i => i.pillar === pillar);
  }

  filtered = filtered.filter(i => severityFilter.includes(i.severity));

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'severity': {
        const severityOrder: Record<SeverityV2, number> = {
          Critical: 0,
          High: 1,
          Medium: 2,
          Low: 3,
          Info: 4,
        };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      case 'newest':
        return new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime();
      case 'pillar': {
        const pillarOrder: Record<PillarV2, number> = {
          Revenue: 0,
          Labor: 1,
          Operations: 2,
          Guest: 3,
          Marketing: 4,
        };
        return pillarOrder[a.pillar] - pillarOrder[b.pillar];
      }
      case 'dueDate': {
        const aDate = a.actions?.[0]?.due_date;
        const bDate = b.actions?.[0]?.due_date;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      }
      default:
        return 0;
    }
  });

  return filtered;
};

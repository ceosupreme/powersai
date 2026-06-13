import { useQuery } from '@tanstack/react-query';
import { fetchInsightCardsFromSupabase, InsightCardArray, InsightTimeFilter } from '@/services/insightsSupabase';
import { ActionCard } from '@/types/venue';

export interface ActionCardWithWeek extends ActionCard {
  weekStart?: string;
  weekEnd?: string;
  weekId?: string;
  simple_citation?: string;
  source_refs?: unknown[];
  auto_approved?: boolean;
  bar_id?: string;
  employee_id?: string;
  employee_name?: string;
}

export type ActionCardWithWeekArray = ActionCardWithWeek[] & { __capHit?: boolean };

/**
 * Fetches ActionItems from Supabase.
 * `timeFilter` scopes the insights query server-side via source_date so the
 * client never operates on a PostgREST-truncated slice. Defaults to 'all'
 * for legacy call sites (WeeklyReview, Marketing, PillarPage); /insights
 * passes the active dropdown value.
 */
export const useActionItems = (barId?: string, timeFilter: InsightTimeFilter = 'all') => {
  return useQuery({
    queryKey: ['actionItems', barId ?? 'all', timeFilter],
    queryFn: async (): Promise<ActionCardWithWeekArray> => {
      const result = (await fetchInsightCardsFromSupabase(barId, { timeFilter })) as InsightCardArray;
      const arr = result as unknown as ActionCardWithWeekArray;
      arr.__capHit = result.__capHit;
      return arr;
    },
    staleTime: 30000,
    // Preserve the __capHit array property; RQ's default structural sharing
    // reconstructs arrays and would drop the non-standard flag.
    structuralSharing: false,
  });
};

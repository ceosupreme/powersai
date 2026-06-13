import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchVenues,
  fetchWeeksForBar,
  fetchToastBenchmarks,
  fetchWeeklySalesMix,
  fetchTopItems,
  fetchMenuGroups,
  fetchTopProductGroups,
  fetchAlerts,
  fetchWeeklyCoresForBar,
} from '@/services/supabaseData';
import type { Venue, VenueWeek, Bar, Week } from '@/types/venue';
import { venueToBar, venueWeekToWeek } from '@/types/venue';

const STALE_TIME = 5 * 60 * 1000;
const COMPETITIVE_STALE_TIME = 10 * 60 * 1000;

// ─── Venues (replaces useBars) ───────────────────────────────────────

export const useVenues = (enabled = true) => {
  return useQuery<Venue[]>({
    queryKey: ['venues'],
    queryFn: fetchVenues,
    staleTime: 10 * 60 * 1000,
    enabled,
    refetchOnWindowFocus: false,
  });
};

/** Returns venues mapped to Bar[] for backward compat */
export const useBars = (enabled = true) => {
  const query = useVenues(enabled);
  return {
    ...query,
    data: query.data?.map(venueToBar) ?? [],
  };
};

// ─── Weeks (replaces useWeeks) ───────────────────────────────────────

export const useWeeksForBar = (barId: string | undefined, enabled = true) => {
  return useQuery<VenueWeek[]>({
    queryKey: ['weeks', barId],
    queryFn: () => fetchWeeksForBar(barId!),
    staleTime: STALE_TIME,
    enabled: enabled && !!barId,
    refetchOnWindowFocus: false,
  });
};

/** Fetches all weeks across all bars, sorted desc. Legacy compat for AppContext. */
export const useWeeks = (enabled = true) => {
  return useQuery<Week[]>({
    queryKey: ['all-weeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weeks')
        .select('id, week_id, bar_id, week_start, week_end, status')
        .order('week_start', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => venueWeekToWeek(row as VenueWeek));
    },
    staleTime: STALE_TIME,
    enabled,
    refetchOnWindowFocus: false,
  });
};

// ─── Alerts ──────────────────────────────────────────────────────────

export const useAlerts = (barId: string | undefined, weekId?: string) => {
  return useQuery({
    queryKey: ['alerts', barId, weekId],
    queryFn: () => fetchAlerts(barId!, weekId),
    enabled: !!barId,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
};

// ─── Weekly Core History ─────────────────────────────────────────────

export const useWeeklyCores = (barId: string | undefined, limit = 12) => {
  return useQuery({
    queryKey: ['weekly-cores', barId, limit],
    queryFn: () => fetchWeeklyCoresForBar(barId!, limit),
    enabled: !!barId,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
};

// ─── Competitive Data ────────────────────────────────────────────────

export const useCompetitiveData = (barId: string | undefined, weekId: string | undefined) => {
  const enabled = !!barId && !!weekId;

  const queries = useQueries({
    queries: [
      {
        queryKey: ['toast-benchmarks', barId, weekId],
        queryFn: () => fetchToastBenchmarks(barId!, weekId!),
        enabled,
        staleTime: COMPETITIVE_STALE_TIME,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['weekly-sales-mix', barId, weekId],
        queryFn: () => fetchWeeklySalesMix(barId!, weekId!),
        enabled,
        staleTime: COMPETITIVE_STALE_TIME,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['top-items', barId, weekId],
        queryFn: () => fetchTopItems(barId!, weekId!),
        enabled,
        staleTime: COMPETITIVE_STALE_TIME,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['menu-groups', barId, weekId],
        queryFn: () => fetchMenuGroups(barId!, weekId!),
        enabled,
        staleTime: COMPETITIVE_STALE_TIME,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['top-product-groups', barId, weekId],
        queryFn: () => fetchTopProductGroups(barId!, weekId!),
        enabled,
        staleTime: COMPETITIVE_STALE_TIME,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const isLoading = queries.some(q => q.isLoading);
  const benchmarkData = (queries[0].data as any[]) || [];
  const salesMixData = (queries[1].data as any[]) || [];
  const topItemsData = (queries[2].data as any[]) || [];
  const menuGroupsData = (queries[3].data as any[]) || [];
  const productGroupsData = (queries[4].data as any[]) || [];

  const hasAnyData = enabled;

  return {
    isLoading,
    hasAnyData,
    benchmark: benchmarkData[0] || null,
    salesMix: salesMixData[0] || null,
    topItems: topItemsData,
    menuGroups: menuGroupsData,
    productGroups: productGroupsData,
  };
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DrinkMixSummary {
  period_start: string;
  period_end: string;
  catalog_size: number;
  active_plu_count: number;
  uploaded_at: string;
}

/**
 * Returns a summary of the latest Drink Mix Report for a venue.
 * Active PLUs = recipes with qty_sold > 0 in the period.
 * Catalog size = total recipes present in the report.
 */
export const useDrinkMixSummary = (venueId: string | undefined) => {
  return useQuery<DrinkMixSummary | null>({
    queryKey: ['drink-mix-summary', venueId],
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!venueId) return null;

      // Find the most recent (period_end DESC) period for this venue.
      const { data: latestRow, error: latestErr } = await supabase
        .from('drink_mix_items')
        .select('period_start, period_end, uploaded_at')
        .eq('venue_id', venueId)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) throw latestErr;
      if (!latestRow) return null;

      // Catalog size for that period.
      const { count: catalogCount, error: catalogErr } = await supabase
        .from('drink_mix_items')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .eq('period_start', latestRow.period_start)
        .eq('period_end', latestRow.period_end);
      if (catalogErr) throw catalogErr;

      // Active PLU count (qty_sold > 0).
      const { count: activeCount, error: activeErr } = await supabase
        .from('drink_mix_items')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .eq('period_start', latestRow.period_start)
        .eq('period_end', latestRow.period_end)
        .gt('qty_sold', 0);
      if (activeErr) throw activeErr;

      return {
        period_start: latestRow.period_start,
        period_end: latestRow.period_end,
        catalog_size: catalogCount ?? 0,
        active_plu_count: activeCount ?? 0,
        uploaded_at: latestRow.uploaded_at,
      };
    },
  });
};

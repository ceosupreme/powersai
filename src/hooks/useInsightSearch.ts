import { useQuery } from '@tanstack/react-query';
import { searchAllInsights } from '@/services/insightsSupabase';

export const useInsightSearch = (query: string, barId?: string) => {
  return useQuery({
    queryKey: ['insightSearch', query, barId],
    queryFn: () => searchAllInsights(query, barId),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
};

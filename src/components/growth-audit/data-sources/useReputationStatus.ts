// useReputationStatus — pulls aggregate reputation theme stats and
// extraction-freshness signal so deriveScores can compute the Online
// Reputation category from real customer-feedback data.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ReputationStatus = {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  lastExtractedAt: string | null;
  hasReviews: boolean;
};

export const reputationKey = (venueId: string | null | undefined) =>
  ['growth-audit', 'reputation-status', venueId ?? 'none'] as const;

export function useReputationStatus(venueId: string | null | undefined) {
  return useQuery({
    queryKey: reputationKey(venueId),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ReputationStatus> => {
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const [{ data: themes }, { data: runs }, { count: reviewCount }] = await Promise.all([
        supabase
          .from('review_themes')
          .select('theme_sentiment')
          .eq('venue_id', venueId!)
          .gte('created_at', since),
        supabase
          .from('review_extraction_runs')
          .select('processed_at')
          .eq('venue_id', venueId!)
          .order('processed_at', { ascending: false })
          .limit(1),
        supabase
          .from('google_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('bar_id', venueId!),
      ]);
      const list = themes ?? [];
      const positive = list.filter((t) => t.theme_sentiment === 'positive').length;
      const negative = list.filter((t) => t.theme_sentiment === 'negative').length;
      const neutral = list.filter((t) => t.theme_sentiment === 'neutral').length;
      return {
        positive, negative, neutral,
        total: list.length,
        lastExtractedAt: runs?.[0]?.processed_at ?? null,
        hasReviews: (reviewCount ?? 0) > 0,
      };
    },
  });
}

// Onboarding completeness check for a venue. Reads the 4 external-data
// configuration tables and reports what's missing. Dismissals are
// per-user-per-venue and ignored if the venue later becomes incomplete.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type OnboardingItem = {
  key: 'gbp' | 'website' | 'map_pack' | 'ai_search';
  label: string;
  hash: string;
};

const ITEMS: OnboardingItem[] = [
  { key: 'gbp', label: 'Add Google Place ID', hash: 'source-gbp' },
  { key: 'website', label: 'Add website URL', hash: 'source-website_crawler' },
  { key: 'map_pack', label: 'Add Map Pack keywords', hash: 'source-map_pack' },
  { key: 'ai_search', label: 'Add AI search queries', hash: 'source-ai_search' },
];

export type OnboardingState = {
  loading: boolean;
  missing: OnboardingItem[];
  complete: boolean;
  dismissedAt: string | null;
  visible: boolean;
};

export function useVenueOnboarding(venueId: string | null | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const q = useQuery({
    queryKey: ['venue-onboarding', venueId, userId],
    enabled: !!venueId,
    queryFn: async () => {
      const [gbp, web, mp, ai, dismiss] = await Promise.all([
        supabase.from('gbp_place_mappings').select('venue_id', { count: 'exact', head: true }).eq('venue_id', venueId!),
        supabase.from('website_mappings').select('venue_id', { count: 'exact', head: true }).eq('venue_id', venueId!),
        supabase.from('map_pack_keywords').select('venue_id', { count: 'exact', head: true }).eq('venue_id', venueId!),
        supabase.from('ai_search_queries').select('venue_id', { count: 'exact', head: true }).eq('venue_id', venueId!),
        userId
          ? supabase.from('venue_onboarding_dismissals').select('dismissed_at').eq('user_id', userId).eq('venue_id', venueId!).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const counts = {
        gbp: (gbp.count ?? 0) > 0,
        website: (web.count ?? 0) > 0,
        map_pack: (mp.count ?? 0) > 0,
        ai_search: (ai.count ?? 0) > 0,
      };
      const missing = ITEMS.filter((i) => !counts[i.key]);
      return {
        missing,
        complete: missing.length === 0,
        dismissedAt: (dismiss as any)?.data?.dismissed_at ?? null,
      };
    },
    staleTime: 60 * 1000,
  });

  const data = q.data;
  const visible = !!data && !data.complete && !data.dismissedAt;

  return {
    loading: q.isLoading,
    missing: data?.missing ?? [],
    complete: data?.complete ?? false,
    dismissedAt: data?.dismissedAt ?? null,
    visible,
  } satisfies OnboardingState;
}

export function useDismissOnboarding(venueId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id || !venueId) return;
      const { error } = await supabase
        .from('venue_onboarding_dismissals')
        .upsert({ user_id: user.id, venue_id: venueId, dismissed_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venue-onboarding', venueId] }),
  });
}

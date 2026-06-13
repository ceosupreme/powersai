import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseVenueGMResult {
  gmName: string | null;
  isLoading: boolean;
}

export function useVenueGM(barId: string | null | undefined): UseVenueGMResult {
  const { data, isLoading } = useQuery({
    queryKey: ['venue-gm', barId],
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!barId) return null;
      const { data, error } = await supabase
        .from('venue_leadership_contacts')
        .select('display_name, is_primary, created_at')
        .eq('venue_id', barId)
        .eq('role_type', 'gm')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useVenueGM] error:', error);
        return null;
      }
      return data?.display_name ?? null;
    },
  });

  return { gmName: data ?? null, isLoading };
}

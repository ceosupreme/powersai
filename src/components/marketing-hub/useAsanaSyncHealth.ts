// Reads venue_asana_sync_health for warning surfacing in the execution
// adapter panel. >= 3 consecutive failures triggers the warning.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AsanaSyncHealth = {
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
};

export function useAsanaSyncHealth(venueId: string | null | undefined) {
  return useQuery({
    queryKey: ['asana-sync-health', venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<AsanaSyncHealth | null> => {
      const { data, error } = await supabase
        .from('venue_asana_sync_health')
        .select('consecutive_failures,last_success_at,last_failure_at,last_error')
        .eq('venue_id', venueId!)
        .maybeSingle();
      if (error) {
        console.warn('[asana-sync-health] read failed:', error.message);
        return null;
      }
      return data as AsanaSyncHealth | null;
    },
    staleTime: 60 * 1000,
  });
}

/** Manual-sync success path — reset failure counter for this venue. */
export async function markAsanaSyncSuccess(venueId: string) {
  await supabase
    .from('venue_asana_sync_health')
    .upsert({
      venue_id: venueId,
      consecutive_failures: 0,
      last_success_at: new Date().toISOString(),
      last_error: null,
    });
}

export function useInvalidateSyncHealth(venueId: string | null | undefined) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['asana-sync-health', venueId] });
}

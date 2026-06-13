// Reads `venues.is_hospitality` for the given project id. Drives the
// conditional hide of the 4 hospitality-only Growth Audit categories
// (Revenue Patterns, Menu Marketing, Event Performance, Operational
// Readiness) and the Ops Readiness Gate. Defaults to `false` so a missing
// row or a failed read never silently turns hospitality logic on.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FindingCategoryKey } from '@/components/growth-audit/findings/mockFindings';

export const HOSPITALITY_ONLY_CATEGORIES: readonly FindingCategoryKey[] = [
  'revenue', 'menu', 'events', 'operational',
] as const;

export const isHospitalityOnlyCategory = (key: FindingCategoryKey): boolean =>
  (HOSPITALITY_ONLY_CATEGORIES as readonly string[]).includes(key);

export function useIsHospitalityProject(venueId: string | null | undefined) {
  return useQuery({
    queryKey: ['venue', 'is_hospitality', venueId ?? 'none'],
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('venues')
        .select('is_hospitality')
        .eq('id', venueId!)
        .maybeSingle();
      if (error) {
        console.warn('[useIsHospitalityProject] read failed; defaulting to false', error);
        return false;
      }
      return Boolean((data as { is_hospitality?: boolean } | null)?.is_hospitality);
    },
  });
}
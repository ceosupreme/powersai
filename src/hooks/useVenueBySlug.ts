import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueBySlug {
  id: string;
  slug: string;
  name: string;
  project_type: string | null;
}

/**
 * Resolve a client (venue) by its public URL slug for the per-client
 * qualifier page. Backed by the `resolve-venue-by-slug` edge function so
 * we never expose the full venues table to anon.
 */
export function useVenueBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["venue-by-slug", slug],
    enabled: !!slug,
    queryFn: async (): Promise<VenueBySlug | null> => {
      const { data, error } = await supabase.functions.invoke("resolve-venue-by-slug", {
        body: { slug },
      });
      if (error) throw error;
      const v = (data as { venue: VenueBySlug | null } | null)?.venue ?? null;
      return v;
    },
    staleTime: 60_000,
    retry: false,
  });
}
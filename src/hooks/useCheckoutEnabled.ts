import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Reads site_settings.checkout_enabled once; anything other than 'true' means off. */
export function useCheckoutEnabled() {
  const q = useQuery({
    queryKey: ["site-settings", "checkout_enabled"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("site_settings").select("value").eq("key", "checkout_enabled").maybeSingle();
      if (error) return false;
      return String(data?.value ?? "").trim() === "true";
    },
    staleTime: 5 * 60_000,
  });
  return { enabled: q.data === true, loading: q.isLoading };
}

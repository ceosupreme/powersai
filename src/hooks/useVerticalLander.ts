import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VerticalLandingPage } from "./useVerticalLanders";

export function useVerticalLanderBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["vertical-lander", "slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vertical_landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as VerticalLandingPage | null;
    },
    staleTime: 60_000,
  });
}

export interface LeakVectorLite {
  name: string;
  benchmark: string | null;
}

export function useLanderExtraLeaks(projectTypeId: string | null | undefined) {
  return useQuery({
    queryKey: ["vertical-lander", "extra-leaks", projectTypeId],
    enabled: !!projectTypeId,
    queryFn: async (): Promise<LeakVectorLite[]> => {
      const { data: typeRow, error: typeErr } = await (supabase as any)
        .from("project_types")
        .select("id")
        .eq("id", projectTypeId)
        .maybeSingle();
      if (typeErr || !typeRow) return [];
      const { data, error } = await (supabase as any)
        .from("project_type_leak_vectors")
        .select("name,benchmark,sort_order")
        .eq("project_type", typeRow.id)
        .order("sort_order", { ascending: true })
        .limit(2);
      if (error) return [];
      return (data ?? []).map((r: any) => ({ name: r.name, benchmark: r.benchmark }));
    },
    staleTime: 60_000,
  });
}
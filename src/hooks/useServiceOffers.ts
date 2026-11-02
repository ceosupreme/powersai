import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ServiceOffer {
  id: string;
  name: string;
  project_id: string | null;
  description: string | null;
  who_its_for: string | null;
  problem_solved: string | null;
  deliverables: string | null;
  timeline: string | null;
  starter_price: number | null;
  premium_price: number | null;
  best_target: string | null;
  status: "active" | "draft";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["service-offers"];

export function useServiceOffers(projectId?: string | null) {
  return useQuery({
    queryKey: [...KEY, projectId ?? "all"],
    queryFn: async (): Promise<ServiceOffer[]> => {
      let query = supabase.from("service_offers" as any).select("*").order("created_at", { ascending: true });
      if (projectId === "shared") query = query.is("project_id", null);
      else if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ServiceOffer[];
    },
  });
}

export function useServiceOfferMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (input: Partial<ServiceOffer> & { name: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = { ...input, created_by: user.id };
      const { data, error } = await supabase
        .from("service_offers" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ServiceOffer> }) => {
      const { data, error } = await supabase
        .from("service_offers" as any)
        .update(patch as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_offers" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export const OFFER_STATUSES = ["active", "draft"] as const;
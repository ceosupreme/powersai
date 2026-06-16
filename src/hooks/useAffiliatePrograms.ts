import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface AffiliateProgram {
  id: string;
  name: string;
  niche: string | null;
  commission_type: string | null;
  commission_detail: string | null;
  link: string | null;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = ["affiliate-programs"];

export function useAffiliatePrograms() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AffiliateProgram[]> => {
      const { data, error } = await supabase
        .from("affiliate_programs" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AffiliateProgram[];
    },
  });
}

export function useAffiliateProgramMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (input: Partial<AffiliateProgram> & { name: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = { ...input, created_by: user.id };
      const { data, error } = await supabase
        .from("affiliate_programs" as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AffiliateProgram> }) => {
      const { data, error } = await supabase
        .from("affiliate_programs" as any)
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
      const { error } = await supabase.from("affiliate_programs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export const COMMISSION_TYPES = ["percentage", "flat", "hybrid"] as const;
export const AFFILIATE_STATUSES = ["applied", "approved", "active", "rejected", "paused"] as const;
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadAnalysis {
  id: string;
  company_id: string;
  deal_id: string | null;
  source_kind: "url" | "text";
  source_url: string | null;
  source_text: string | null;
  fetched_content: string | null;
  summary: string | null;
  recommended_offer_id: string | null;
  recommendation_reason: string | null;
  priority: "high" | "medium" | "low" | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
}

export function useLeadAnalyses(companyId: string | null) {
  return useQuery({
    queryKey: ["crm", "lead-analyses", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_lead_analyses" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadAnalysis[];
    },
  });
}

export function useAnalyzeLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      company_id: string;
      deal_id?: string | null;
      source_kind: "url" | "text";
      source_url?: string;
      source_text?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("crm-analyze-lead", { body: input });
      if (error) throw error;
      return data as
        | { ok: true; analysis: LeadAnalysis }
        | { ok: false; code: "fetch_failed"; message: string };
    },
    onSuccess: (res, vars) => {
      if ((res as any)?.ok) {
        qc.invalidateQueries({ queryKey: ["crm", "lead-analyses", vars.company_id] });
      }
    },
  });
}
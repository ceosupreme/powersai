import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OutreachChannel = "cold_email" | "linkedin_dm" | "instagram_dm" | "sms";

export interface OutreachSequenceStep {
  day: number;
  label: string;
  body: string;
}

export interface OutreachDraft {
  id: string;
  analysis_id: string;
  company_id: string;
  offer_id: string | null;
  channel: OutreachChannel;
  tone: string | null;
  opener: string | null;
  sequence: OutreachSequenceStep[];
  model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useOutreachDrafts(companyId: string | null) {
  return useQuery({
    queryKey: ["crm", "outreach-drafts", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_outreach_drafts" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OutreachDraft[];
    },
  });
}

export function useGenerateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      analysis_id: string;
      company_id: string;
      channel: OutreachChannel;
      tone?: string;
      sequence_days?: number[];
    }) => {
      const { data, error } = await supabase.functions.invoke("crm-generate-outreach", {
        body: { analysis_id: input.analysis_id, channel: input.channel, tone: input.tone, sequence_days: input.sequence_days },
      });
      if (error) throw error;
      return data as { ok: true; draft: OutreachDraft };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm", "outreach-drafts", vars.company_id] });
    },
  });
}

export function useUpdateOutreachDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId, patch }: { id: string; companyId: string; patch: Partial<OutreachDraft> }) => {
      const { error } = await supabase
        .from("crm_outreach_drafts" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["crm", "outreach-drafts", r.companyId] });
    },
  });
}

export function useDeleteOutreachDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase.from("crm_outreach_drafts" as any).delete().eq("id", id);
      if (error) throw error;
      return { companyId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["crm", "outreach-drafts", r.companyId] });
    },
  });
}

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  cold_email: "Cold Email",
  linkedin_dm: "LinkedIn DM",
  instagram_dm: "Instagram DM",
  sms: "SMS",
};
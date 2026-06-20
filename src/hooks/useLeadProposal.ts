import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectSetupProposal = {
  lead_id: string;
  direct: {
    name: string | null;
    project_type: string | null;
    timezone: string | null;
    address: string | null;
  };
  contact: {
    display_name: string | null;
    email: string | null;
    phone: string | null;
    role_label: string | null;
  } | null;
  suggestions: {
    primary_channel?: { value: string; rationale: string };
    pillar_focus?: { keys: string[]; rationale: string };
    leak_vector_focus?: { keys: string[]; rationale: string };
    goals_summary?: string;
    not_ready_reason?: string;
  };
  raw: {
    qualifier_data: unknown;
    transcript: unknown;
    conversation_channel: string | null;
  };
  ai_status: "ok" | "skipped" | "failed";
};

export function useLeadProposal() {
  return useMutation({
    mutationFn: async (lead_id: string): Promise<ProjectSetupProposal> => {
      const { data, error } = await supabase.functions.invoke("lead-to-project-proposal", {
        body: { lead_id },
      });
      if (error) throw error;
      if (!data?.ok || !data?.proposal) throw new Error(data?.error ?? "Proposal failed");
      return data.proposal as ProjectSetupProposal;
    },
  });
}
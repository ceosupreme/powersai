import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AutomationKey = "followup_sequence" | "reactivation" | "review_request";

export interface AutomationEnrollment {
  id: string;
  project_id: string;
  automation_key: AutomationKey;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useAutomationEnrollments(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["automation-enrollments", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_automation_enrollments")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []) as AutomationEnrollment[];
    },
  });
}

export function useUpsertEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      automation_key: AutomationKey;
      enabled: boolean;
      config?: Record<string, unknown>;
    }) => {
      const { error } = await (supabase as any)
        .from("project_automation_enrollments")
        .upsert(
          {
            project_id: input.project_id,
            automation_key: input.automation_key,
            enabled: input.enabled,
            config: input.config ?? {},
          },
          { onConflict: "project_id,automation_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["automation-enrollments", v.project_id] }),
  });
}
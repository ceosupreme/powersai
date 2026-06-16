import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AutomationRun {
  id: string;
  content_item_id: string;
  project_id: string;
  rule_key: string;
  task_ids: string[];
  tasks_created: number;
  status: "completed" | "undone" | "failed" | string;
  error: string | null;
  created_at: string;
  undone_at: string | null;
}

export function useContentAutomationRuns(contentItemId: string | undefined) {
  return useQuery({
    enabled: !!contentItemId,
    queryKey: ["content-automation-runs", contentItemId],
    queryFn: async (): Promise<AutomationRun[]> => {
      const { data, error } = await supabase
        .from("content_automation_runs")
        .select("*")
        .eq("content_item_id", contentItemId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationRun[];
    },
  });
}

export function useUndoAutomationRun(contentItemId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await supabase.functions.invoke("content-publish-automation-undo", {
        body: { run_id: runId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-automation-runs", contentItemId] });
      qc.invalidateQueries({ queryKey: ["content-item-tasks", contentItemId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["content-items"] });
    },
  });
}
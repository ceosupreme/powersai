import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AutomationKey = "followup_sequence" | "reactivation" | "review_request";

export interface AutomationBundleItem {
  id: string;
  bundle_id: string;
  automation_key: AutomationKey;
  default_config: Record<string, unknown>;
  sort_order: number;
}

export interface AutomationBundle {
  id: string;
  name: string;
  description: string | null;
  tier: string | null;
  project_type: string | null;
  sort_order: number;
  is_active: boolean;
  items?: AutomationBundleItem[];
}

export function useAutomationBundles(opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ["automation-bundles", { includeInactive: !!opts.includeInactive }],
    queryFn: async () => {
      let q = (supabase as any)
        .from("automation_bundles")
        .select("*, items:automation_bundle_items(*)")
        .order("sort_order", { ascending: true });
      if (!opts.includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AutomationBundle[];
    },
  });
}

export interface ApplyBundleResult {
  created: AutomationKey[];
  skipped: AutomationKey[];
  replaced: AutomationKey[];
}

export function useApplyBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      bundle_id: string;
      overwrite?: "skip" | "replace";
    }): Promise<ApplyBundleResult> => {
      const { data, error } = await supabase.functions.invoke("apply-automation-bundle", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return data as ApplyBundleResult;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["automation-enrollments", v.project_id] });
    },
  });
}
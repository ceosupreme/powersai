import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecoveryStatus = "draft" | "reviewed" | "sent";

export interface RecoveryMetrics {
  leads: { total: number; after_hours: number; by_channel: Record<string, number>; ready: number };
  followups: { sent: number; re_engaged: number };
  reactivation: { contacted: number; responded: number };
  reviews: { requests_sent: number; reviews_landed: number };
}

export interface EstimateBasis {
  avg_ticket: number;
  close_rate: number;
  source: "project" | "default" | "mixed";
  formula: string;
  caveats: string[];
}

export interface RecoveryReport {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  metrics: RecoveryMetrics;
  estimated_dollars: number;
  estimate_basis: EstimateBasis;
  narrative: string | null;
  narrative_edited: boolean;
  status: RecoveryStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  generated_at: string;
  updated_at: string;
}

export function useRecoveryReports(projectId: string | null) {
  return useQuery({
    queryKey: ["recovery-reports", projectId],
    queryFn: async () => {
      let q = supabase
        .from("recovery_reports")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(50);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RecoveryReport[];
    },
  });
}

export function useRecoveryReportMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["recovery-reports"] });

  const saveNarrative = useMutation({
    mutationFn: async ({ id, narrative }: { id: string; narrative: string }) => {
      const { error } = await supabase
        .from("recovery_reports")
        .update({ narrative, narrative_edited: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markReviewed = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("recovery_reports")
        .update({
          status: "reviewed",
          reviewed_by: user.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recovery_reports")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { saveNarrative, markReviewed, markSent };
}
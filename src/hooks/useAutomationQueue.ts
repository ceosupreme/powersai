import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AutomationKey } from "./useAutomationEnrollments";

export type QueueStatus =
  | "pending_review" | "approved" | "sending" | "sent" | "rejected" | "failed" | "canceled";

export interface QueueItem {
  id: string;
  project_id: string;
  automation_key: AutomationKey;
  source_run_id: string | null;
  recipient_snapshot: Record<string, unknown>;
  channel: "email" | "sms" | "linkedin_dm" | "instagram_dm" | "review_reply";
  subject: string | null;
  body: string;
  edited_body: string | null;
  status: QueueStatus;
  scheduled_for: string | null;
  reject_reason: string | null;
  send_result: Record<string, unknown> | null;
  approved_by: string | null;
  approved_at: string | null;
  flagged_for_operator: boolean;
  created_at: string;
}

export interface QueueFilters {
  projectId?: string | null;
  automationKey?: AutomationKey | null;
  status?: QueueStatus | null;
  flaggedOnly?: boolean;
}

export function useAutomationQueue(filters: QueueFilters = {}) {
  return useQuery({
    queryKey: ["automation-queue", filters],
    queryFn: async () => {
      let q: any = (supabase as any)
        .from("automation_message_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.projectId) q = q.eq("project_id", filters.projectId);
      if (filters.automationKey) q = q.eq("automation_key", filters.automationKey);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.flaggedOnly) q = q.eq("flagged_for_operator", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QueueItem[];
    },
    refetchInterval: 30_000,
  });
}

export function useQueueMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["automation-queue"] });

  const approve = useMutation({
    mutationFn: async (input: { id: string; editedBody?: string | null }) => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      const { error } = await (supabase as any)
        .from("automation_message_queue")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
          edited_body: input.editedBody ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      const { error } = await (supabase as any)
        .from("automation_message_queue")
        .update({
          status: "rejected",
          reject_reason: input.reason ?? null,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const flag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("automation_message_queue")
        .update({ flagged_for_operator: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reschedule = useMutation({
    mutationFn: async (input: { id: string; scheduled_for: string | null }) => {
      const { error } = await (supabase as any)
        .from("automation_message_queue")
        .update({ scheduled_for: input.scheduled_for })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const sendNow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).functions.invoke("automation-send-approved", {
        body: { queue_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      const { error } = await (supabase as any)
        .from("automation_message_queue")
        .update({
          status: "approved",
          send_result: null,
          approved_at: new Date().toISOString(),
          approved_by: user?.id ?? null,
        })
        .eq("id", id)
        .eq("status", "failed");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const suppressRecipient = useMutation({
    mutationFn: async (input: { project_id: string; email: string; reason?: string }) => {
      const { data: { user } } = await (supabase as any).auth.getUser();
      const email = String(input.email ?? "").trim().toLowerCase();
      if (!email) throw new Error("No recipient email");
      const { error } = await (supabase as any)
        .from("email_suppressions")
        .insert({
          project_id: input.project_id,
          email,
          reason: input.reason ?? "operator_suppressed",
          created_by: user?.id ?? null,
        });
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: invalidate,
  });

  return { approve, reject, reschedule, sendNow, flag, retry, suppressRecipient };
}
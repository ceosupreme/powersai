import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type CaptureStatus = "inbox" | "routed" | "archived";
export type CaptureType = "task" | "idea" | "note" | "brand_asset" | "crm_lead" | "content_idea";
export type CaptureAiStatus = "none" | "pending" | "suggested" | "accepted" | "rejected";
export type CaptureItem = {
  id: string; raw_text: string; status: CaptureStatus;
  routed_project_id: string | null; routed_type: CaptureType | null; routed_at: string | null;
  suggested_project_id: string | null; suggested_type: CaptureType | null;
  ai_suggestion_status: CaptureAiStatus; ai_reasoning: string | null;
  created_by: string; created_at: string;
};

export function useCaptureItems(status: CaptureStatus = "inbox") {
  return useQuery({
    queryKey: ["capture","items", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capture_items").select("*").eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaptureItem[];
    },
  });
}

export function useInboxBadgeCount() {
  const q = useCaptureItems("inbox");
  return q.data?.length ?? 0;
}

export function useCaptureMutations() {
  const qc = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["capture","items"] });
    qc.invalidateQueries({ queryKey: ["crm"] });
    qc.invalidateQueries({ queryKey: ["production-board-items"] });
    qc.invalidateQueries({ queryKey: ["brand-workspace"] });
  };

  return {
    capture: useMutation({
      mutationFn: async (raw_text: string) => {
        const trimmed = raw_text.trim();
        if (!trimmed) throw new Error("empty");
        // INSTANT write — no AI call. created_by defaults to auth.uid() per RLS.
        const { data, error } = await supabase.from("capture_items")
          .insert({ raw_text: trimmed, created_by: userId! })
          .select().single();
        if (error) throw error;
        return data as CaptureItem;
      },
      onSuccess: () => inv(),
    }),
    routeItem: useMutation({
      mutationFn: async (input: { id: string; project_id: string | null; type: CaptureType; raw_text: string }) => {
        const { data, error } = await (supabase as any).rpc('hq_route_capture', {
          p_capture_id: input.id, p_project_id: input.project_id, p_type: input.type,
        });
        if (error) throw error;
        return data;

      },
      onSuccess: () => inv(),
    }),
    archive: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("capture_items")
          .update({ status: "archived" }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => inv(),
    }),
    requestSuggestion: useMutation({
      mutationFn: async (capture_item_id: string) => {
        const { data, error } = await supabase.functions.invoke("capture-classify", {
          body: { capture_item_id },
        });
        if (error) throw error;
        return data;
      },
      onSuccess: () => inv(),
    }),
  };
}
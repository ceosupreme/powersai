import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useChecklist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["user_checklist_progress", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_checklist_progress")
        .select("item_key")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.item_key);
    },
  });

  const completed = query.data ?? [];

  const toggle = useMutation({
    mutationFn: async ({ itemKey, complete }: { itemKey: string; complete: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (complete) {
        const { error } = await supabase
          .from("user_checklist_progress")
          .upsert({ user_id: user.id, item_key: itemKey }, { onConflict: "user_id,item_key" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_checklist_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("item_key", itemKey);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const isComplete = useCallback(
    (k: string) => completed.includes(k),
    [completed],
  );

  return {
    completedKeys: completed,
    isLoading: query.isLoading,
    isComplete,
    toggle: (itemKey: string, complete: boolean) => toggle.mutate({ itemKey, complete }),
  };
}
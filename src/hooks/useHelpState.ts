import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface HelpStateRow {
  user_id: string;
  help_enabled: boolean;
  dismissed_keys: string[];
}

const DEFAULT: Omit<HelpStateRow, "user_id"> = {
  help_enabled: true,
  dismissed_keys: [],
};

export function useHelpState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["user_help_state", user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async (): Promise<HelpStateRow> => {
      if (!user?.id) return { user_id: "", ...DEFAULT };
      const { data, error } = await supabase
        .from("user_help_state")
        .select("user_id, help_enabled, dismissed_keys")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { user_id: user.id, ...DEFAULT };
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Omit<HelpStateRow, "user_id">>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const current = query.data ?? { user_id: user.id, ...DEFAULT };
      const next = {
        user_id: user.id,
        help_enabled: patch.help_enabled ?? current.help_enabled,
        dismissed_keys: patch.dismissed_keys ?? current.dismissed_keys,
      };
      const { error } = await supabase
        .from("user_help_state")
        .upsert(next, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const helpEnabled = query.data?.help_enabled ?? true;
  const dismissed = query.data?.dismissed_keys ?? [];

  const isDismissed = useCallback(
    (k: string) => dismissed.includes(k),
    [dismissed],
  );

  const dismiss = useCallback(
    (k: string) => {
      if (dismissed.includes(k)) return;
      upsert.mutate({ dismissed_keys: [...dismissed, k] });
    },
    [dismissed, upsert],
  );

  const resetAll = useCallback(
    () => upsert.mutate({ dismissed_keys: [] }),
    [upsert],
  );

  const setHelpEnabled = useCallback(
    (enabled: boolean) => upsert.mutate({ help_enabled: enabled }),
    [upsert],
  );

  return {
    helpEnabled,
    dismissedKeys: dismissed,
    isLoading: query.isLoading,
    isDismissed,
    dismiss,
    resetAll,
    setHelpEnabled,
  };
}
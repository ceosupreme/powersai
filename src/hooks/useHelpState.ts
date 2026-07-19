import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface HelpStateRow {
  user_id: string;
  help_enabled: boolean;
  dismissed_keys: string[];
  last_backup_at: string | null;
  setup_completed_at: string | null;
  setup_skipped_at: string | null;
  setup_seen_at: string | null;
}

const DEFAULT: Omit<HelpStateRow, "user_id"> = {
  help_enabled: true,
  dismissed_keys: [],
  last_backup_at: null,
  setup_completed_at: null,
  setup_skipped_at: null,
  setup_seen_at: null,
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
        .select("user_id, help_enabled, dismissed_keys, last_backup_at, setup_completed_at, setup_skipped_at, setup_seen_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as HelpStateRow | null) ?? { user_id: user.id, ...DEFAULT };
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
        last_backup_at:
          patch.last_backup_at !== undefined ? patch.last_backup_at : current.last_backup_at,
        setup_completed_at:
          patch.setup_completed_at !== undefined
            ? patch.setup_completed_at
            : current.setup_completed_at,
        setup_skipped_at:
          patch.setup_skipped_at !== undefined
            ? patch.setup_skipped_at
            : current.setup_skipped_at,
        setup_seen_at:
          patch.setup_seen_at !== undefined
            ? patch.setup_seen_at
            : current.setup_seen_at,
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
  const lastBackupAt = query.data?.last_backup_at ?? null;
  const setupCompletedAt = query.data?.setup_completed_at ?? null;
  const setupSkippedAt = query.data?.setup_skipped_at ?? null;
  const setupSeenAt = (query.data as HelpStateRow | undefined)?.setup_seen_at ?? null;

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

  const markBackupTaken = useCallback(
    () => upsert.mutate({ last_backup_at: new Date().toISOString() }),
    [upsert],
  );

  const markSetupCompleted = useCallback(
    () => upsert.mutateAsync({ setup_completed_at: new Date().toISOString() }),
    [upsert],
  );

  const markSetupSkipped = useCallback(
    () => upsert.mutateAsync({ setup_skipped_at: new Date().toISOString() }),
    [upsert],
  );

  const markSetupSeen = useCallback(
    () => upsert.mutateAsync({ setup_seen_at: new Date().toISOString() }),
    [upsert],
  );

  const relaunchSetup = useCallback(
    () =>
      upsert.mutateAsync({
        setup_completed_at: null,
        setup_skipped_at: null,
        setup_seen_at: null,
      }),
    [upsert],
  );

  return {
    helpEnabled,
    dismissedKeys: dismissed,
    lastBackupAt,
    setupCompletedAt,
    setupSkippedAt,
    setupSeenAt,
    setupDismissed: !!(setupCompletedAt || setupSkippedAt),
    isLoading: query.isLoading,
    isDismissed,
    dismiss,
    resetAll,
    setHelpEnabled,
    markBackupTaken,
    markSetupCompleted,
    markSetupSkipped,
    markSetupSeen,
    relaunchSetup,
  };
}
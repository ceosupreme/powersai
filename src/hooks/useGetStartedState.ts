import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useHelpState } from "@/hooks/useHelpState";
import { useChecklist } from "@/hooks/useChecklist";
import { VENUE_ONBOARDING_STEPS } from "@/config/venueOnboardingSteps";

const DISMISS_KEY = "portfolio_get_started";

const REQUIRED_LIVE_STEPS = VENUE_ONBOARDING_STEPS.filter(
  (s) => s.required && (s.phase === "identity" || s.phase === "go_live"),
).map((s) => s.key);

/**
 * Aggregates existing setup signals (SetupWizard state, Build A per-venue
 * onboarding progress, Launch Checklist) to decide whether to greet the
 * owner/admin with a "Get started" card on the Portfolio.
 */
export function useGetStartedState() {
  const { user, isAdmin, isOwner } = useAuth();
  const { accessibleBars } = useApp();
  const help = useHelpState();
  const checklist = useChecklist();

  const venueIds = accessibleBars.map((b) => b.id);

  const progressQuery = useQuery({
    queryKey: ["portfolio-get-started-progress", venueIds.sort().join(",")],
    enabled: !!user?.id && venueIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_onboarding_progress")
        .select("venue_id, step_key, status")
        .in("venue_id", venueIds)
        .in("step_key", REQUIRED_LIVE_STEPS);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completeByVenue = new Map<string, Set<string>>();
  for (const row of progressQuery.data ?? []) {
    if (row.status !== "complete") continue;
    const set = completeByVenue.get(row.venue_id) ?? new Set();
    set.add(row.step_key);
    completeByVenue.set(row.venue_id, set);
  }
  const liveVenueCount = Array.from(completeByVenue.values()).filter((set) =>
    REQUIRED_LIVE_STEPS.every((k) => set.has(k)),
  ).length;

  const hasVenues = venueIds.length > 0;
  const anyVenueLive = liveVenueCount > 0;
  const setupDone = help.setupDismissed;
  const checklistStarted = checklist.completedKeys.length > 0;
  const userDismissed = help.isDismissed(DISMISS_KEY);

  const isOwnerOrAdmin = !!(isAdmin || isOwner);

  const loading =
    help.isLoading || checklist.isLoading || progressQuery.isLoading;

  // Show only when owner/admin AND none of the "done" conditions are met.
  const shouldShow =
    !!user &&
    isOwnerOrAdmin &&
    !loading &&
    !userDismissed &&
    !anyVenueLive &&
    !(setupDone && checklistStarted && hasVenues);

  const dismiss = useCallback(() => help.dismiss(DISMISS_KEY), [help]);

  return {
    shouldShow,
    isOwnerOrAdmin,
    hasVenues,
    venueCount: venueIds.length,
    liveVenueCount,
    anyVenueLive,
    setupDone,
    checklistStarted,
    checklistCompletedCount: checklist.completedKeys.length,
    relaunchSetup: help.relaunchSetup,
    dismiss,
  };
}
import { useNavigate } from "react-router-dom";
import { Sparkles, Building2, Compass, ListChecks, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetStartedState } from "@/hooks/useGetStartedState";

export function PortfolioGetStartedCard() {
  const navigate = useNavigate();
  const state = useGetStartedState();

  if (!state.shouldShow) return null;

  const { venueCount, liveVenueCount, setupDone, checklistCompletedCount } = state;

  return (
    <div className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
      <button
        type="button"
        onClick={state.dismiss}
        aria-label="Dismiss welcome"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground">
            Welcome — let's get your first venue live
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your operator OS is ready. Pick a starting point below — you can
            re-open any of these later from Help.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button
              variant="default"
              className="justify-start"
              onClick={() => navigate("/admin?tab=projects")}
            >
              <Building2 className="h-4 w-4" />
              Set up first venue
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => state.relaunchSetup()}
            >
              <Compass className="h-4 w-4" />
              Take the tour
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() => navigate("/launch")}
            >
              <ListChecks className="h-4 w-4" />
              Launch checklist
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {liveVenueCount} of {venueCount || 0} venues live ·{" "}
            {setupDone ? "Tour complete" : "Tour not started"} · Checklist{" "}
            {checklistCompletedCount} item{checklistCompletedCount === 1 ? "" : "s"} done
          </p>
        </div>
      </div>
    </div>
  );
}
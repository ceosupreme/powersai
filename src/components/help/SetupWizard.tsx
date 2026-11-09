import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHelpState } from "@/hooks/useHelpState";
import { useAuth } from "@/context/AuthContext";
import { useProjectDirectory } from "@/hooks/usePortfolioData";
import { toast } from "sonner";
import { Sparkles, Folder, Inbox, Users, Compass, ArrowRight, Layers, ClipboardCheck, TrendingUp, FileText } from "lucide-react";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  /** Send the owner to one of their real brands' Setup tab instead of actionHref. */
  brandSetup?: boolean;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to HQ",
    body: (
      <>
        HQ is the back office for every brand, channel, app and client business you run. It answers
        three questions. What needs me today? Open <strong>Dashboard</strong>. How is each brand
        doing? Open <strong>Portfolio</strong>. What is still missing? Open a brand and look at its{" "}
        <strong>Setup</strong> tab. This tour walks those screens in the order you will use them.
      </>
    ),
  },
  {
    icon: Inbox,
    title: "Dashboard: what needs you today",
    body: (
      <>
        Choose "All brands & clients" in the project picker at the top. Clear{" "}
        <strong>Waiting on me</strong> first with Approve, Reject or Snooze. Then work down{" "}
        <strong>Next 10 across all projects</strong>, the ranked list of your steps. A row marked
        KPI asks for a number. A row that ends with "Pipeline" opens the piece of work waiting on
        you.
      </>
    ),
    actionHref: "/workspace",
    actionLabel: "Open Dashboard",
  },
  {
    icon: Layers,
    title: "Portfolio: how every brand is doing",
    body: (
      <>
        One card per brand with its overall score, the change from last week, its setup line (for
        example "Setup: 7 of 10 in place, Ready to grow") and this month's money. Sort the cards by
        "Setup gaps" to find the brands furthest from set up. Tap a card to open that brand.
      </>
    ),
    actionHref: "/portfolio",
    actionLabel: "Open Portfolio",
  },
  {
    icon: Folder,
    title: "A brand's workspace",
    body: (
      <>
        Each brand opens on <strong>Overview</strong>: its pillar scores and what is waiting on you.
        The <strong>Setup</strong> tab lists every account and asset the brand should have and
        which are missing. "Set up the top 3" starts the three most important ones, and "Copy
        setup brief" hands the rest to an assistant. <strong>Channels</strong>,{" "}
        <strong>Products</strong> and <strong>Content</strong> hold the rest of the brand.
      </>
    ),
    actionHref: "/portfolio",
    actionLabel: "Open a brand's Setup tab",
    brandSetup: true,
  },
  {
    icon: ClipboardCheck,
    title: "Making things: Radar, pipelines and the Production Board",
    body: (
      <>
        <strong>Radar</strong> researches each channel brand and files ready-to-make briefs. Tap
        "Make this" on one and HQ creates a pipeline: a list of steps, each belonging to Claude or
        to you. Claude does its steps overnight and saves the files to the brand's Drive folder.
        Your steps show up in Next 10. The <strong>Production Board</strong> shows every piece in
        progress.
      </>
    ),
    actionHref: "/production-board",
    actionLabel: "Open Production Board",
  },
  {
    icon: FileText,
    title: "Playbooks: how each thing gets made",
    body: (
      <>
        A playbook is the method for one format, platform, money path or niche. Claude follows it
        when it makes something. Add your own courses, notes and videos with "Add your material",
        and the crew merges them that night. Playbooks marked "Thin" need your notes most.
      </>
    ),
    actionHref: "/playbooks",
    actionLabel: "Open Playbooks",
  },
  {
    icon: TrendingUp,
    title: "Numbers and scores",
    body: (
      <>
        Numbers come in from screenshots, Metricool and what you type in. Each number fills a
        pillar, and the pillars roll up into the brand's overall score out of 100. KPI rows in Next
        10 ask for this week's numbers. <strong>Weekly Review</strong> shows the full week for the
        selected brand.
      </>
    ),
    actionHref: "/weekly-review",
    actionLabel: "Open Weekly Review",
  },
  {
    icon: Users,
    title: "Client businesses (optional)",
    body: (
      <>
        Bars, plumbers, HVAC companies and other clients come in through the free check, audits
        and proposals, and HQ scores them on revenue, team, delivery and client experience. Their
        starting settings live in Admin Panel, Pillars: the pillars for each type of business, the
        money-leak checks the Growth Audit runs, and the questions the public lead quiz asks. Your
        own brands already have their own scorecards, so nothing here is needed for them.
      </>
    ),
    actionHref: "/admin?tab=pillars",
    actionLabel: "Open client settings",
  },
  {
    icon: Compass,
    title: "When you're stuck",
    body: (
      <>
        The <strong>Guide</strong> explains every screen step by step, with an "Open this screen"
        button on each article. The <strong>Launch Checklist</strong> tracks setup. Both are in
        the side menu under System. Re-run this tour any time from Admin Panel, Settings, Help &
        Guidance.
      </>
    ),
    actionHref: "/guide",
    actionLabel: "Open the Guide",
  },
];

export function SetupWizard() {
  const { user } = useAuth();
  const {
    helpEnabled,
    setupDismissed,
    setupSeenAt,
    isLoading,
    markSetupCompleted,
    markSetupSkipped,
    markSetupSeen,
  } = useHelpState();
  const navigate = useNavigate();
  const location = useLocation();
  // The brand step opens one of the owner's real brands, so the tour shows live data, not an empty screen.
  const { data: directory = [] } = useProjectDirectory();
  const firstBrand =
    directory.find((p) => p.group === "brands" && p.focus_status === "active" && p.project_type === "internal_brand") ??
    directory.find((p) => p.group === "brands" && p.focus_status === "active") ??
    null;
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const seenStampedRef = useRef(false);

  // Auto-launch is restricted to a small allow-list so the tour never appears
  // on top of a project-scoped surface the user navigated to intentionally.
  const AUTO_LAUNCH_PATHS = new Set(["/", "/dashboard", "/portfolio"]);
  const routeAllowsAutoLaunch = AUTO_LAUNCH_PATHS.has(location.pathname);

  // Stamp seen exactly once the first time we auto-mount for this user, so a
  // mid-tour refresh can never put the tour back on repeat.
  useEffect(() => {
    if (seenStampedRef.current) return;
    if (!user || isLoading || !helpEnabled) return;
    if (setupDismissed || setupSeenAt) return;
    if (!routeAllowsAutoLaunch) return;
    seenStampedRef.current = true;
    markSetupSeen().catch(() => {
      // Non-blocking: the local `open` state still gates re-mounts this session.
    });
  }, [user, isLoading, helpEnabled, setupDismissed, setupSeenAt, routeAllowsAutoLaunch, markSetupSeen]);

  if (!user || isLoading || !helpEnabled) return null;
  if (setupDismissed || setupSeenAt) return null;
  if (!routeAllowsAutoLaunch) return null;
  if (!open) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const actionHref = s.brandSetup && firstBrand ? `/project/${firstBrand.id}?tab=setup` : s.actionHref;
  const actionLabel = s.brandSetup && firstBrand ? `Open ${firstBrand.name}'s Setup tab` : s.actionLabel;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const closeNow = () => setOpen(false);

  // Dismiss = close immediately, then persist in the background. If the write
  // fails, surface the error via toast — the dialog still closes.
  const dismiss = () => {
    closeNow();
    markSetupSkipped().catch((err) => {
      toast.error("Couldn't save tour state", {
        description: err?.message ?? "We'll ask again next time you sign in.",
      });
    });
  };

  const finish = () => {
    closeNow();
    markSetupCompleted()
      .then(() => {
        toast.success("Getting started tour complete");
        navigate("/workspace");
      })
      .catch((err) => {
        toast.error("Couldn't save tour completion", {
          description: err?.message ?? "The tour will reopen next time — please try again.",
        });
      });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent
        className="sm:max-w-lg"
        aria-describedby="setup-wizard-eyebrow"
      >
        <DialogHeader>
          <div
            id="setup-wizard-eyebrow"
            className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            <span>Getting started tour</span>
            <span>Step {step + 1} of {STEPS.length}</span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> {s.title}
          </DialogTitle>
        </DialogHeader>
        <Progress value={progress} className="h-1" />
        <div className="text-sm text-muted-foreground leading-relaxed py-2">{s.body}</div>
        {actionHref && actionLabel && (
          <Button
            variant="secondary"
            onClick={() => window.open(actionHref, "_blank", "noopener,noreferrer")}
            className="w-full"
          >
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Skip setup
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>Finish</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHelpState } from "@/hooks/useHelpState";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Folder, Palette, Inbox, Users, Compass, ArrowRight, Layers, ListChecks, Mic, ClipboardCheck, TrendingUp, Plug, Package, ShieldCheck, FileText } from "lucide-react";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome — and the two scores",
    body: (
      <>
        This OS runs your business across projects. Two numbers to anchor on:{" "}
        <strong>Pillar Score</strong> (Weekly Review — "how are we doing") and{" "}
        <strong>Growth Score</strong> (Growth Audit — "where can we grow"). Everything else is
        scoped to whichever project you select in Portfolio.
      </>
    ),
  },
  {
    icon: Folder,
    title: "Create or pick your first project",
    body: (
      <>
        Open Portfolio and add a project (or pick an existing one). Whatever you pick becomes the{" "}
        <strong>active project</strong> everywhere else.
      </>
    ),
    actionHref: "/portfolio",
    actionLabel: "Open Portfolio",
  },
  {
    icon: Layers,
    title: "Pick the project's type (= the vertical)",
    body: (
      <>
        A project's <strong>type</strong> decides which pillars, leak vectors, and qualifier questions
        apply. Adding a new vertical = configuring a type, not coding. Open the project in Admin and
        set its type.
      </>
    ),
    actionHref: "/admin?tab=projects",
    actionLabel: "Open Projects admin",
  },
  {
    icon: ListChecks,
    title: "Review the qualifier questions",
    body: (
      <>
        Settings → <strong>Qualifier Fields</strong> shows the questions the Lead Qualifier will ask
        for this vertical. Edit them and the live agent updates — no deploy.
      </>
    ),
    actionHref: "/admin?tab=settings&subtab=qualifier",
    actionLabel: "Open Qualifier Fields",
  },
  {
    icon: Plug,
    title: "Connect data sources (optional)",
    body: (
      <>
        If this vertical reads from a POS, scheduling app, or review platform, wire it up in{" "}
        <strong>Admin → Integrations</strong>. Skip if there's nothing to connect — most features
        still work without it.
      </>
    ),
    actionHref: "/admin?tab=integrations",
    actionLabel: "Open Integrations",
  },
  {
    icon: ClipboardCheck,
    title: "Run your first Weekly Review",
    body: (
      <>
        Grade each pillar for this week. The Weekly Review rolls them up into the{" "}
        <strong>Pillar Score</strong>.
      </>
    ),
    actionHref: "/weekly-review",
    actionLabel: "Open Weekly Review",
  },
  {
    icon: Mic,
    title: "Try the Lead Qualifier end-to-end",
    body: (
      <>
        Visit <code>/qualify/&lt;vertical&gt;</code> (e.g. /qualify/home-services). Talk or chat
        through it. A new row should appear under <strong>Inbound Leads</strong> in the CRM with the
        answers and transcript.
      </>
    ),
    actionHref: "/qualify/home-services",
    actionLabel: "Open qualifier",
  },
  {
    icon: Inbox,
    title: "Convert a lead → CRM",
    body: (
      <>
        From <strong>CRM → Inbound</strong>, promote a real lead into a company + deal. When the
        deal hits Won, graduate the company into a project to start operating against it.
      </>
    ),
    actionHref: "/crm?tab=inbound",
    actionLabel: "Open Inbound Leads",
  },
  {
    icon: Package,
    title: "Apply an Automation Bundle",
    body: (
      <>
        A <strong>bundle</strong> is a packaged set of automations (follow-up, reactivation, review
        requests). Apply one in Admin → Automation Bundles and AI starts drafting customer messages
        for the project.
      </>
    ),
    actionHref: "/admin?tab=automation-bundles",
    actionLabel: "Open Automation Bundles",
  },
  {
    icon: ShieldCheck,
    title: "Review the Automation Inbox (approval gate)",
    body: (
      <>
        Every AI-drafted customer message pauses in the <strong>Automation Inbox</strong> until you
        approve, edit, or reject it. Nothing sends without your approval.
      </>
    ),
    actionHref: "/automation-inbox",
    actionLabel: "Open Automation Inbox",
  },
  {
    icon: Compass,
    title: "When you're stuck",
    body: (
      <>
        The <strong>Help Center</strong> has a short article per feature, and the{" "}
        <strong>Launch Checklist</strong> tracks setup tasks. Both live in the sidebar; re-launch this
        wizard any time from Settings → Help.
      </>
    ),
    actionHref: "/help",
    actionLabel: "Open Help Center",
  },
];

export function SetupWizard() {
  const { user } = useAuth();
  const {
    helpEnabled,
    setupDismissed,
    isLoading,
    markSetupCompleted,
    markSetupSkipped,
  } = useHelpState();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Only mount for signed-in users who haven't dismissed it. Honour global help toggle.
  if (!user || isLoading || !helpEnabled || setupDismissed) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const finish = () => {
    markSetupCompleted();
    navigate("/dashboard");
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) markSetupSkipped(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> {s.title}
          </DialogTitle>
        </DialogHeader>
        <Progress value={progress} className="h-1" />
        <div className="text-sm text-muted-foreground leading-relaxed py-2">{s.body}</div>
        {s.actionHref && s.actionLabel && (
          <Button
            variant="secondary"
            onClick={() => navigate(s.actionHref!)}
            className="w-full"
          >
            {s.actionLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => markSetupSkipped()}>
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
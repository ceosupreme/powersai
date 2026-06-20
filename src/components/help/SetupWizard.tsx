import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHelpState } from "@/hooks/useHelpState";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Folder, Palette, Inbox, Users, Compass, ArrowRight, Layers, ListChecks, Mic, ClipboardCheck, TrendingUp } from "lucide-react";

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
    title: "Welcome to your Operator OS",
    body: (
      <>
        This OS runs your business across projects: a <strong>CRM</strong>, a public{" "}
        <strong>Lead Qualifier</strong> (voice + chat), a <strong>Weekly Review</strong> that produces
        your Pillar Score, a <strong>Growth Audit</strong> that produces your Growth Score, plus
        Content, Revenue, Brand, Tasks, Logs, and Chat — all scoped to the project you've selected.
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
    icon: Mic,
    title: "Try the Lead Qualifier",
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
    icon: Palette,
    title: "Brand Vault (optional)",
    body: (
      <>
        Drop colors, taglines, hashtags, links, and asset files into the project's brand kit. Skip
        and come back later if you want.
      </>
    ),
    actionHref: "/brand-kit",
    actionLabel: "Open Brand Vault",
  },
  {
    icon: ClipboardCheck,
    title: "Run your first Weekly Review",
    body: (
      <>
        Grade each pillar for this week. The Weekly Review rolls them up into the{" "}
        <strong>Pillar Score</strong> — your 'how are we doing' number.
      </>
    ),
    actionHref: "/weekly-review",
    actionLabel: "Open Weekly Review",
  },
  {
    icon: TrendingUp,
    title: "Open the Growth Audit",
    body: (
      <>
        Growth Audit produces the <strong>Growth Score</strong> — 'where can we grow'. It's separate
        from the Pillar Score. 'No data yet' is normal until an audit runs.
      </>
    ),
    actionHref: "/growth-audit",
    actionLabel: "Open Growth Audit",
  },
  {
    icon: Inbox,
    title: "Capture Inbox + CRM",
    body: (
      <>
        Capture anything fast — AI suggests a type + project, you accept. In the CRM, archive is the
        safe default; promote inbound leads into companies + deals.
      </>
    ),
    actionHref: "/inbox",
    actionLabel: "Open Capture Inbox",
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
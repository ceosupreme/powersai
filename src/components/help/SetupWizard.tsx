import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHelpState } from "@/hooks/useHelpState";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Folder, Palette, Inbox, Users, Compass, ArrowRight } from "lucide-react";

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
    title: "Welcome to Supreme Team Media OS",
    body: (
      <>
        This is your agency operating system: manage <strong>projects</strong>,
        a shared <strong>Brand Vault</strong>, a <strong>CRM</strong> for prospects and clients, and a
        <strong> Capture Inbox</strong> for stray ideas. The wizard guides you — it never creates
        anything on its own.
      </>
    ),
  },
  {
    icon: Folder,
    title: "Create or pick your first project",
    body: (
      <>
        Projects are the unit of work. Head to the Workspace to create a new project or open an
        existing one. You'll come back here when you're done.
      </>
    ),
    actionHref: "/workspace",
    actionLabel: "Open Workspace",
  },
  {
    icon: Palette,
    title: "Set up a Brand Kit (optional)",
    body: (
      <>
        Drop colors, fonts, taglines, and voice into the Brand Vault for the project you picked.
        You can skip this and add it later.
      </>
    ),
    actionHref: "/brand-kit",
    actionLabel: "Open Brand Vault",
  },
  {
    icon: Inbox,
    title: "Capture Inbox",
    body: (
      <>
        Anything you jot down lands here. AI suggests a project + type; you confirm or change
        the routing. Nothing gets filed automatically without your nod.
      </>
    ),
    actionHref: "/inbox",
    actionLabel: "Open Inbox",
  },
  {
    icon: Users,
    title: "CRM",
    body: (
      <>
        Track companies → deals → graduate a won deal into a real project. Archive replaces
        delete by default, so history sticks around.
      </>
    ),
    actionHref: "/crm",
    actionLabel: "Open CRM",
  },
  {
    icon: Compass,
    title: "When you're stuck",
    body: (
      <>
        The <strong>Help Center</strong> has short articles per feature, and the{" "}
        <strong>Launch Checklist</strong> tracks setup tasks. Both live in the sidebar.
      </>
    ),
    actionHref: "/help",
    actionLabel: "Open Help Center",
  },
  {
    icon: Sparkles,
    title: "You're set",
    body: (
      <>
        Hit Finish to land on the Dashboard. You can re-launch this wizard any time from
        Settings → Help.
      </>
    ),
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
            {!isLast && (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Skip step
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>Finish</Button>
            ) : (
              <Button size="sm" variant="default" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
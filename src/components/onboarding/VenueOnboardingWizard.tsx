import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2, Circle, MinusCircle, ExternalLink, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectType } from '@/lib/effectivePillars';
import {
  VENUE_ONBOARDING_STEPS, PHASES, stepsForPhase,
  type OnboardingStep,
} from '@/config/venueOnboardingSteps';
import { useVenueOnboardingDetectors } from '@/hooks/useVenueOnboardingDetectors';
import { useVenueLiveStatus } from '@/hooks/useVenueLiveStatus';
import type { OnboardingStatus } from '@/hooks/useVenueOnboardingProgress';
import { VenueLiveBadge } from './VenueLiveBadge';

// Embedded panels (assemble — don't rebuild).
import { ProjectPillarOverridesPanel } from '@/components/admin/ProjectPillarOverridesPanel';
import { ProjectLeakVectorOverridesPanel } from '@/components/admin/ProjectLeakVectorOverridesPanel';
import { ProjectQualifierOverridesPanel } from '@/components/admin/ProjectQualifierOverridesPanel';
import { AsanaLogSourcesEditor } from '@/components/admin/AsanaLogSourcesEditor';
import { AutomationEnrollmentPanel } from '@/components/automations/AutomationEnrollmentPanel';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
}

interface VenueMeta {
  name: string;
  project_type: ProjectType | null;
}

function StatusIcon({ status }: { status: OnboardingStatus }) {
  if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'skipped') return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function StatusPill({ status }: { status: OnboardingStatus }) {
  if (status === 'complete')
    return <Badge variant="default" className="text-[10px]">Complete</Badge>;
  if (status === 'skipped')
    return <Badge variant="secondary" className="text-[10px]">Skipped</Badge>;
  return <Badge variant="outline" className="text-[10px]">Not started</Badge>;
}

export function VenueOnboardingWizard({ open, onOpenChange, venueId }: Props) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<VenueMeta | null>(null);

  useEffect(() => {
    if (!open || !venueId) return;
    let cancelled = false;
    supabase
      .from('venues')
      .select('name,project_type')
      .eq('id', venueId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMeta((data as VenueMeta) ?? null);
      });
    return () => { cancelled = true; };
  }, [open, venueId]);

  const progress = useVenueOnboardingDetectors(venueId, meta?.project_type ?? null);
  const live = useVenueLiveStatus(progress.statusFor);

  const renderInline = (step: OnboardingStep) => {
    if (!step.inlineComponent || !meta?.project_type) return null;
    switch (step.inlineComponent) {
      case 'pillars':
        return <ProjectPillarOverridesPanel projectId={venueId} projectType={meta.project_type} />;
      case 'leak_vectors':
        return <ProjectLeakVectorOverridesPanel projectId={venueId} projectType={meta.project_type} />;
      case 'qualifier':
        return <ProjectQualifierOverridesPanel projectId={venueId} projectType={meta.project_type} />;
      case 'asana_log_sources':
        return <AsanaLogSourcesEditor venueId={venueId} />;
      case 'automations':
        return <AutomationEnrollmentPanel projectId={venueId} />;
    }
  };

  const renderStep = (step: OnboardingStep) => {
    const status = progress.statusFor(step.key);
    const Icon = step.icon;
    return (
      <AccordionItem key={step.key} value={step.key} className="border rounded-md">
        <AccordionTrigger className="px-3 py-3 hover:no-underline">
          <div className="flex items-center gap-3 w-full min-w-0">
            <StatusIcon status={status} />
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium truncate">{step.title}</div>
              <div className="text-xs text-muted-foreground truncate">{step.description}</div>
            </div>
            <StatusPill status={status} />
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3 space-y-3">
          {step.inlineComponent ? (
            <div className="rounded-md border bg-card p-2">{renderInline(step)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {step.description}{' '}
              {step.href && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(step.href!(venueId));
                  }}
                >
                  Open settings <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={status === 'complete' ? 'secondary' : 'default'}
              onClick={() => progress.setStatus(step.key, 'complete')}
            >
              {status === 'complete' ? 'Marked complete' : 'Mark complete'}
            </Button>
            {!step.required && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => progress.setStatus(
                  step.key,
                  status === 'skipped' ? 'not_started' : 'skipped',
                )}
              >
                {status === 'skipped' ? 'Un-skip' : 'Skip for now'}
              </Button>
            )}
            {status !== 'not_started' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => progress.setStatus(step.key, 'not_started')}
              >
                Reset
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[min(90dvh,800px)] flex flex-col p-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base sm:text-lg">
            Set up {meta?.name ?? 'this client'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Walk through the phases to get this client live and fully configured.
          </DialogDescription>
          <div className="pt-2">
            <VenueLiveBadge
              isLive={live.isLive}
              phase3Pct={live.phase3Pct}
              requiredDone={live.requiredDone}
              requiredTotal={live.requiredTotal}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
          {!meta ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading client…
            </div>
          ) : (
            <Tabs defaultValue={live.isLive ? 'full_config' : 'go_live'}>
              <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                {PHASES.map((p) => (
                  <TabsTrigger key={p.key} value={p.key} className="text-xs sm:text-sm">
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {PHASES.map((p) => {
                const steps = stepsForPhase(p.key);
                return (
                  <TabsContent key={p.key} value={p.key} className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground px-1">{p.subtitle}</p>
                    <Accordion
                      type="single"
                      collapsible
                      defaultValue={steps.find((s) => progress.statusFor(s.key) !== 'complete')?.key}
                      className="space-y-2"
                    >
                      {steps.map(renderStep)}
                    </Accordion>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
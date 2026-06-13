import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Send, Lightbulb, FileBarChart, Workflow, ShieldAlert, BookOpen, History } from 'lucide-react';
import { FindingCampaignsAttempted } from './FindingCampaignsAttempted';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABEL, type Finding, type FindingStatus } from './mockFindings';
import { FINDING_TYPE_TEMPLATES } from './findingTypes';
import { upsideLabel, easeLabel, confidenceLabel, opsRiskLabel, upsideTone, easeTone } from './findingScales';
import { severityTone, type ReadinessGate } from '../scoreBands';
import { GateBadge, computeGateState } from '../GateBadge';
import { ActionPackPanel } from '../action-packs/ActionPackPanel';
import { useApp } from '@/context/AppContext';

type Props = {
  finding: Finding | null;
  gate: ReadinessGate;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Finding>) => void;
};

export const FindingDetail = ({ finding, gate, onClose, onUpdate }: Props) => {
  const { toast } = useToast();
  const { selectedBar } = useApp();
  const [overridden, setOverridden] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState('');

  if (!finding) return null;
  const template = FINDING_TYPE_TEMPLATES[finding.type];
  const gateState = computeGateState(finding.isTrafficDriving, gate);
  const isOpsBlocker = finding.type === 'operational_readiness_blocker';

  const setStatus = (status: FindingStatus, extra?: Partial<Finding>) => {
    onUpdate(finding.id, { status, ...extra });
    console.log('[GROWTH-AUDIT] finding status:', finding.id, '→', status);
    toast({ title: 'Finding updated', description: `Status set to "${status}".` });
  };

  const handleDismiss = () => {
    if (!dismissReason.trim()) return;
    setStatus('Dismissed', { dismissReason: dismissReason.trim() });
    setDismissOpen(false);
    setDismissReason('');
  };

  const snoozeFor = (days: number) => {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStatus('Snoozed', { snoozedUntil: until });
  };

  const pushAnyway = () => {
    setOverridden(true);
    console.log('[GROWTH-AUDIT] gate override:', finding.id, finding.title);
    toast({
      title: 'Gate override recorded',
      description: 'Send to Marketing Hub is now enabled. The warning stays visible.',
    });
  };

  const sendBlocked = gateState === 'block' && !overridden;

  return (
    <Sheet open={!!finding} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[720px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-2 flex-wrap">
            <SheetTitle className="text-lg leading-snug flex-1 min-w-0">{finding.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {finding.signalKey?.startsWith('seed:') && (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground bg-muted/30">Demo</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[finding.category]}</Badge>
            <Badge variant="outline" className="text-[10px] bg-muted/40 text-muted-foreground">
              {template.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${severityTone(finding.severity === 'Critical' ? 'High' : finding.severity)}`}>
              {finding.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px]">Priority {finding.priorityScore}</Badge>
            <Badge variant="outline" className="text-[10px]">{finding.status}</Badge>
            <GateBadge state={gateState} overridden={overridden} />
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Revenue Upside" tone={upsideTone(finding.revenueUpside)}>{upsideLabel(finding.revenueUpside)}</Stat>
            <Stat label="Ease" tone={easeTone(finding.ease)}>{easeLabel(finding.ease)}</Stat>
            <Stat label="Confidence" tone="bg-muted text-foreground border-border">{confidenceLabel(finding.confidence)}</Stat>
            <Stat label="Ops Risk" tone="bg-muted text-foreground border-border">{opsRiskLabel(finding.operationalRisk)}</Stat>
          </div>

          {/* Gate warning + override (only when gated) */}
          {gateState === 'block' && finding.gateReason && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-destructive">Gated by Ops Readiness</div>
                <div className="text-foreground/90 mt-0.5">{finding.gateReason}</div>
                {!overridden && (
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10" onClick={pushAnyway}>
                    Push anyway
                  </Button>
                )}
                {overridden && (
                  <div className="mt-1 text-[11px] opacity-80">Override logged. Warning remains visible until Ops Readiness improves.</div>
                )}
              </div>
            </div>
          )}
          {gateState === 'caution' && finding.gateReason && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-amber-700 dark:text-amber-500">{finding.gateReason}</div>
            </div>
          )}

          <Section icon={BookOpen} title="Diagnosis">
            <p className="text-sm text-foreground/90 leading-relaxed">{finding.diagnosis}</p>
          </Section>

          <Section icon={FileBarChart} title="Evidence">
            <p className="text-sm text-foreground/90 leading-relaxed">{finding.evidence.summary}</p>
            {finding.type?.startsWith('reputation_') && Array.isArray((finding as any).metadata?.sample_excerpts) && (finding as any).metadata.sample_excerpts.length > 0 && (
              <div className="mt-3 space-y-2">
                {((finding as any).metadata.sample_excerpts as string[]).slice(0, 3).map((ex, i) => (
                  <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/80">
                    "{ex}"
                  </blockquote>
                ))}
                <div className="text-xs text-muted-foreground">
                  From {(finding as any).metadata.mention_count_90d ?? '—'} reviews · last 90 days
                </div>
              </div>
            )}
            {finding.type === 'operational_readiness_blocker' && Array.isArray((finding as any).metadata?.contributing_signals) && (
              <div className="mt-3 space-y-2">
                {((finding as any).metadata.contributing_signals as Array<any>).map((sig, i) => (
                  <Card key={i} className="p-3 bg-card/50 border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{sig.source_label ?? sig.source}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize bg-muted text-muted-foreground">{sig.strength}</Badge>
                      </div>
                      {Array.isArray(sig.refs) && sig.refs[0] && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[40%]">{sig.refs[0]}</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/85 mt-2 leading-relaxed">{sig.summary}</p>
                  </Card>
                ))}
              </div>
            )}
            {finding.type === 'event_lift_opportunity' && (finding as any).metadata?.event_avg && (() => {
              const m = (finding as any).metadata;
              const max = Math.max(Number(m.event_avg), Number(m.baseline_avg), 1);
              return (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {String(m.dow ?? '').replace(/^./, (c) => c.toUpperCase())} · {String(m.category)} sales · {m.event_nights} event nights vs {m.baseline_nights} baseline
                  </div>
                  <LiftBar label={`${m.event_name} nights`} value={Number(m.event_avg)} max={max} tone="bg-primary" />
                  <LiftBar label="Baseline" value={Number(m.baseline_avg)} max={max} tone="bg-muted-foreground/40" />
                  <div className="text-xs font-semibold text-emerald-600">+{m.lift_pct}% lift · not referenced in current marketing</div>
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {finding.evidence.sources.map((s) => (
                <Badge key={s.ref} variant="outline" className="text-[10px] gap-1">
                  <span className="opacity-70">source:</span> {s.label}
                </Badge>
              ))}
            </div>
          </Section>

          <Section icon={Lightbulb} title="Recommended Action">
            <Card className="p-3 bg-primary/5 border-primary/20 text-sm text-foreground">
              {finding.recommendedAction}
            </Card>
          </Section>

          <Section icon={Send} title="Generated Content & Campaigns">
            <ActionPackPanel
              finding={finding}
              venueContext={{
                venueId: selectedBar?.id ?? 'unknown',
                venueName: selectedBar?.bar_name ?? 'this venue',
                city: selectedBar?.city,
              }}
              blocked={sendBlocked}
              blockedReason={sendBlocked ? (finding.gateReason ?? 'Blocked by Ops Readiness Gate.') : undefined}
            />
          </Section>

          <Section icon={History} title="Campaigns Attempted">
            <FindingCampaignsAttempted findingId={finding.id} />
          </Section>

          <Section icon={Workflow} title="Status & Workflow">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus('In Progress')} disabled={finding.status === 'In Progress'}>
                Mark In Progress
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus('Resolved')} disabled={finding.status === 'Resolved'}>
                Mark Resolved
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDismissOpen(true)} disabled={finding.status === 'Dismissed'}>
                Dismiss…
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">Snooze…</Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 space-y-1">
                  {[7, 14, 30].map(d => (
                    <Button key={d} size="sm" variant="ghost" className="w-full justify-start" onClick={() => snoozeFor(d)}>
                      {d} days
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="ml-auto">
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={sendBlocked}
                      onClick={() => setStatus('Sent to Marketing Hub')}
                    >
                      <Send className="w-3.5 h-3.5" /> Send to Marketing Hub
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {sendBlocked
                    ? 'Blocked by Ops Readiness Gate. Resolve the ops issue or push anyway above.'
                    : 'Marketing Hub send pipeline ships in a later phase — status will update for now.'}
                </TooltipContent>
              </Tooltip>
            </div>
            {finding.dismissReason && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                Dismissed: <span className="text-foreground">{finding.dismissReason}</span>
              </div>
            )}
            {finding.snoozedUntil && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                Snoozed until <span className="text-foreground">{finding.snoozedUntil}</span>
              </div>
            )}
          </Section>
        </div>
      </SheetContent>

      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dismiss this finding</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">Add a short reason — useful for audit history.</div>
          <Textarea
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="e.g. Already addressed last quarter; data lag from Toast sync; intentional venue choice."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissOpen(false)}>Cancel</Button>
            <Button onClick={handleDismiss} disabled={!dismissReason.trim()}>Dismiss finding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

const LiftBar = ({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) => {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-foreground/80 mb-1">
        <span>{label}</span>
        <span className="font-mono">${Math.round(value).toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Stat = ({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) => (
  <div className="p-2.5 rounded-md border border-border bg-card/50">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <Badge variant="outline" className={`text-[11px] mt-1 ${tone}`}>{children}</Badge>
  </div>
);

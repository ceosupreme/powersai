import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { inCrm, sourceLabel, stageLabel, stageOf, type LeadStage } from '@/lib/leads';
import type { Prospect } from '@/hooks/useProspects';

export const STAGE_TONE: Record<LeadStage, string> = {
  new: 'bg-muted text-foreground border-border',
  contacted: 'bg-amber/15 text-amber border-amber/40',
  replied: 'bg-blue/15 text-blue border-blue/40',
  meeting: 'bg-subject-setup/15 text-subject-setup border-subject-setup/40',
  won: 'bg-signal-green/15 text-signal-green border-signal-green/40',
  dead: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const StageBadge = ({ status, className }: { status: string; className?: string }) => {
  const s = stageOf(status);
  return <Badge variant="outline" className={cn('text-xs', STAGE_TONE[s], className)}>{stageLabel(s)}</Badge>;
};

export const SourceBadge = ({ p }: { p: Pick<Prospect, 'source' | 'platform'> }) => (
  <Badge variant="secondary" className="text-xs font-normal">{sourceLabel(p.source, p.platform)}</Badge>
);

export const CrmBadge = ({ p }: { p: Pick<Prospect, 'status' | 'promoted_company_id'> }) =>
  inCrm(p) ? <Badge variant="outline" className="text-xs border-primary/40 text-primary">In CRM</Badge> : null;

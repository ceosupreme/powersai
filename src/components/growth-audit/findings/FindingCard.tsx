import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_LABEL, type Finding } from './mockFindings';
import { findingTypeLabel } from './findingTypes';
import { upsideLabel, easeLabel, upsideTone, easeTone } from './findingScales';
import { severityTone, type ReadinessGate } from '../scoreBands';
import { GateBadge, computeGateState } from '../GateBadge';

const statusTone = (s: Finding['status']) => {
  switch (s) {
    case 'New': return 'bg-sky-500/15 text-sky-600 border-sky-500/30';
    case 'In Progress': return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    case 'Sent to Marketing Hub': return 'bg-primary/15 text-primary border-primary/30';
    case 'Resolved': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'Dismissed': return 'bg-muted text-muted-foreground border-border';
    case 'Snoozed': return 'bg-muted text-muted-foreground border-border';
  }
};

const sevDot = (s: Finding['severity']) =>
  s === 'Critical' ? 'bg-destructive' : s === 'High' ? 'bg-orange-500' : s === 'Medium' ? 'bg-amber-500' : 'bg-muted-foreground';

export const FindingCard = ({
  finding, gate, onOpen,
}: { finding: Finding; gate: ReadinessGate; onOpen: () => void }) => {
  const gateState = computeGateState(finding.isTrafficDriving, gate);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className="p-3 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${sevDot(finding.severity)}`} title={finding.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium text-foreground leading-snug">{finding.title}</div>
            {finding.signalKey?.startsWith('seed:') && (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground bg-muted/30">Demo</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[finding.category]}</Badge>
            <Badge variant="outline" className="text-[10px] bg-muted/40 text-muted-foreground">
              {findingTypeLabel(finding.type)}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${severityTone(finding.severity === 'Critical' ? 'High' : finding.severity)}`}>
              {finding.severity}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${statusTone(finding.status)}`}>{finding.status}</Badge>
            <GateBadge state={gateState} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground/70">Priority</span>
              <span className="font-semibold text-foreground">{finding.priorityScore}</span>
            </span>
            <Badge variant="outline" className={`text-[10px] ${upsideTone(finding.revenueUpside)}`}>
              Upside: {upsideLabel(finding.revenueUpside)}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${easeTone(finding.ease)}`}>
              Ease: {easeLabel(finding.ease)}
            </Badge>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 shrink-0" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          View <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};

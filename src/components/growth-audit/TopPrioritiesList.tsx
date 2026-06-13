import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Flame, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { severityTone, type ReadinessGate } from './scoreBands';
import { useToast } from '@/hooks/use-toast';
import type { Priority } from './deriveScores';

type GateState = 'safe' | 'caution' | 'block' | null;

const computeGateState = (p: Priority, gate: ReadinessGate): GateState => {
  if (!p.isTrafficDriving) return null;
  if (gate === 'Green Light') return 'safe';
  if (gate === 'Caution') return 'caution';
  return 'block';
};

const rowBorderClass = (state: GateState, overridden: boolean) => {
  if (state === 'block') return overridden ? 'border-l-4 border-l-destructive/60' : 'border-l-4 border-l-destructive';
  if (state === 'caution') return 'border-l-4 border-l-amber-500';
  return 'border-l-4 border-l-transparent';
};

const GatePill = ({ state, overridden }: { state: GateState; overridden: boolean }) => {
  if (state === null) return null;
  if (overridden) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground border-border">
        <AlertTriangle className="w-3 h-3" /> Override active
      </Badge>
    );
  }
  if (state === 'safe') {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
        <ShieldCheck className="w-3 h-3" /> Traffic-safe
      </Badge>
    );
  }
  if (state === 'caution') {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30">
        <ShieldAlert className="w-3 h-3" /> Ops Caution
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/15 text-destructive border-destructive/30">
      <ShieldAlert className="w-3 h-3" /> Needs Ops Fix First
    </Badge>
  );
};

export const TopPrioritiesList = ({ items, gate }: { items: Priority[]; gate: ReadinessGate }) => {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const pushAnyway = (p: Priority) => {
    setOverrides(prev => ({ ...prev, [p.id]: true }));
    // Hook for real logging later — see plan: persistent override log is deferred.
    console.log('[GROWTH-AUDIT] gate override:', p.id, p.title);
    toast({
      title: 'Gate override recorded',
      description: `"${p.title}" will proceed despite the Ops Readiness warning. The warning stays visible.`,
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Top {items.length} Priorities</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">Across all categories</Badge>
      </div>
      <ul className="space-y-3">
        {items.map((p) => {
          const state = computeGateState(p, gate);
          const overridden = !!overrides[p.id];
          const showWarning = state === 'block' || (state === 'caution' && !!p.gateReason);

          return (
            <li
              key={p.id}
              className={`pl-3 py-2 rounded-r-md ${rowBorderClass(state, overridden)} ${state === 'block' && !overridden ? 'bg-destructive/5' : state === 'caution' ? 'bg-amber-500/5' : ''}`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <Badge variant="outline" className={`text-[10px] shrink-0 ${severityTone(p.severity)}`}>
                  {p.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground leading-snug">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{p.category}</div>
                </div>
                <GatePill state={state} overridden={overridden} />
                <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">
                  {p.upside}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button size="sm" variant="outline" disabled className="gap-1 opacity-70 cursor-not-allowed">
                        View Action <ArrowRight className="w-3 h-3" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Action Center ships in a later phase.</TooltipContent>
                </Tooltip>
              </div>

              {showWarning && p.gateReason && (
                <div className={`mt-2 ml-0 md:ml-12 p-2.5 rounded-md text-xs leading-snug flex items-start gap-2 ${
                  state === 'block'
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                }`}>
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {state === 'block' ? 'Gated by Ops Readiness' : 'Push with caution'}
                    </div>
                    <div className="opacity-90 mt-0.5">{p.gateReason}</div>
                    {state === 'block' && !overridden && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => pushAnyway(p)}
                      >
                        Push anyway
                      </Button>
                    )}
                    {overridden && (
                      <div className="mt-1 text-[11px] opacity-80">
                        Override logged. Warning remains visible until Ops Readiness improves.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

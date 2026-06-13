import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ReadinessGate } from './scoreBands';

export type GateState = 'safe' | 'caution' | 'block' | null;

export const computeGateState = (isTrafficDriving: boolean, gate: ReadinessGate): GateState => {
  if (!isTrafficDriving) return null;
  if (gate === 'Green Light') return 'safe';
  if (gate === 'Caution') return 'caution';
  return 'block';
};

export const GateBadge = ({ state, overridden }: { state: GateState; overridden?: boolean }) => {
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

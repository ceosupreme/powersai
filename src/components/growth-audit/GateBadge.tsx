import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import type { ReadinessGate } from './scoreBands';

export type GateState = 'caution' | 'block' | null;

export const computeGateState = (isTrafficDriving: boolean, gate: ReadinessGate): GateState => {
  if (!isTrafficDriving) return null;
  // Green Light (passed or inert sentinel) renders no badge. Only escalated
  // states announce themselves. Mechanism preserved upstream for future use.
  if (gate === 'Green Light') return null;
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

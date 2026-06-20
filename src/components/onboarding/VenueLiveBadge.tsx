import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  isLive: boolean;
  phase3Pct: number;
  requiredDone: number;
  requiredTotal: number;
  compact?: boolean;
}

export function VenueLiveBadge({ isLive, phase3Pct, requiredDone, requiredTotal, compact }: Props) {
  if (compact) {
    return (
      <Badge variant={isLive ? 'default' : 'secondary'} className="gap-1 text-[10px]">
        {isLive ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3" />}
        {isLive ? 'Live' : `${requiredDone}/${requiredTotal} go-live`}
      </Badge>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={isLive ? 'default' : 'secondary'} className="gap-1">
          {isLive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5" />}
          {isLive ? 'LIVE — capturing leads' : `Go-live ${requiredDone}/${requiredTotal}`}
        </Badge>
        <span className="text-xs text-muted-foreground">{phase3Pct}% fully configured</span>
      </div>
      <Progress value={phase3Pct} className="h-1.5" />
    </div>
  );
}
import { Alert } from '@/types/venue';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: Alert;
}

const severityClasses: Record<string, string> = {
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
};

export const AlertItem = ({ alert }: AlertItemProps) => {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <span className={cn('severity-dot mt-1.5 flex-shrink-0', severityClasses[alert.severity])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            alert.severity === 'High' ? 'text-destructive' : 
            alert.severity === 'Medium' ? 'text-gold' : 'text-signal-green'
          )}>
            {alert.severity}
          </span>
          <span className="text-xs text-muted-foreground">• {alert.pillar}</span>
        </div>
        <p className="text-foreground text-sm">{alert.message}</p>
      </div>
    </div>
  );
};

import { Alert } from '@/types/venue';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AlertsBlockProps {
  alerts: Alert[];
  pillar?: string;
}

export const AlertsBlock = ({ alerts, pillar }: AlertsBlockProps): JSX.Element | null => {
  const filteredAlerts = pillar 
    ? alerts.filter(a => a.pillar === pillar)
    : alerts;
  
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  }).slice(0, 6);

  if (sortedAlerts.length === 0) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'Medium':
        return 'border-gold/50 bg-gold/10 text-gold hover:bg-gold/20';
      default:
        return 'border-[#2DD4BF]/50 bg-[#2DD4BF]/10 text-[#2DD4BF] hover:bg-[#2DD4BF]/20';
    }
  };

  const getIcon = (severity: string) => {
    if (severity === 'Low') {
      return <Info className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    return <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up">
      {sortedAlerts.map((alert, index) => (
        <Popover key={alert.id}>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer',
                'transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation',
                'shadow-sm hover:shadow-md',
                getSeverityStyles(alert.severity),
                alert.severity === 'High' && 'animate-pulse-critical'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {getIcon(alert.severity)}
              <span className="truncate max-w-[180px] md:max-w-[200px]">
                {alert.metric_name}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="bottom" 
            className="max-w-xs p-4 bg-card/95 backdrop-blur-md border-border/50 rounded-xl shadow-xl"
          >
            <div className="space-y-2">
              <div className={cn(
                'inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide',
                alert.severity === 'High' && 'bg-destructive/20 text-destructive',
                alert.severity === 'Medium' && 'bg-gold/20 text-gold',
                alert.severity === 'Low' && 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
              )}>
                {alert.severity} Priority
              </div>
              <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
};

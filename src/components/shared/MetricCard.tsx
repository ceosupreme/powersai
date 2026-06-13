import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard = ({ label, value, subValue, trend }: MetricCardProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className="card-metric p-3 md:p-4 text-center min-w-0 group hover-lift hover:border-primary/20">
      <div className="font-mono text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors duration-200">
        {value}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground mb-1 truncate">{label}</div>
      {subValue && (
        <div className={cn(
          'text-[10px] md:text-xs font-medium truncate flex items-center justify-center gap-1',
          trend === 'up' && 'text-signal-green',
          trend === 'down' && 'text-destructive',
          (!trend || trend === 'neutral') && 'text-muted-foreground'
        )}>
          {trend && trend !== 'neutral' && (
            <TrendIcon className="w-3 h-3" />
          )}
          {subValue}
        </div>
      )}
    </div>
  );
};

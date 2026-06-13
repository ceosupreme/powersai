import { cn } from '@/lib/utils';
import { ArrowDown } from 'lucide-react';

interface ScorecardMetricCardProps {
  label: string;
  value: number | null | undefined;
  lowerIsBetter?: boolean;
  format?: 'percent' | 'number' | 'currency' | 'count';
  maxScore?: number; // For calculating dot color (default 100)
}

// Get score dot color: Green (≥80), Yellow (60-79), Red (<60)
const getScoreDotColor = (value: number, maxScore: number = 100): string => {
  const pct = (value / maxScore) * 100;
  if (pct >= 80) return 'bg-signal-green';
  if (pct >= 60) return 'bg-gold';
  return 'bg-destructive';
};

// Format value based on type
const formatValue = (value: number, format: ScorecardMetricCardProps['format']): string => {
  switch (format) {
    case 'percent': {
      // Auto-detect decimals (0-1) and multiply by 100 for display
      const pctVal = (value >= 0 && value <= 1) ? value * 100 : value;
      return `${pctVal.toFixed(1)}%`;
    }
    case 'currency':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
      }).format(value);
    case 'count':
      return value.toFixed(0);
    case 'number':
    default:
      return value.toFixed(1);
  }
};

export const ScorecardMetricCard = ({ 
  label, 
  value, 
  lowerIsBetter = false,
  format = 'number',
  maxScore = 100,
}: ScorecardMetricCardProps) => {
  const hasValue = value !== null && value !== undefined && value !== 0;
  
  return (
    <div className="card-metric p-3 md:p-4 text-center min-w-0 group hover-lift hover:border-primary/20 relative">
      {/* Score dot indicator */}
      {hasValue && (
        <div className={cn(
          'absolute top-2 right-2 w-2 h-2 rounded-full',
          getScoreDotColor(value, maxScore)
        )} />
      )}
      
      {/* Value */}
      <div className="font-mono text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors duration-200 flex items-center justify-center gap-1">
        {hasValue ? formatValue(value, format) : '—'}
        {/* Lower is better indicator */}
        {lowerIsBetter && hasValue && (
          <ArrowDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      
      {/* Label */}
      <div className="text-xs md:text-sm text-muted-foreground truncate flex items-center justify-center gap-1">
        {label}
        {lowerIsBetter && (
          <span className="text-[10px] text-muted-foreground/60">(lower is better)</span>
        )}
      </div>
    </div>
  );
};

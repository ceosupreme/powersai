import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Check } from 'lucide-react';

export type MetricFormat = 'currency' | 'percent' | 'number' | 'rating' | 'count';

interface PillarMetricRowProps {
  label: string;
  actual: unknown;
  target?: unknown;
  score: unknown;
  format: MetricFormat;
  lowerIsBetter?: boolean;
  unit?: string;
  multiplyBy100?: boolean;
  showTrendArrow?: boolean;
  resolvedTarget?: number;
  targetLabel?: string; // 'vs LY' or 'vs target'
  /** Render "N/A" instead of a dash when the metric does not apply to this venue. */
  notApplicable?: boolean;
}

// Safe conversion from Airtable lookup fields (can be arrays, strings, numbers, or null)
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length > 0 ? toNumber(value[0]) : null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
};

// Get status dot color based on score
const getStatusColor = (score: number | null): string => {
  if (score === null) return 'bg-muted';
  if (score >= 80) return 'bg-signal-green';
  if (score >= 60) return 'bg-gold';
  return 'bg-destructive';
};

// Get score badge styling
const getScoreBadgeStyle = (score: number | null): string => {
  if (score === null) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-signal-green text-primary-foreground';
  if (score >= 60) return 'bg-gold text-foreground';
  return 'bg-destructive text-destructive-foreground';
};

// Format actual value based on type
const formatActual = (
  value: number | null,
  format: MetricFormat,
  multiplyBy100: boolean,
  unit?: string
): string => {
  if (value === null) return '—';

  const displayValue = multiplyBy100 ? value * 100 : value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: displayValue >= 1000 ? 0 : 2,
        maximumFractionDigits: displayValue >= 1000 ? 0 : 2,
      }).format(displayValue);

    case 'percent':
      return `${displayValue.toFixed(displayValue !== 0 && Math.abs(displayValue) < 0.1 ? 2 : 1)}%`;

    case 'number':
      if (unit) {
        const formattedNumber = Math.abs(displayValue) < 10 && !Number.isInteger(displayValue)
          ? displayValue.toFixed(1)
          : new Intl.NumberFormat('en-US').format(Math.round(displayValue));
        return `${formattedNumber} ${unit}`;
      }
      return Math.abs(displayValue) < 10 && !Number.isInteger(displayValue)
        ? displayValue.toFixed(1)
        : new Intl.NumberFormat('en-US').format(Math.round(displayValue));

    case 'count': {
      const count = Math.round(displayValue);
      if (unit) {
        const unitText = count === 1 ? unit.replace(/s$/, '') : unit;
        return `${new Intl.NumberFormat('en-US').format(count)} ${unitText}`;
      }
      return new Intl.NumberFormat('en-US').format(count);
    }

    case 'rating':
      return displayValue.toFixed(2);

    default:
      return String(displayValue);
  }
};

// Format target value
const formatTarget = (
  value: number | null,
  format: MetricFormat,
  multiplyBy100: boolean
): string => {
  if (value === null) return '';

  const displayValue = multiplyBy100 ? value * 100 : value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: displayValue >= 1000 ? 0 : 2,
        maximumFractionDigits: displayValue >= 1000 ? 0 : 2,
      }).format(displayValue);

    case 'percent':
      return `${displayValue.toFixed(displayValue !== 0 && Math.abs(displayValue) < 0.1 ? 2 : 1)}%`;

    case 'number':
    case 'count':
      return Math.abs(displayValue) < 10 && !Number.isInteger(displayValue)
        ? displayValue.toFixed(1)
        : new Intl.NumberFormat('en-US').format(Math.round(displayValue));

    case 'rating':
      return displayValue.toFixed(1);

    default:
      return String(displayValue);
  }
};

export const PillarMetricRow = ({
  label,
  actual,
  target,
  score,
  format,
  lowerIsBetter = false,
  unit,
  multiplyBy100 = false,
  showTrendArrow = false,
  resolvedTarget,
  targetLabel,
  notApplicable = false,
}: PillarMetricRowProps) => {
  const actualNum = toNumber(actual);
  const targetNum = toNumber(target);
  const scoreNum = toNumber(score);

  const formattedActual = formatActual(actualNum, format, multiplyBy100, unit);
  const formattedTarget = formatTarget(targetNum, format, multiplyBy100);

  // Build the display string
  let displayValue = formattedActual;

  // Special case for alerts count with zero
  if (format === 'count' && unit === 'alerts' && actualNum === 0) {
    displayValue = '0 alerts';
  }

  // Add target if present
  if (formattedTarget && actualNum !== null) {
    if (format === 'count' && unit) {
      displayValue = `${actualNum} / ${targetNum} ${unit}`;
    } else if (format === 'rating') {
      displayValue = `${formattedActual} / ${formattedTarget} ★`;
    } else {
      displayValue = `${formattedActual} / ${formattedTarget}`;
    }
  } else if (format === 'rating' && actualNum !== null && targetNum !== null) {
    displayValue = `${formattedActual} / ${formattedTarget} ★`;
  }

  // N/A overrides — value and badge both show N/A, no variance.
  const isNA = notApplicable && actualNum === null && scoreNum === null;
  if (isNA) {
    displayValue = 'N/A';
  }

  // Compute variance badge from resolvedTarget
  let varianceBadge: React.ReactNode = null;
  if (!isNA && actualNum !== null && resolvedTarget != null && resolvedTarget !== 0) {
    // For multiplyBy100 metrics, actual is stored as decimal (e.g. 0.18) and resolvedTarget from weekly_core is also decimal
    const pct = ((actualNum - resolvedTarget) / Math.abs(resolvedTarget)) * 100;
    const isGood = lowerIsBetter ? pct <= 0 : pct >= 0;
    const sign = pct >= 0 ? '+' : '';
    varianceBadge = (
      <span className={cn(
        'text-[10px] font-medium whitespace-nowrap',
        isGood ? 'text-signal-green' : 'text-destructive',
      )}>
        {sign}{pct.toFixed(1)}% <span className="text-muted-foreground">{targetLabel}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col py-3 border-b border-[#334155] last:border-b-0">
      {/* Header row: status dot, metric name, lower-is-better arrow */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isNA ? 'bg-muted' : getStatusColor(scoreNum),
        )} />
        <span className="text-sm font-medium text-[#94a3b8]">{label}</span>
        {lowerIsBetter && !isNA && (
          <ArrowDown className="w-3 h-3 text-[#94a3b8]" />
        )}
      </div>

      {/* Values row: actual/target on left, variance + score badge on right */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-lg font-semibold',
            isNA ? 'text-muted-foreground' : 'text-white',
          )}>{displayValue}</span>
          {/* Check mark for zero alerts */}
          {!isNA && format === 'count' && unit === 'alerts' && actualNum === 0 && (
            <Check className="w-4 h-4 text-[#22c55e]" />
          )}
          {/* Trend arrow for marketing metrics */}
          {!isNA && showTrendArrow && scoreNum !== null && (
            scoreNum === 100 ? (
              <ArrowUp className="w-4 h-4 text-[#22c55e]" />
            ) : scoreNum === 0 ? (
              <ArrowDown className="w-4 h-4 text-[#ef4444]" />
            ) : null
          )}
          {varianceBadge}
        </div>

        {/* Score badge */}
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-semibold min-w-[32px] text-center',
          isNA ? 'bg-muted text-muted-foreground' : getScoreBadgeStyle(scoreNum),
        )}>
          {isNA ? 'N/A' : (scoreNum !== null ? Math.round(scoreNum) : '—')}
        </span>
      </div>
    </div>
  );
};

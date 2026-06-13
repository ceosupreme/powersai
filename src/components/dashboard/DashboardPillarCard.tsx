import { Link } from 'react-router-dom';
import { ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { DailyMetricRow } from '@/hooks/useDailyMetricsForWeek';

// Types for pillar metrics
export type PillarType = 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience' | 'Marketing';

interface MetricRow {
  label: string;
  actual?: number | null;
  target?: number | null;
  score?: number | null;
  format: 'currency' | 'percent' | 'number' | 'rating';
  lowerIsBetter?: boolean;
  showTrend?: boolean;
  multiplyBy100?: boolean;
  dailyBreakdownKey?: string;
  resolvedTarget?: number;
  targetLabel?: string; // 'vs LY' or 'vs target'
}

interface DashboardPillarCardProps {
  pillar: PillarType;
  pillarScore: number | null | undefined;
  metrics: MetricRow[];
  path: string;
  dailyMetrics?: DailyMetricRow[];
}

// Pillar accent colors (using HSL values from design)
const pillarColors: Record<PillarType, string> = {
  Revenue: '#22c55e',    // Green
  Labor: '#3b82f6',      // Blue
  Operations: '#a855f7', // Purple
  'Guest Experience': '#f97316', // Orange
  Marketing: '#ec4899',  // Pink
};

// Grade calculation from shared utility
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

// Get status dot color based on score
const getStatusDotColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-muted-foreground/30';
  if (score >= 80) return 'bg-[#22c55e]';
  if (score >= 60) return 'bg-[#eab308]';
  return 'bg-[#ef4444]';
};

// Safely convert value to number (handles strings from Airtable lookups)
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  // Handle arrays (Airtable lookups sometimes return arrays)
  if (Array.isArray(value)) {
    return value.length > 0 ? toNumber(value[0]) : null;
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
};

// Format value based on type
const formatValue = (
  value: unknown,
  format: MetricRow['format'],
  multiplyBy100?: boolean
): string => {
  const num = toNumber(value);
  if (num === null) return '—';
  
  switch (format) {
    case 'currency':
      if (num >= 1000) {
        return `$${(num / 1000).toFixed(1)}K`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    case 'percent': {
      const pctVal = multiplyBy100 ? num * 100 : num;
      return `${pctVal.toFixed(1)}%`;
    }
    case 'rating':
      return `${num.toFixed(1)}/5`;
    case 'number':
    default:
      return num.toFixed(0);
  }
};

// Format actual vs target display
const formatActualVsTarget = (
  actual: unknown,
  target: unknown,
  format: MetricRow['format'],
  multiplyBy100?: boolean
): string => {
  const actualStr = formatValue(actual, format, multiplyBy100);
  const targetStr = formatValue(target, format, multiplyBy100);
  
  if (actualStr === '—' && targetStr === '—') return '—';
  if (targetStr === '—') return actualStr;
  return `${actualStr} / ${targetStr}`;
};

// Get daily breakdown fields for a metric key
const getDailyBreakdown = (key: string | undefined, dailyMetrics: DailyMetricRow[]): { dayLabel: string; values: string[] }[] | null => {
  if (!key || dailyMetrics.length === 0) return null;

  const fmtD = (v: number | null) => v != null ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—';
  const fmtP = (v: number | null) => v != null ? `${v.toFixed(1)}%` : '—';
  const fmtN = (v: number | null) => v != null ? Math.round(v).toLocaleString() : '—';

  return dailyMetrics.map(d => {
    switch (key) {
      case 'net_sales': return { dayLabel: d.dayLabel, values: [fmtD(d.netSales)] };
      case 'orders': return { dayLabel: d.dayLabel, values: [fmtN(d.ordersCount)] };
      case 'avg_check': return { dayLabel: d.dayLabel, values: [fmtD(d.netSales), fmtN(d.ordersCount)] };
      case 'discount_pct': return { dayLabel: d.dayLabel, values: [fmtD(d.discounts), fmtD(d.netSales)] };
      case 'labor_pct': return { dayLabel: d.dayLabel, values: [fmtP(d.laborPct), fmtD(d.laborCostTotal), fmtD(d.netSales)] };
      case 'splh': return { dayLabel: d.dayLabel, values: [fmtD(d.netSales), fmtN(d.laborHours)] };
      case 'ot_rate': return { dayLabel: d.dayLabel, values: [fmtN(d.overtimeHours), fmtN(d.laborHours)] };
      case 'void_rate': return { dayLabel: d.dayLabel, values: [fmtD(d.voids), fmtD(d.netSales)] };
      case 'unpaid': return { dayLabel: d.dayLabel, values: [fmtD(d.unpaidAmount)] };
      case 'guests': return { dayLabel: d.dayLabel, values: [fmtN(d.guests)] };
      case 'tip_pct': return { dayLabel: d.dayLabel, values: [fmtD(d.tips), fmtD(d.netSales)] };
      case 'refund_pct': return { dayLabel: d.dayLabel, values: [fmtD(d.refunds), fmtD(d.netSales)] };
      default: return { dayLabel: d.dayLabel, values: [] };
    }
  });
};

const getBreakdownHeaders = (key: string | undefined): string[] => {
  switch (key) {
    case 'net_sales': return ['Sales'];
    case 'orders': return ['Orders'];
    case 'avg_check': return ['Sales', 'Orders'];
    case 'discount_pct': return ['Discounts', 'Sales'];
    case 'labor_pct': return ['Labor %', 'Labor $', 'Sales'];
    case 'splh': return ['Sales', 'Hours'];
    case 'ot_rate': return ['OT Hrs', 'Total Hrs'];
    case 'void_rate': return ['Voids', 'Sales'];
    case 'unpaid': return ['Unpaid'];
    case 'guests': return ['Guests'];
    case 'tip_pct': return ['Tips', 'Sales'];
    case 'refund_pct': return ['Refunds', 'Sales'];
    default: return [];
  }
};

const MetricRowComponent = ({ metric, dailyMetrics }: { metric: MetricRow; dailyMetrics?: DailyMetricRow[] }) => {
  const { label, actual, target, score, format, lowerIsBetter, showTrend, multiplyBy100, dailyBreakdownKey, resolvedTarget, targetLabel } = metric;
  const scoreNum = typeof score === 'number' ? score : null;
  const isRed = scoreNum !== null && scoreNum < 60;
  const breakdown = isRed ? getDailyBreakdown(dailyBreakdownKey, dailyMetrics || []) : null;
  const headers = isRed ? getBreakdownHeaders(dailyBreakdownKey) : [];

  // Compute variance if we have both actual and a resolved target
  const actualNum = typeof actual === 'number' ? actual : null;
  let varianceBadge: React.ReactNode = null;
  if (actualNum !== null && resolvedTarget != null && resolvedTarget !== 0) {
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

  const scoreDisplay = (
    <span className="text-sm font-semibold text-foreground min-w-[32px] text-right">
      {scoreNum !== null ? Math.round(scoreNum) : '—'}
    </span>
  );

  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
      {/* Status dot + Label */}
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', getStatusDotColor(score))} />
        <span className="text-sm text-muted-foreground">
          {label}
          {lowerIsBetter && (
            <ArrowDown className="inline w-3 h-3 ml-1 text-muted-foreground/60" />
          )}
        </span>
      </div>
      
      {/* Value + Variance + Score */}
      <div className="flex items-center gap-3">
        {showTrend ? (
          <span className="text-sm font-semibold text-foreground">
            {score === 100 ? (
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
            ) : score === 0 ? (
              <TrendingDown className="w-4 h-4 text-[#ef4444]" />
            ) : (
              '—'
            )}
          </span>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-foreground">
              {formatActualVsTarget(actual, target, format, multiplyBy100)}
            </span>
            {varianceBadge}
          </div>
        )}
        {isRed && breakdown && breakdown.length > 0 ? (
          <HoverCard>
            <HoverCardTrigger asChild>
              <span className="text-sm font-semibold text-destructive min-w-[32px] text-right cursor-help underline decoration-dotted underline-offset-2">
                {Math.round(scoreNum!)}
              </span>
            </HoverCardTrigger>
            <HoverCardContent side="left" className="w-auto max-w-[320px] p-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold mb-2 text-foreground">{label} — Daily Breakdown</p>
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 pr-2 text-muted-foreground">Day</th>
                    {headers.map((h, i) => <th key={i} className="text-right py-1 px-1 text-muted-foreground">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-b-0">
                      <td className="py-1 pr-2 text-muted-foreground">{row.dayLabel}</td>
                      {row.values.map((v, j) => <td key={j} className="text-right py-1 px-1 text-foreground">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </HoverCardContent>
          </HoverCard>
        ) : (
          scoreDisplay
        )}
      </div>
    </div>
  );
};

export const DashboardPillarCard = ({
  pillar,
  pillarScore,
  metrics,
  path,
  dailyMetrics,
}: DashboardPillarCardProps) => {
  const accentColor = pillarColors[pillar];
  const scoreValue = pillarScore ?? 0;
  const grade = getGradeFromScore(scoreValue);
  const gradeColorHex = getGradeColor(grade);
  
  return (
    <Link
      to={path}
      className={cn(
        'block rounded-xl p-5',
        'bg-[#1e293b] border border-[#334155]',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30',
        'transition-all duration-200'
      )}
    >
      {/* Header: Pillar Name + Score + Grade */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{pillar}</h3>
        <div className="flex items-center gap-2">
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: accentColor }}
          >
            {pillarScore !== null && pillarScore !== undefined
              ? Math.round(pillarScore)
              : '—'}
          </span>
          <span
            className="px-3 py-1 rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: gradeColorHex }}
          >
            {grade}
          </span>
        </div>
      </div>
      
      {/* Metrics List */}
      <div className="space-y-0">
        {metrics.map((metric, index) => (
          <MetricRowComponent key={index} metric={metric} dailyMetrics={dailyMetrics} />
        ))}
      </div>
    </Link>
  );
};

import { SupabaseWeekScorecard } from '@/hooks/useSupabaseWeekData';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/utils/formatting';

interface KPIConfig {
  label: string;
  actualKey: string;
  format: 'currency' | 'percent' | 'number' | 'minutes';
  lowerIsBetter?: boolean;
  coreKey?: string;
  targetConfigKey?: string;
}

interface HeadlineKPIsProps {
  scorecard: SupabaseWeekScorecard;
  priorYearCore?: Record<string, unknown> | null;
  periodConfig?: Record<string, unknown> | null;
}

const KPI_CONFIGS: KPIConfig[] = [
  { label: 'Net Sales', actualKey: 'r1_actual', format: 'currency', coreKey: 'net_sales', targetConfigKey: 'weekly_net_sales_target' },
  { label: 'Labor %', actualKey: 'l1_actual', format: 'percent', lowerIsBetter: true, coreKey: 'labor_pct', targetConfigKey: 'labor_pct_target' },
  { label: 'SPLH', actualKey: 'l2_actual', format: 'currency', coreKey: 'splh', targetConfigKey: 'splh_target' },
  { label: 'Tips %', actualKey: 'g2_actual', format: 'percent', coreKey: 'tip_pct', targetConfigKey: 'tip_pct_target' },
  { label: 'Turn Time', actualKey: 'o2_actual', format: 'minutes', lowerIsBetter: true, coreKey: 'turn_time_avg_min', targetConfigKey: 'turn_time_target_min' },
  { label: 'Guests', actualKey: 'g1_actual', format: 'number', coreKey: 'weekly_guests', targetConfigKey: 'weekly_guests_target' },
];

function formatVal(value: number | null, fmt: string): string {
  if (value == null) return '—';
  switch (fmt) {
    case 'currency': return formatCurrency(value);
    case 'percent': return formatPercent(value * 100);
    case 'minutes': return `${value.toFixed(0)} min`;
    case 'number': return value.toLocaleString();
    default: return String(value);
  }
}

function formatDelta(actual: number, target: number, fmt: string, lowerIsBetter?: boolean): { text: string; beating: boolean } {
  const diff = actual - target;
  // For lowerIsBetter, being below target is good
  const beating = lowerIsBetter ? diff <= 0 : diff >= 0;
  const absDiff = Math.abs(diff);

  let deltaText: string;
  switch (fmt) {
    case 'currency':
      deltaText = formatCurrency(absDiff);
      break;
    case 'percent':
      deltaText = formatPercent(absDiff * 100);
      break;
    case 'minutes':
      deltaText = `${absDiff.toFixed(0)} min`;
      break;
    default:
      deltaText = absDiff.toLocaleString();
  }

  const arrow = beating ? '▲' : '▼';
  const targetDisplay = fmt === 'currency' ? formatCurrency(target) 
    : fmt === 'percent' ? formatPercent(target * 100)
    : fmt === 'minutes' ? `${target.toFixed(0)} min`
    : target.toLocaleString();

  return {
    text: `${arrow} ${deltaText} vs ${targetDisplay} target`,
    beating,
  };
}

export function HeadlineKPIs({ scorecard, priorYearCore, periodConfig }: HeadlineKPIsProps) {
  const sc = scorecard as unknown as Record<string, unknown>;

  // Resolve target for a KPI: YOY first, then period_config fallback
  const resolveTarget = (kpi: KPIConfig): { value: number; label: string } | null => {
    if (kpi.coreKey && priorYearCore) {
      const val = priorYearCore[kpi.coreKey];
      if (typeof val === 'number' && val !== 0) return { value: val, label: 'vs LY' };
    }
    if (kpi.targetConfigKey && periodConfig) {
      const val = periodConfig[kpi.targetConfigKey];
      if (typeof val === 'number' && val !== 0) return { value: val, label: 'vs target' };
    }
    return null;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {KPI_CONFIGS.map((kpi) => {
        const actual = typeof sc[kpi.actualKey] === 'number' ? (sc[kpi.actualKey] as number) : null;
        const resolved = resolveTarget(kpi);
        const targetVal = resolved?.value ?? null;
        const targetLabelText = resolved?.label ?? '';

        let beating: boolean | null = null;
        let deltaInfo: { text: string; beating: boolean } | null = null;

        if (actual != null && targetVal != null) {
          deltaInfo = formatDelta(actual, targetVal, kpi.format, kpi.lowerIsBetter);
          beating = deltaInfo.beating;
          // Replace generic "target" label
          deltaInfo.text = deltaInfo.text.replace(/target$/, targetLabelText || 'target');
        }

        return (
          <div
            key={kpi.label}
            className={cn(
              'bg-card rounded-xl p-3 text-center border transition-colors',
              beating === true && 'border-l-2 border-l-signal-green/50',
              beating === false && 'border-l-2 border-l-destructive/50',
              beating === null && 'border-border',
            )}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{kpi.label}</div>
            <div className="text-lg font-mono font-bold text-foreground">
              {formatVal(actual, kpi.format)}
            </div>
            {deltaInfo && (
              <div className={cn(
                'text-[10px] mt-1 font-medium',
                deltaInfo.beating ? 'text-signal-green' : 'text-destructive',
              )}>
                {deltaInfo.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

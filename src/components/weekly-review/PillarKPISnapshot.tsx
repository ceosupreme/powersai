import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type PillarType = 'revenue' | 'labor' | 'operations' | 'guest';

interface KPIItem {
  label: string;
  key: string;
  format: 'currency' | 'percent' | 'number' | 'rating' | 'count' | 'hours' | 'minutes';
  /** If true, raw value is a decimal (0.22) that should be displayed as percent (22%) */
  multiplyBy100?: boolean;
  lowerIsBetter?: boolean;
  /** Key for YOY last-year value in weekly_core */
  yoyLastYearKey?: string;
  /** Key for YOY change pct in weekly_core */
  yoyPctKey?: string;
  /** Suffix to append after the formatted value */
  suffix?: string;
}

const REVENUE_KPIS: KPIItem[] = [
  { label: 'Net Sales', key: 'net_sales', format: 'currency', yoyLastYearKey: 'last_year_net_sales', yoyPctKey: 'yoy_change_pct' },
  { label: 'Avg Check', key: 'aov', format: 'currency', yoyLastYearKey: 'last_year_aov', yoyPctKey: 'yoy_aov_pct' },
  { label: 'Total Orders', key: 'transactions', format: 'number', yoyLastYearKey: 'last_year_transactions', yoyPctKey: 'yoy_transactions_pct' },
  { label: 'Weekly Guests', key: 'weekly_guests', format: 'number', yoyLastYearKey: 'last_year_guests', yoyPctKey: 'yoy_guests_pct' },
  { label: 'Comps', key: 'comps_amount', format: 'currency', lowerIsBetter: true },
  { label: 'Discount %', key: 'discount_pct', format: 'percent', multiplyBy100: true, lowerIsBetter: true },
  { label: 'Void %', key: 'void_rate', format: 'percent', multiplyBy100: true, lowerIsBetter: true },
  { label: 'Refund %', key: 'refund_pct', format: 'percent', multiplyBy100: true, lowerIsBetter: true },
];

const LABOR_KPIS: KPIItem[] = [
  { label: 'Overtime Hours', key: 'overtime_hours', format: 'hours', lowerIsBetter: true },
  { label: 'Labor Cost', key: 'labor_cost_total', format: 'currency', lowerIsBetter: true },
  { label: 'Labor Hours', key: 'labor_hours_total', format: 'hours' },
  { label: 'Lates', key: 'engage_lates', format: 'percent', lowerIsBetter: true },
  { label: 'No Shows', key: 'engage_no_shows', format: 'percent', lowerIsBetter: true },
  { label: 'Dropped Shifts', key: 'engage_dropped_shifts', format: 'percent', lowerIsBetter: true },
  { label: 'Shift Bids', key: 'engage_shift_bids', format: 'count' },
  { label: 'Avg Shift Score', key: 'engage_avg_shift_score', format: 'rating' },
  { label: 'Avg Tenure', key: 'engage_avg_tenure', format: 'number', suffix: 'days' },
];

const GUEST_KPIS: KPIItem[] = [
  { label: 'Google Rating', key: 'google_rating', format: 'rating' },
  { label: 'Yelp Rating', key: 'yelp_rating', format: 'rating' },
  { label: 'Online Reputation', key: 'online_reputation_score', format: 'rating' },
  { label: 'Guest Count', key: 'weekly_guests', format: 'number', yoyLastYearKey: 'last_year_guests', yoyPctKey: 'yoy_guests_pct' },
  { label: 'Tip %', key: 'tip_pct', format: 'percent', multiplyBy100: true },
  { label: 'Refund %', key: 'refund_pct', format: 'percent', multiplyBy100: true, lowerIsBetter: true },
  { label: 'KDS Avg Ticket Time', key: '_kds_ticket_time', format: 'minutes', lowerIsBetter: true },
];

const OPERATIONS_KPIS: KPIItem[] = [
  { label: 'Sidework Completion', key: 'sidework_completion_pct', format: 'percent', multiplyBy100: true },
  { label: 'Asana Task Completion', key: 'task_completion_pct', format: 'percent', multiplyBy100: true },
  { label: 'GM Logs', key: 'employee_logs_count', format: 'count' },
  { label: "86'd Items", key: 'stockout_count', format: 'count', lowerIsBetter: true },
  { label: 'Critical Alerts', key: 'critical_alerts_count', format: 'count', lowerIsBetter: true },
];

const PILLAR_KPIS: Record<PillarType, KPIItem[]> = {
  revenue: REVENUE_KPIS,
  labor: LABOR_KPIS,
  operations: OPERATIONS_KPIS,
  guest: GUEST_KPIS,
};

function getVal(row: Record<string, unknown>, key: string): number | null {
  if (key.startsWith('_')) return null; // placeholder keys like _kds_ticket_time
  const v = row[key];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatValue(val: number | null, item: KPIItem): string {
  if (val == null) return '—';
  const v = item.multiplyBy100 ? val * 100 : val;
  let result: string;
  switch (item.format) {
    case 'currency':
      result = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
        maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
      }).format(v);
      break;
    case 'percent':
      result = `${v.toFixed(1)}%`;
      break;
    case 'rating':
      result = v.toFixed(2);
      break;
    case 'hours':
      result = `${v.toFixed(1)}h`;
      break;
    case 'minutes':
      result = `${v.toFixed(1)}m`;
      break;
    case 'count':
      result = new Intl.NumberFormat('en-US').format(Math.round(v));
      break;
    case 'number':
    default:
      result = Math.abs(v) < 10 && !Number.isInteger(v)
        ? v.toFixed(1)
        : new Intl.NumberFormat('en-US').format(Math.round(v));
      break;
  }
  if (item.suffix) result += ` ${item.suffix}`;
  return result;
}

function computeDelta(current: number | null, previous: number | null, multiplyBy100?: boolean): { pct: number; raw: number } | null {
  if (current == null || previous == null || previous === 0) return null;
  const c = multiplyBy100 ? current * 100 : current;
  const p = multiplyBy100 ? previous * 100 : previous;
  return { pct: ((c - p) / Math.abs(p)) * 100, raw: c - p };
}

function getStatusDot(current: number | null, previous: number | null, item: KPIItem): string {
  if (current == null) return 'bg-muted';
  if (previous == null) return 'bg-muted';
  const delta = computeDelta(current, previous, item.multiplyBy100);
  if (!delta) return 'bg-muted';
  const improved = item.lowerIsBetter ? delta.raw < 0 : delta.raw > 0;
  const flat = Math.abs(delta.pct) < 1;
  if (flat) return 'bg-gold';
  return improved ? 'bg-signal-green' : 'bg-destructive';
}

interface PillarKPISnapshotProps {
  pillar: PillarType;
  currentCore: Record<string, unknown> | null;
  previousCore: Record<string, unknown> | null;
}

export function PillarKPISnapshot({ pillar, currentCore, previousCore }: PillarKPISnapshotProps) {
  const kpis = PILLAR_KPIS[pillar];
  if (!currentCore) return null;

  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">KPI Snapshot</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {kpis.map((item) => {
          const current = getVal(currentCore, item.key);
          const previous = previousCore ? getVal(previousCore, item.key) : null;
          const delta = computeDelta(current, previous, item.multiplyBy100);
          const statusColor = getStatusDot(current, previous, item);
          const formatted = formatValue(current, item);

          // YOY data
          const yoyPct = item.yoyPctKey ? getVal(currentCore, item.yoyPctKey) : null;
          const yoyLastYear = item.yoyLastYearKey ? getVal(currentCore, item.yoyLastYearKey) : null;

          const deltaImproved = delta
            ? (item.lowerIsBetter ? delta.raw < 0 : delta.raw > 0)
            : null;

          const yoyImproved = yoyPct != null ? yoyPct > 0 : null;

          return (
            <div
              key={item.key}
              className="bg-muted/30 border border-border rounded-lg p-2.5 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusColor)} />
                <span className="text-[10px] font-medium text-muted-foreground truncate">{item.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{formatted}</span>
                {delta && (
                  <span className={cn(
                    'flex items-center text-[10px] font-medium',
                    deltaImproved ? 'text-signal-green' : 'text-destructive'
                  )}>
                    {delta.raw > 0 ? (
                      <ArrowUp className="w-2.5 h-2.5" />
                    ) : delta.raw < 0 ? (
                      <ArrowDown className="w-2.5 h-2.5" />
                    ) : (
                      <Minus className="w-2.5 h-2.5" />
                    )}
                    {Math.abs(delta.pct).toFixed(1)}%
                  </span>
                )}
              </div>
              {yoyPct != null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-muted-foreground">YOY</span>
                  <span className={cn(
                    'flex items-center text-[9px] font-medium',
                    yoyImproved ? 'text-signal-green' : 'text-destructive'
                  )}>
                    {yoyPct > 0 ? (
                      <ArrowUp className="w-2 h-2" />
                    ) : yoyPct < 0 ? (
                      <ArrowDown className="w-2 h-2" />
                    ) : (
                      <Minus className="w-2 h-2" />
                    )}
                    {Math.abs(yoyPct * 100).toFixed(1)}%
                  </span>
                  {yoyLastYear != null && (
                    <span className="text-[9px] text-muted-foreground">
                      (LY: {formatValue(yoyLastYear, { ...item, multiplyBy100: false })})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

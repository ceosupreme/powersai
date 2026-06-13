import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useWeeklySnapshotData } from '@/hooks/useWeeklySnapshotData';
import { formatCurrency, formatPercent } from '@/utils/formatting';

interface WeeklySnapshotWidgetProps {
  barId?: string;
  barIds?: string[];
  weekStart?: string;
  className?: string;
  title?: string;
}

export const WeeklySnapshotWidget = ({
  barId,
  barIds,
  weekStart,
  className,
  title = 'Weekly Snapshot',
}: WeeklySnapshotWidgetProps) => {
  const { data, isLoading, error } = useWeeklySnapshotData({
    barId: barId || null,
    barIds,
    weekStart,
  });

  if (error) {
    return (
      <div className={cn('bg-card border border-destructive/30 rounded-lg p-6', className)}>
        <p className="text-sm text-destructive">Failed to load snapshot data.</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-foreground">{title}</span>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-6 w-24" /></div>
            ))}
          </div>
        ) : data && data.rowCount > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tile label="Week Sales" value={formatMetricCurrency(data.netSales)} highlight />
              <Tile label="Avg Ticket" value={formatMetricCurrency(data.avgTicket)} />
              <Tile label="Tip %" value={data.tipsPct != null ? formatPercent(data.tipsPct) : '—'} sub={formatMetricCurrency(data.tips)} />
              <Tile label="Discounts" value={formatMetricCurrency(data.discounts)} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tile label="Total Orders" value={formatMetricNumber(data.ordersCount)} />
              <Tile label="Guests" value={formatMetricNumber(data.guestsCount)} />
              <Tile label="Turn Time" value={data.turnTime != null ? `${data.turnTime.toFixed(1)} min` : '—'} />
              <Tile label="Voids" value={formatMetricCurrency(data.voidAmount)} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Tile
                label="Labor %"
                value={data.laborPct != null ? formatPercent(data.laborPct) : '—'}
                valueClass={data.laborPct != null && data.laborPct > 25 ? 'text-destructive' : 'text-signal-green'}
              />
              <Tile label="SPLH" value={formatMetricCurrency(data.splh)} />
              <Tile label="Labor Hours" value={data.laborHours != null ? `${data.laborHours.toFixed(1)}h` : '—'} />
              <Tile label="Overtime Hours" value={data.overtimeHours != null ? `${data.overtimeHours.toFixed(1)}h` : '—'} />
            </div>

            <div className="space-y-1">
              {data.requestedVenueCount > 0 && data.venueCount < data.requestedVenueCount && (
                <p className="text-xs text-muted-foreground text-center">
                  {data.venueCount} of {data.requestedVenueCount} venues included for this week.
                </p>
              )}
              {data.netSales === 0 && (
                <p className="text-xs text-muted-foreground text-center">Source data present but sales are $0 for this period.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No data available for this week.</p>
        )}
      </div>
    </div>
  );
};

interface TileProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
  valueClass?: string;
}

const Tile = ({ label, value, sub, highlight, valueClass }: TileProps) => (
  <div className={cn('rounded-lg p-2 md:p-3 min-w-0', highlight ? 'bg-primary/10' : 'bg-muted/30')}>
    <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide truncate block">{label}</span>
    <div className={cn('text-base md:text-lg font-mono font-bold mt-0.5 truncate', valueClass || 'text-foreground')}>{value}</div>
    {sub && <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
  </div>
);

function formatMetricCurrency(value: number | null) {
  return value != null ? formatCurrency(value) : '—';
}

function formatMetricNumber(value: number | null) {
  return value != null ? value.toLocaleString() : '—';
}

import { useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, AlertCircle, LogIn, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastData } from '@/hooks/useToastData';
import { cn, formatCurrency, formatPercent, todayPacific } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useIntegrationDisabled } from '@/hooks/useIntegrationDisabled';

interface ToastLiveWidgetProps {
  className?: string;
  barId?: string;
  title?: string;
}

const getLastCompleteWeek = () => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const dayOfWeek = now.getDay();
  const daysSinceLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - daysSinceLastSunday);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
};

export const ToastLiveWidget = ({ className, barId, title }: ToastLiveWidgetProps) => {
  const { selectedWeek } = useApp();
  const { session } = useAuth();
  const toastDisabled = useIntegrationDisabled('toast');

  const dateRange = useMemo(() => {
    if (selectedWeek?.week_start && selectedWeek?.week_end) {
      return { start: selectedWeek.week_start, end: selectedWeek.week_end };
    }
    return getLastCompleteWeek();
  }, [selectedWeek]);

  const { data: rawData, isLoading, error, refetch, isFetching } = useToastData({
    startDate: dateRange.start,
    endDate: dateRange.end,
    venueId: barId,
  }, { enabled: !toastDisabled });

  // Treat disabled/invalid payloads as no data
  const data = rawData && (rawData as any).labor ? rawData : null;

  const hasLaborData = !!data && (data.labor.totalHours > 0 || data.labor.totalCost > 0);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.round(diffMin / 60)}h ago`;
  };

  // --- Tile visibility helpers ---
  const hasBOHLabor = hasLaborData && (data!.labor.bohLabor.cost > 0 || data!.labor.bohLabor.hours > 0);
  const hasFOHLabor = hasLaborData && (data!.labor.fohLabor.cost > 0 || data!.labor.fohLabor.hours > 0);
  const hasGrillPrep = hasLaborData && data!.labor.grillPrepHourly != null;
  const hasFry = hasLaborData && data!.labor.fryHourly != null;
  const hasBevData = data ? data.menu.bevSales > 0 : false;
  const hasTopBev = data ? data.menu.topBeverages.length > 0 : false;

  // Count hidden tiles to show sparse notice
  const hiddenCount = useMemo(() => {
    if (!data) return 0;
    let hidden = 0;
    if (!hasBOHLabor) hidden++;
    if (!hasFOHLabor) hidden++;
    if (!hasGrillPrep) hidden++;
    if (!hasFry) hidden++;
    if (!hasBevData) hidden++;
    if (!hasTopBev) hidden++;
    return hidden;
  }, [data, hasBOHLabor, hasFOHLabor, hasGrillPrep, hasFry, hasBevData, hasTopBev]);

  if (!session) {
    return (
      <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <LogIn className="w-5 h-5" />
          <span className="font-medium">Authentication Required</span>
        </div>
        <p className="text-sm text-muted-foreground">Please log in to view performance data.</p>
      </div>
    );
  }

  if (toastDisabled) {
    return (
      <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Performance data unavailable</span>
        </div>
        <p className="text-sm text-muted-foreground">Toast integration is currently disabled.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-card border border-destructive/30 rounded-lg p-6', className)}>
        <div className="flex items-center gap-3 text-destructive mb-4">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Failed to load Toast data</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-foreground">{title || 'Performance'}</span>
          {data && <span className="text-[10px] sm:text-xs text-muted-foreground">{data.dateRange.start} – {data.dateRange.end}</span>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {data && <span className="text-[10px] sm:text-xs text-muted-foreground">Updated {formatTime(data.lastUpdated)}</span>}
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
            <RefreshCw className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-6 w-24" /></div>
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Row 1: Sales, Tips, Comps */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBlock label="Week Sales" value={formatCurrency(data.sales.weeklySales)} highlight />
              <MetricBlock label="Last Year" value={formatCurrency(data.sales.lastYearSales)} subValue={<YoYBadge change={data.sales.yearOverYearChange} />} />
              <MetricBlock label="Tip %" value={formatPercent(data.tips.weeklyTipPercent)} subValue={formatCurrency(data.tips.tipAmount)} />
              <MetricBlock label="Comps" value={formatCurrency(data.comps.amount)} subValue={`${data.comps.percent.toFixed(2)}%`} />
            </div>

            {/* Row 2: Tickets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricBlock label="Avg Ticket" value={formatCurrency(data.tickets.avgTicket)} />
              <MetricBlock label="Turn Time" value={`${data.tickets.turnTimeMinutes.toFixed(1)} min`} />
              <MetricBlock label="Total Tickets" value={data.tickets.totalTickets.toLocaleString()} />
              {data.tickets.avgKdsTimeMins != null && data.tickets.kdsTicketCount != null && data.tickets.kdsTicketCount > 0 ? (
                <MetricBlock
                  label="Avg KDS Time"
                  value={`${data.tickets.avgKdsTimeMins.toFixed(1)} min`}
                  subValue={
                    data.tickets.kdsTimeBreakdown ? (
                      <div className="text-[10px] space-y-0.5">
                        <span className="text-signal-green">&lt;5m: {data.tickets.kdsTimeBreakdown.under5}%</span>
                        {' · '}
                        <span className="text-gold">5-10m: {data.tickets.kdsTimeBreakdown.under10}%</span>
                        {' · '}
                        <span className="text-destructive">&gt;10m: {data.tickets.kdsTimeBreakdown.over10}%</span>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <MetricBlock
                  label="Ticket Times"
                  value={
                    <div className="text-xs space-y-0.5">
                      <div className="text-signal-green">&lt;10m: {data.tickets.ticketTimeBreakdown.under10}%</div>
                      <div className="text-gold">10-15m: {data.tickets.ticketTimeBreakdown.under15}%</div>
                      <div className="text-destructive">&gt;15m: {data.tickets.ticketTimeBreakdown.over15}%</div>
                    </div>
                  }
                />
              )}
            </div>

            {/* Row 3: Labor - only if data exists */}
            {hasLaborData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricBlock label="Total Labor" value={formatCurrency(data.labor.totalCost)} subValue={`${data.labor.totalHours.toFixed(1)}h`} />
                <MetricBlock label="Labor %" value={formatPercent(data.labor.laborPercent)} valueClass={data.labor.laborPercent > 25 ? 'text-destructive' : 'text-signal-green'} />
                {hasBOHLabor && <MetricBlock label="BOH Labor" value={formatCurrency(data.labor.bohLabor.cost)} subValue={`${data.labor.bohLabor.hours.toFixed(1)}h`} />}
                {hasFOHLabor && <MetricBlock label="FOH Labor" value={formatCurrency(data.labor.fohLabor.cost)} subValue={`${data.labor.fohLabor.hours.toFixed(1)}h`} />}
              </div>
            )}

            {/* Row 4: Labor Rates - only show tiles with real data */}
            {hasLaborData && (data.labor.salesPerLaborHour > 0 || data.labor.avgHourlyRate > 0 || hasGrillPrep || hasFry) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {data.labor.salesPerLaborHour > 0 && <MetricBlock label="Sales/Labor Hr" value={formatCurrency(data.labor.salesPerLaborHour)} />}
                {data.labor.avgHourlyRate > 0 && <MetricBlock label="Avg Hourly" value={`$${data.labor.avgHourlyRate.toFixed(2)}/hr`} />}
                {hasGrillPrep && <MetricBlock label="Grill/Prep" value={`$${data.labor.grillPrepHourly!.toFixed(2)}/hr`} />}
                {hasFry && <MetricBlock label="Fry" value={`$${data.labor.fryHourly!.toFixed(2)}/hr`} />}
              </div>
            )}

            {/* Row 5: Menu Mix + Top Beverages - only show tiles with real data */}
            {(hasBevData || hasTopBev) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hasBevData && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Food/Bev Ratio</span>
                    <div className="text-xl font-mono font-bold text-foreground mt-1">{data.menu.foodBevRatio}</div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Food: {formatCurrency(data.menu.foodSales)}</span>
                      <span>Bev: {formatCurrency(data.menu.bevSales)}</span>
                    </div>
                  </div>
                )}
                {hasTopBev && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Top Beverages</span>
                    <div className="mt-2 space-y-1.5">
                      {data.menu.topBeverages.slice(0, 5).map((bev, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-foreground truncate max-w-[60%]">{bev.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(bev.sales)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sparse grid notice */}
            {hiddenCount > 8 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Some metrics are unavailable — data mapping in progress.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

interface MetricBlockProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  highlight?: boolean;
  valueClass?: string;
}

const MetricBlock = ({ label, value, subValue, highlight, valueClass }: MetricBlockProps) => (
  <div className={cn('rounded-lg p-2 md:p-3 min-w-0', highlight ? 'bg-primary/10' : 'bg-muted/30')}>
    <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide truncate block">{label}</span>
    <div className={cn('text-base md:text-lg font-mono font-bold mt-0.5 truncate', valueClass || 'text-foreground')}>{value}</div>
    {subValue && <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">{subValue}</div>}
  </div>
);

const YoYBadge = ({ change }: { change: number }) => {
  const isPositive = change >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', isPositive ? 'text-signal-green' : 'text-destructive')}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{change.toFixed(1)}% YoY
    </span>
  );
};

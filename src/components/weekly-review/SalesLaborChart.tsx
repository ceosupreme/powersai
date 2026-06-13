import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { useDailyMetricsForWeek } from '@/hooks/useDailyMetricsForWeek';
import { formatCurrency, formatDateRange } from '@/lib/utils';

interface SalesLaborChartProps {
  supabaseBarId: string | null | undefined;
  weekStart?: string;
  weekEnd?: string;
  laborTarget?: number | null;
}

export function SalesLaborChart({ supabaseBarId, weekStart, weekEnd, laborTarget }: SalesLaborChartProps) {
  const { data, isLoading } = useDailyMetricsForWeek(supabaseBarId, weekStart, weekEnd);
  const targetPct = laborTarget != null ? laborTarget * 100 : null;

  const summary = useMemo(() => {
    if (!data.length || targetPct == null) return null;
    const exceeding = data.filter(d => d.laborPct != null && d.laborPct > targetPct);
    if (exceeding.length === 0) return 'Labor at or below target all week ✓';
    const days = exceeding.map(d => d.dayLabel).join(', ');
    return `Labor exceeded target on ${days} — ${exceeding.length} of ${data.length} days`;
  }, [data, targetPct]);

  const title = weekStart && weekEnd
    ? `Daily Sales & Labor % — ${formatDateRange(weekStart, weekEnd)}`
    : 'Daily Sales & Labor %';

  if (isLoading) return null;
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">Daily breakdown available when daily data syncs from Toast/7shifts.</p>
      </div>
    );
  }

  const hasLabor = data.some(d => d.laborPct != null);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="dayLabel" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis
              yAxisId="sales"
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            {hasLabor && (
              <YAxis
                yAxisId="labor"
                orientation="right"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 'auto']}
              />
            )}
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(value: number, name: string) => {
                if (name === 'netSales') return [formatCurrency(value), 'Net Sales'];
                if (name === 'laborPct') return [`${value.toFixed(1)}%`, 'Labor %'];
                return [value, name];
              }}
              labelFormatter={(label) => label}
            />
            <Bar yAxisId="sales" dataKey="netSales" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => {
                const exceeds = targetPct != null && entry.laborPct != null && entry.laborPct > targetPct;
                return <Cell key={i} className={exceeds ? 'fill-destructive/60' : 'fill-primary/70'} />;
              })}
            </Bar>
            {hasLabor && (
              <Line
                yAxisId="labor"
                type="monotone"
                dataKey="laborPct"
                className="stroke-gold"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
            {targetPct != null && hasLabor && (
              <ReferenceLine
                yAxisId="labor"
                y={targetPct}
                strokeDasharray="6 3"
                className="stroke-destructive/50"
                label={{ value: `Target ${targetPct.toFixed(0)}%`, position: 'right', fontSize: 9, className: 'fill-muted-foreground' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {summary && <p className="text-xs text-muted-foreground mt-2">{summary}</p>}
    </div>
  );
}

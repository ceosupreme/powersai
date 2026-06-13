import { WeeklyCore } from '@/types/venue';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { ExpandableChartCard } from '@/components/charts/ExpandableChartCard';

interface MetricsChartsProps {
  coreHistory: WeeklyCore[];
  revenueTarget?: number | null;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, notation: 'compact' }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const MiniAxis = () => (
  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
);

export const MetricsCharts = ({ coreHistory, revenueTarget }: MetricsChartsProps) => {
  const data = [...coreHistory].reverse().map((core, i) => ({
    week: `W${i + 1}`,
    netSales: core.net_sales || 0,
    laborPct: (core.labor_pct || 0) * 100,
    transactions: core.transactions || 0,
    checkAvg: core.aov || 0,
    compPct: (core.discount_pct || 0) * 100,
    voidPct: (core.void_rate || 0) * 100,
  }));

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 mb-6">
      <ExpandableChartCard
        title="Net Sales"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={data}><MiniAxis /><Bar dataKey="netSales" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Net Sales']} contentStyle={tooltipStyle} />
              {revenueTarget != null && revenueTarget > 0 && (
                <ReferenceLine y={revenueTarget} stroke="hsl(var(--destructive) / 0.4)" strokeDasharray="5 5" label={{ value: `Target ${formatCurrency(revenueTarget)}`, fill: 'hsl(var(--destructive))', fontSize: 10, position: 'right' }} />
              )}
              <Bar dataKey="netSales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Labor %"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="laborPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis domain={[15, 35]} tickFormatter={formatPercent} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatPercent(v), 'Labor %']} contentStyle={tooltipStyle} />
              <ReferenceLine y={22} stroke="hsl(var(--destructive) / 0.4)" strokeDasharray="5 5" label={{ value: 'Target', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
              <Line type="monotone" dataKey="laborPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={{ fill: 'hsl(var(--signal-green))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Transactions"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="transactions" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Transactions']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="transactions" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ fill: 'hsl(var(--gold))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Avg Check"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="checkAvg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Avg Check']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="checkAvg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
    </div>
  );
};

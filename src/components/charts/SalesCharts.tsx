import { WeeklyCore } from '@/types/venue';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { ExpandableChartCard } from './ExpandableChartCard';

interface SalesChartsProps {
  coreHistory: WeeklyCore[];
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, notation: 'compact' }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const MiniAxis = ({ dataKey = 'week' }: { dataKey?: string }) => (
  <XAxis dataKey={dataKey} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
);

export const SalesCharts = ({ coreHistory }: SalesChartsProps) => {
  const data = [...coreHistory].reverse().map((core, i) => ({
    week: `W${i + 1}`,
    netSales: core.net_sales || 0,
    transactions: core.transactions || 0,
    checkAvg: core.aov || 0,
    compPct: (core.discount_pct || 0) * 100,
  }));

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
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
              <Bar dataKey="netSales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
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
      <ExpandableChartCard
        title="Comp %"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="compPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatPercent} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatPercent(v), 'Comp %']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="compPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={{ fill: 'hsl(var(--signal-green))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
    </div>
  );
};

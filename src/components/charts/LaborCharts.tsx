import { WeeklyCore } from '@/types/venue';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { ExpandableChartCard } from './ExpandableChartCard';

interface LaborChartsProps {
  coreHistory: WeeklyCore[];
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

export const LaborCharts = ({ coreHistory }: LaborChartsProps) => {
  const data = [...coreHistory].reverse().map((core, i) => ({
    week: `W${i + 1}`,
    laborPct: (core.labor_pct || 0) * 100,
    laborCostTotal: core.labor_cost_total || 0,
    scheduledCost: 0,
    variance: 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
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
              <ReferenceLine y={22} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: '22% Target', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
              <Line type="monotone" dataKey="laborPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={{ fill: 'hsl(var(--signal-green))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Total Labor Cost"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={data}><MiniAxis /><Bar dataKey="laborCostTotal" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total Labor Cost']} contentStyle={tooltipStyle} />
              <Bar dataKey="laborCostTotal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Scheduled Cost"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={data}><MiniAxis /><Bar dataKey="scheduledCost" fill="hsl(var(--gold))" radius={[2, 2, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Scheduled Cost']} contentStyle={tooltipStyle} />
              <Bar dataKey="scheduledCost" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Labor Variance"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="variance" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Variance']} contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="variance" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
    </div>
  );
};

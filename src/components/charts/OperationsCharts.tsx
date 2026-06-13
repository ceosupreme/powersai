import { WeeklyCore } from '@/types/venue';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { ExpandableChartCard } from './ExpandableChartCard';

interface OperationsChartsProps {
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
const formatMinutes = (value: number) => `${value.toFixed(0)}m`;

const MiniAxis = () => (
  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
);

export const OperationsCharts = ({ coreHistory }: OperationsChartsProps) => {
  const data = [...coreHistory].reverse().map((core, i) => ({
    week: `W${i + 1}`,
    voidPct: (core.void_rate || 0) * 100,
    voidAmount: core.void_amount || 0,
    compPct: (core.discount_pct || 0) * 100,
    ticketTimeAvg: core.turn_time_avg_min || 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <ExpandableChartCard
        title="Void %"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="voidPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatPercent} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatPercent(v), 'Void %']} contentStyle={tooltipStyle} />
              <ReferenceLine y={1} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: '1% Threshold', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
              <Line type="monotone" dataKey="voidPct" stroke="hsl(var(--signal-green))" strokeWidth={2} dot={{ fill: 'hsl(var(--signal-green))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Void Amount"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={data}><MiniAxis /><Bar dataKey="voidAmount" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Void Amount']} contentStyle={tooltipStyle} />
              <Bar dataKey="voidAmount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Comp %"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="compPct" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatPercent} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatPercent(v), 'Comp %']} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="compPct" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ fill: 'hsl(var(--gold))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <ExpandableChartCard
        title="Avg Ticket Time"
        miniChart={
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data}><MiniAxis /><Line type="monotone" dataKey="ticketTimeAvg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart>
          </ResponsiveContainer>
        }
        fullChart={
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickFormatter={formatMinutes} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} min`, 'Avg Ticket Time']} contentStyle={tooltipStyle} />
              <ReferenceLine y={15} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: '15m Target', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
              <Line type="monotone" dataKey="ticketTimeAvg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        }
      />
    </div>
  );
};

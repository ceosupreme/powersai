import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { METRIC_LABELS } from '@/components/employees/constants';
import type { EmpPerfTrendPoint } from '@/hooks/useEmployeePerformanceWeek';

// Same palette as ComplianceTrendChart on /employees/:id
const METRIC_COLORS: Record<string, string> = {
  late_meal: 'hsl(45 95% 55%)',
  missed_meal: 'hsl(0 75% 58%)',
  overtime: 'hsl(25 90% 55%)',
  multi_location: 'hsl(265 70% 65%)',
  no_clockout: 'hsl(210 80% 60%)',
  unknown: 'hsl(220 10% 55%)',
};

interface Props {
  trend4: EmpPerfTrendPoint[];
}

export const EmployeeViolationsTrendChart = ({ trend4 }: Props) => {
  const total = trend4.reduce((s, p) => s + p.total, 0);

  if (total === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-6 text-center text-sm text-muted-foreground">
        No violations in the last 4 weeks.
      </div>
    );
  }

  const metricSet = new Set<string>();
  for (const p of trend4) for (const k of Object.keys(p.breakdown)) metricSet.add(k);
  const metrics = Array.from(metricSet);

  const data = trend4.map(p => ({ week: p.weekLabel, ...p.breakdown }));

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-2">
        Violations · last 4 weeks
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(v: any, name: string) => [v, METRIC_LABELS[name] || name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
            formatter={(v) => METRIC_LABELS[v] || v}
          />
          {metrics.map(m => (
            <Bar key={m} dataKey={m} stackId="v" fill={METRIC_COLORS[m] || METRIC_COLORS.unknown} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

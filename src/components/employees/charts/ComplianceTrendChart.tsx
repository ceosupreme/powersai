import { useMemo } from 'react';
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
import type { ComplianceInsight } from '@/hooks/useEmployeeCompliance';
import { METRIC_LABELS } from '@/components/employees/constants';

interface Props {
  compliance: ComplianceInsight[]; // expected to span ~180d
}

// Distinct semantic colors (HSL via raw hsl() — recharts SVG fills, not Tailwind classes).
const METRIC_COLORS: Record<string, string> = {
  late_meal: 'hsl(45 95% 55%)',         // yellow
  missed_meal: 'hsl(0 75% 58%)',         // red
  overtime: 'hsl(25 90% 55%)',           // orange
  multi_location: 'hsl(265 70% 65%)',    // violet
  no_clockout: 'hsl(210 80% 60%)',       // blue
  unknown: 'hsl(220 10% 55%)',
};

const monthBucket = (iso: string): string => iso.slice(0, 7); // YYYY-MM

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleString('en-US', { month: 'short' });
};

const last6Months = (): string[] => {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(`${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
};

export const ComplianceTrendChart = ({ compliance }: Props) => {
  const { data, metrics } = useMemo(() => {
    const buckets = last6Months();
    const metricSet = new Set<string>();
    const grid: Record<string, Record<string, number>> = {};
    for (const b of buckets) grid[b] = {};

    for (const c of compliance) {
      if (!c.source_date) continue;
      const ym = monthBucket(c.source_date);
      if (!(ym in grid)) continue; // outside 6-month window
      const m = c.source_metric || 'unknown';
      metricSet.add(m);
      grid[ym][m] = (grid[ym][m] || 0) + 1;
    }
    const metrics = Array.from(metricSet);
    const data = buckets.map(b => ({ month: monthLabel(b), ymKey: b, ...grid[b] }));
    return { data, metrics };
  }, [compliance]);

  const totalInWindow = data.reduce((s, d) => {
    let t = 0;
    for (const m of metrics) t += (d as any)[m] || 0;
    return s + t;
  }, 0);

  if (totalInWindow === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
        No violations in the last 6 months.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs uppercase text-muted-foreground tracking-wider mb-3">
        Violations · last 6 months
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
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

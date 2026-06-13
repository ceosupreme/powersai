import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

interface Props {
  weekKeys: string[]; // YYYY-MM-DD Monday keys, oldest -> newest
  weekHours: number[];
  meanHours: number | null;
}

const fmtMD = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${m}/${d}`;
};

export const HoursTrendChart = ({ weekKeys, weekHours, meanHours }: Props) => {
  const data = useMemo(
    () => weekHours.map((h, i) => ({
      week: fmtMD(weekKeys[i] || ''),
      hours: Math.round(h * 10) / 10,
    })),
    [weekKeys, weekHours],
  );

  if (weekHours.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
        Not enough weeks of data yet.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">
          Weekly hours · last {weekHours.length} weeks
        </div>
        {meanHours !== null && (
          <div className="text-[11px] text-muted-foreground">
            Avg <span className="text-foreground font-medium">{meanHours.toFixed(1)}</span> hrs/wk
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(v: any) => [`${v} hrs`, 'Hours']}
          />
          {meanHours !== null && (
            <ReferenceLine
              y={meanHours}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
          )}
          <Line
            type="monotone"
            dataKey="hours"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

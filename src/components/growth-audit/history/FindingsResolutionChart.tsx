import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FindingsFlowPoint } from './historyTypes';

export const FindingsResolutionChart = ({ data }: { data: FindingsFlowPoint[] }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-foreground">Findings Opened vs Resolved</h3>
      <span className="text-xs text-muted-foreground">Trailing 6 months</span>
    </div>
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="opened" name="Opened" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="resolved" name="Resolved" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

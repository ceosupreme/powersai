import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CampaignActivityPoint } from './historyTypes';

export const CampaignActivityChart = ({ data }: { data: CampaignActivityPoint[] }) => {
  const totalLaunched = data.reduce((s, d) => s + d.launched, 0);
  const totalRepeat = data.reduce((s, d) => s + d.repeat, 0);
  const totalRetire = data.reduce((s, d) => s + d.retire, 0);
  const totalScored = totalRepeat + data.reduce((s, d) => s + d.tweak, 0) + totalRetire;
  const successRate = totalScored > 0 ? Math.round((totalRepeat / totalScored) * 100) : 0;
  const avgPerMonth = data.length > 0 ? (totalLaunched / data.length).toFixed(1) : '0';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Campaign Activity</h3>
        <span className="text-xs text-muted-foreground">From audit findings</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 rounded bg-muted/40">
          <div className="text-[10px] uppercase text-muted-foreground">Launched</div>
          <div className="text-xl font-bold text-foreground">{totalLaunched}</div>
        </div>
        <div className="p-2 rounded bg-muted/40">
          <div className="text-[10px] uppercase text-muted-foreground">Success rate</div>
          <div className="text-xl font-bold text-emerald-600">{successRate}%</div>
        </div>
        <div className="p-2 rounded bg-muted/40">
          <div className="text-[10px] uppercase text-muted-foreground">Avg / month</div>
          <div className="text-xl font-bold text-foreground">{avgPerMonth}</div>
        </div>
      </div>

      <div className="h-[230px]">
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
            <Bar dataKey="repeat" name="Repeat" stackId="a" fill="hsl(160 84% 39%)" />
            <Bar dataKey="tweak" name="Tweak" stackId="a" fill="hsl(38 92% 55%)" />
            <Bar dataKey="retire" name="Retire" stackId="a" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

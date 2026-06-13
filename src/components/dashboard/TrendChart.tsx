import { WeeklyScorecard } from '@/types/venue';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendChartProps {
  scorecards: WeeklyScorecard[];
  currentWeekId?: string;
}

export const TrendChart = ({ scorecards, currentWeekId }: TrendChartProps) => {
  // Reverse to show chronologically (oldest to newest)
  const data = [...scorecards].reverse().map((sc, index) => {
    return {
      name: `W${index + 1}`,
      score: sc.overall_score,
      salesScore: sc.revenue_score || 0,
      laborScore: sc.labor_score || 0,
      opsScore: sc.operations_score || 0,
      guestScore: sc.guest_experience_score || 0,
      grade: undefined, // Grade computed from score at display time
      isCurrent: sc.week?.[0] === currentWeekId,
    };
  });

  return (
    <div className="card-metric p-4 md:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Weekly Score Trend
      </h3>
      
      <div className="h-48 md:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.5}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis 
              domain={[60, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  score: 'Overall',
                  salesScore: 'Sales',
                  laborScore: 'Labor',
                  opsScore: 'Operations',
                  guestScore: 'Guest Exp',
                };
                return [value, labels[name] || name];
              }}
            />
            
            {/* Orange line - Sales */}
            <Line 
              type="monotone" 
              dataKey="salesScore" 
              stroke="#F97316" 
              strokeWidth={2} 
              dot={false}
              name="salesScore"
            />
            
            {/* Green line - Labor */}
            <Line 
              type="monotone" 
              dataKey="laborScore" 
              stroke="#22C55E" 
              strokeWidth={2} 
              dot={false}
              name="laborScore"
            />
            
            {/* Primary line with dots - Overall Score */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`dot-${payload.name}`}
                    cx={cx}
                    cy={cy}
                    r={payload.isCurrent ? 6 : 4}
                    fill={payload.isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--card))'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--foreground))',
                strokeWidth: 2,
              }}
              name="score"
            />
            
            {/* Blue line - Guest Experience */}
            <Line 
              type="monotone" 
              dataKey="guestScore" 
              stroke="#3B82F6" 
              strokeWidth={2} 
              dot={false}
              name="guestScore"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span className="text-muted-foreground">Overall</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-orange rounded" />
          <span className="text-muted-foreground">Sales</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-signal-green rounded" />
          <span className="text-muted-foreground">Labor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue rounded" />
          <span className="text-muted-foreground">Guest</span>
        </div>
      </div>
    </div>
  );
};

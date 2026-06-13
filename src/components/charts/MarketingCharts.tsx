import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WeeklyScorecard } from '@/types/venue';
import { format, parseISO } from 'date-fns';

interface MarketingChartsProps {
  scorecards: WeeklyScorecard[];
  weeks: { id: string; week_start: string }[];
}

export const MarketingCharts = ({ scorecards, weeks }: MarketingChartsProps) => {
  // Build week lookup map
  const weekMap = new Map(weeks.map(w => [w.id, w.week_start]));

  // Transform data for chart - sorted by date ascending for proper chart display
  const chartData = scorecards
    .filter(sc => sc.marketing_score !== undefined && sc.marketing_score !== null)
    .map(sc => {
      const weekId = sc.week?.[0];
      const weekStart = weekId ? weekMap.get(weekId) : null;
      return {
        weekId,
        weekStart,
        date: weekStart ? format(parseISO(weekStart), 'MMM d') : 'Unknown',
        score: sc.marketing_score || 0,
      };
    })
    .sort((a, b) => {
      if (!a.weekStart || !b.weekStart) return 0;
      return new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
    })
    .slice(-8); // Last 8 weeks

  // Calculate average
  const avgScore = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length
    : 0;

  if (chartData.length < 2) {
    return (
      <Card className="card-metric animate-fade-in-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Marketing Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Not enough data for trend chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Marketing Trend (8 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                domain={[0, 20]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                ticks={[0, 5, 10, 15, 20]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine 
                y={avgScore} 
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{
                  value: `Avg: ${avgScore.toFixed(1)}`,
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Marketing Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

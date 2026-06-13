import { SecretShopAudit } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { History } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SecretShopHistoryCardProps {
  audits: SecretShopAudit[];
}

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-signal-green';
  if (score >= 70) return 'text-gold';
  return 'text-destructive';
};

export const SecretShopHistoryCard = ({ audits }: SecretShopHistoryCardProps) => {
  if (!audits.length) return null;

  // Sort by date ascending for chart (oldest first)
  const sortedForChart = [...audits].sort((a, b) => 
    new Date(a.shop_date).getTime() - new Date(b.shop_date).getTime()
  );

  // Calculate average score (convert decimal to percentage)
  const avgScore = (audits.reduce((sum, a) => sum + a.total_score_pct, 0) / audits.length) * 100;

  // Prepare chart data (convert decimal to percentage)
  const chartData = sortedForChart.map(audit => ({
    date: format(parseISO(audit.shop_date), 'MMM d'),
    score: audit.total_score_pct * 100,
    server: audit.server_name || 'Unknown',
    fullDate: format(parseISO(audit.shop_date), 'MMM d, yyyy'),
  }));

  // Sort by date descending for table (newest first)
  const sortedForTable = [...audits].sort((a, b) => 
    new Date(b.shop_date).getTime() - new Date(a.shop_date).getTime()
  );

  return (
    <div className="card-metric p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Shop History</h3>
        <span className="text-sm text-muted-foreground">({audits.length} shops)</span>
      </div>

      {/* Line Chart */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(215 25% 27%)' }}
              tickLine={false}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="text-foreground font-medium">{data.fullDate}</p>
                      <p className="text-muted-foreground text-sm">Server: {data.server}</p>
                      <p className={cn('font-mono text-lg font-bold', getScoreColor(data.score))}>
                        {data.score.toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Passing line at 85% */}
            <ReferenceLine 
              y={85} 
              stroke="hsl(142 71% 45%)" 
              strokeDasharray="3 3" 
              label={{ value: 'Pass', fill: 'hsl(142 71% 45%)', fontSize: 10, position: 'right' }}
            />
            {/* Average line */}
            <ReferenceLine 
              y={avgScore} 
              stroke="hsl(30 45% 64%)" 
              strokeDasharray="5 5"
              label={{ value: `Avg: ${avgScore.toFixed(0)}%`, fill: 'hsl(30 45% 64%)', fontSize: 10, position: 'left' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(217 91% 60%)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(30 45% 64%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* History Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Server</TableHead>
              <TableHead className="text-xs text-right">Score</TableHead>
              <TableHead className="text-xs">Key Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedForTable.map(audit => (
              <TableRow key={audit.id} className="hover:bg-muted/30">
                <TableCell className="text-sm py-2">
                  {format(parseISO(audit.shop_date), 'MMM d')}
                </TableCell>
                <TableCell className="text-sm py-2">
                  {audit.server_name || '—'}
                </TableCell>
                <TableCell className={cn('text-sm py-2 text-right font-mono', getScoreColor(audit.total_score_pct * 100))}>
                  {(audit.total_score_pct * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-sm py-2 text-muted-foreground truncate max-w-[200px]">
                  {audit.failed_areas || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

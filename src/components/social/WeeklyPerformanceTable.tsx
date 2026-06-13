import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Instagram, Facebook, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklySocialMetrics, SocialPlatform } from '@/types/venue';

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4 text-[#E1306C]" />,
  'Facebook': <Facebook className="h-4 w-4 text-[#1877F2]" />,
  'TikTok': <span className="text-sm font-bold">♪</span>,
  'Google Business': <span className="text-sm font-bold text-[#4285F4]">G</span>,
  'Yelp': <span className="text-sm font-bold text-[#D32323]">Y</span>,
};

interface WeeklyPerformanceTableProps {
  metrics: WeeklySocialMetrics[];
}

const formatK = (value: number | undefined | null): string => {
  if (value == null) return '—';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const getEngagementColor = (rate: number): string => {
  if (rate >= 12) return 'text-signal-green bg-signal-green/20';
  if (rate >= 8) return 'text-lime-500 bg-lime-500/20';
  if (rate >= 5) return 'text-gold bg-gold/20';
  return 'text-destructive bg-destructive/20';
};

export const WeeklyPerformanceTable = ({ metrics }: WeeklyPerformanceTableProps) => {
  const platforms: SocialPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'Google Business'];
  
  // Find the platform with highest engagement rate for highlighting
  const maxEngagement = Math.max(...metrics.map(m => m.engagement_rate || 0));

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Weekly Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Platform</TableHead>
              <TableHead className="text-muted-foreground text-right">Posts</TableHead>
              <TableHead className="text-muted-foreground text-right">Reach</TableHead>
              <TableHead className="text-muted-foreground text-right">Impressions</TableHead>
              <TableHead className="text-muted-foreground text-right">Interactions</TableHead>
              <TableHead className="text-muted-foreground text-right">Eng. Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {platforms.map((platform) => {
              const metric = metrics.find(m => m.platform === platform);
              const interactions = metric 
                ? (metric.likes + metric.comments + metric.shares + metric.saves) 
                : 0;
              const engRate = metric?.engagement_rate || 0;
              const isTopPerformer = engRate === maxEngagement && engRate > 0;

              return (
                <TableRow 
                  key={platform} 
                  className={cn(
                    "border-border",
                    isTopPerformer && "bg-primary/5"
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {platformIcons[platform]}
                      <span>{platform}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {metric?.posts_count ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {metric ? formatK(metric.reach) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {metric ? formatK(metric.impressions) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {metric ? formatK(interactions) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {metric ? (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-sm font-medium",
                        getEngagementColor(engRate)
                      )}>
                        {engRate.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {metrics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No performance data for this week
          </div>
        )}
      </CardContent>
    </Card>
  );
};

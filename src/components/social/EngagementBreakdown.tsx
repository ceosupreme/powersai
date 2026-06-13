import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Instagram, Facebook, TrendingUp, TrendingDown, Minus, PieChart } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { WeeklySocialMetrics, SocialPlatform } from '@/types/venue';

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4 text-[#E1306C]" />,
  'Facebook': <Facebook className="h-4 w-4 text-[#1877F2]" />,
  'TikTok': <span className="text-sm font-bold">♪</span>,
  'Google Business': <span className="text-sm font-bold text-[#4285F4]">G</span>,
  'Yelp': <span className="text-sm font-bold text-[#D32323]">Y</span>,
};

interface EngagementBreakdownProps {
  metrics: WeeklySocialMetrics[];
}

const calculateChange = (current: number, previous?: number): { value: number; display: string } => {
  if (!previous || previous === 0) {
    return { value: 0, display: '—' };
  }
  const change = ((current - previous) / previous) * 100;
  return { 
    value: change, 
    display: `${change > 0 ? '+' : ''}${change.toFixed(0)}%` 
  };
};

const TrendIndicator = ({ change }: { change: { value: number; display: string } }) => {
  if (change.display === '—') {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className={cn(
      "flex items-center gap-1",
      change.value > 0 && "text-signal-green",
      change.value < 0 && "text-destructive",
      change.value === 0 && "text-muted-foreground"
    )}>
      {change.value > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : change.value < 0 ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {change.display}
    </span>
  );
};

export const EngagementBreakdown = ({ metrics }: EngagementBreakdownProps) => {
  const platforms: SocialPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'Google Business'];
  const availablePlatforms = platforms.filter(p => metrics.some(m => m.platform === p));

  const getMetricRows = (metric: WeeklySocialMetrics) => [
    { label: 'Likes', value: metric.likes, prev: metric.prev_likes },
    { label: 'Comments', value: metric.comments, prev: metric.prev_comments },
    { label: 'Shares', value: metric.shares, prev: metric.prev_shares },
    { label: 'Saves', value: metric.saves, prev: metric.prev_saves },
    { label: 'Profile Visits', value: metric.profile_visits, prev: metric.prev_profile_visits },
    { label: 'Website Clicks', value: metric.website_clicks, prev: metric.prev_website_clicks },
    { label: 'Mentions', value: metric.mentions, prev: metric.prev_mentions },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="h-5 w-5 text-primary" />
          Engagement Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {availablePlatforms.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {availablePlatforms.map((platform) => {
              const metric = metrics.find(m => m.platform === platform);
              if (!metric) return null;

              const rows = getMetricRows(metric);
              const totalInteractions = metric.likes + metric.comments + metric.shares + metric.saves;

              return (
                <AccordionItem key={platform} value={platform} className="border-border">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      {platformIcons[platform]}
                      <span className="font-medium">{platform}</span>
                      <span className="text-sm text-muted-foreground">
                        ({formatNumber(totalInteractions)} interactions)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Metric</TableHead>
                          <TableHead className="text-muted-foreground text-right">Value</TableHead>
                          <TableHead className="text-muted-foreground text-right">vs Last Week</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.label} className="border-border">
                            <TableCell>{row.label}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumber(row.value)}
                            </TableCell>
                            <TableCell className="text-right">
                              <TrendIndicator change={calculateChange(row.value, row.prev)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No engagement data for this week
          </div>
        )}
      </CardContent>
    </Card>
  );
};

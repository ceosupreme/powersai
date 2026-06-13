import { Card } from '@/components/ui/card';
import type { QuickStats } from './deriveScores';

export const QuickStatsStrip = ({ stats }: { stats: QuickStats }) => {
  const items = [
    { label: 'Open findings', value: stats.openFindings.toString() },
    { label: 'Resolved this month', value: stats.resolvedThisMonth.toString() },
    { label: 'Campaigns launched from audit', value: stats.campaignsLaunched.toString() },
    { label: 'Est. revenue opportunity surfaced', value: stats.opportunitySurfaced },
  ];
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50">
        {items.map((it, i) => (
          <div key={it.label} className={`px-4 ${i === 0 ? 'pl-0' : ''}`}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{it.label}</div>
            <div className="text-lg font-bold text-foreground mt-1">{it.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

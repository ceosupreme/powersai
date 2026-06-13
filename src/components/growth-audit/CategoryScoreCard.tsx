import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { confidenceTone, getScoreBand } from './scoreBands';
import type { CategoryScore } from './deriveScores';

export const CategoryScoreCard = ({ cat }: { cat: CategoryScore }) => {
  const band = getScoreBand(cat.score);
  const Icon = cat.icon;
  const TrendIcon = cat.trend > 0 ? ArrowUp : cat.trend < 0 ? ArrowDown : ArrowRight;
  const trendColor = cat.trend > 0 ? 'text-emerald-600' : cat.trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className={`p-4 border ${band.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`p-1.5 rounded-md ${band.bg} ${band.text}`}>
          <Icon className="w-4 h-4" />
        </div>
        <Badge variant="outline" className={`text-[10px] ${confidenceTone(cat.confidence)}`}>
          {cat.confidence}
        </Badge>
      </div>
      <div className="mt-3 text-xs font-medium text-foreground leading-tight min-h-[2.25rem]">
        {cat.name}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className={`text-2xl font-bold ${band.text}`}>{cat.score}</div>
        <div className={`inline-flex items-center gap-0.5 text-[11px] ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          {cat.trend > 0 ? '+' : ''}{cat.trend}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {cat.openFindings} open finding{cat.openFindings === 1 ? '' : 's'}
      </div>
    </Card>
  );
};

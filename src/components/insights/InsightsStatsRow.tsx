import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ActionCardWithWeek } from '@/hooks/useActionItems';

interface InsightsStatsRowProps {
  cards: ActionCardWithWeek[];
  allCards: ActionCardWithWeek[];
}

export const InsightsStatsRow = ({ cards, allCards }: InsightsStatsRowProps) => {
  const proposedCards = allCards.filter(c => c.approval_status === 'Proposed');
  const criticalCount = proposedCards.filter(c => c.priority === 'Critical').length;
  const highCount = proposedCards.filter(c => c.priority === 'High').length;
  const resolvedCount = allCards.filter(c => c.approval_status === 'Approved' || c.approval_status === 'Rejected').length;
  const totalCount = allCards.length;
  const resolutionPct = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  return (
    <div className="mb-6 bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all duration-200">
      <h3 className="font-semibold text-foreground mb-3 text-sm">Needs Your Attention</h3>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-sm text-foreground font-medium">{criticalCount} Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange" />
          <span className="text-sm text-foreground font-medium">{highCount} High</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-signal-green" />
          <span className="text-sm text-foreground font-medium">{resolvedCount} Resolved</span>
        </div>
      </div>

      <Progress value={resolutionPct} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1.5">
        {resolvedCount} of {totalCount} resolved this week
      </p>
    </div>
  );
};

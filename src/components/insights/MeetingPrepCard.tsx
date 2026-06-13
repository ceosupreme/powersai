import { useState } from 'react';
import { ClipboardList, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ActionCardWithWeek } from '@/hooks/useAllActionCards';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MeetingPrepCardProps {
  cards: ActionCardWithWeek[];
}

const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const INITIAL_DISPLAY_COUNT = 3;
const MAX_DISPLAY_COUNT = 6;

export const MeetingPrepCard = ({ cards }: MeetingPrepCardProps) => {
  const [showMore, setShowMore] = useState(false);
  
  // Sort all cards by priority
  const sortedCards = [...cards].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  // Get display count based on showMore state
  const displayCount = showMore ? MAX_DISPLAY_COUNT : INITIAL_DISPLAY_COUNT;
  const topCards = sortedCards.slice(0, displayCount);
  const hasMoreCards = sortedCards.length > INITIAL_DISPLAY_COUNT;

  // Group issues by category for summary
  const criticalCount = cards.filter((c) => c.priority === 'Critical').length;
  const highCount = cards.filter((c) => c.priority === 'High').length;
  const mediumCount = cards.filter((c) => c.priority === 'Medium').length;
  const lowCount = cards.filter((c) => c.priority === 'Low').length;
  const proposedCount = cards.filter((c) => c.approval_status === 'Proposed').length;
  const approvedCount = cards.filter((c) => c.approval_status === 'Approved').length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <div className="p-2 rounded-lg bg-primary/20 text-primary">
          <ClipboardList className="w-5 h-5" />
        </div>
        <h2 className="font-semibold text-foreground">Prep for Meeting</h2>
        <Sparkles className="w-4 h-4 text-primary ml-auto" />
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-b border-border space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-foreground">{criticalCount} Critical</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange" />
              <span className="text-foreground">{highCount} High</span>
            </div>
          )}
          {mediumCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-foreground">{mediumCount} Medium</span>
            </div>
          )}
          {lowCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-signal-green" />
              <span className="text-foreground">{lowCount} Low</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-foreground">{proposedCount} Pending</span>
          </div>
        </div>
        {approvedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {approvedCount} task{approvedCount !== 1 ? 's' : ''} approved and in Asana
          </p>
        )}
      </div>

      {/* Talking Points */}
      <div className="p-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Key Talking Points
        </h3>
        
        {topCards.length > 0 ? (
          <>
            <ol className="space-y-3">
              {topCards.map((card, index) => (
                <li key={card.id} className="flex gap-3">
                  <span className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    card.priority === 'Critical' && 'bg-destructive/20 text-destructive',
                    card.priority === 'High' && 'bg-orange/20 text-orange',
                    card.priority === 'Medium' && 'bg-gold/20 text-gold',
                    card.priority === 'Low' && 'bg-signal-green/20 text-signal-green',
                  )}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium line-clamp-1">
                      {card.insight_title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {card.insight_summary}
                    </p>
                    <span className="text-xs text-primary mt-1 inline-block">
                      {card.pillar}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            
            {/* Load More Button */}
            {hasMoreCards && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowMore(!showMore)}
              >
                {showMore ? (
                  <>
                    Show Less
                    <ChevronUp className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Show {Math.min(MAX_DISPLAY_COUNT - INITIAL_DISPLAY_COUNT, sortedCards.length - INITIAL_DISPLAY_COUNT)} More
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <EmptyState 
            message="No insights for meeting prep"
            title="No insights for meeting prep"
            description="Insights will appear here once weekly data is reviewed."
            icon={<ClipboardList className="w-6 h-6 text-muted-foreground" />}
          />
        )}
      </div>

      {/* Action Summary */}
      {topCards.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            💡 Focus on the top {Math.min(3, criticalCount + highCount)} priority items first.
          </p>
        </div>
      )}
    </div>
  );
};

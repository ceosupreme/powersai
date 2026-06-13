import { useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { ActionCardWithWeek } from '@/hooks/useAllActionCards';
import { cn } from '@/lib/utils';

interface InsightColumnProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  cards: ActionCardWithWeek[];
  onApprove?: (id: string, assigneeGid?: string, barCode?: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  isProcessing?: boolean;
  barCode?: string;
  emptyMessage?: string;
}

const ITEMS_PER_PAGE = 5;

export const InsightColumn = ({
  title,
  icon: Icon,
  iconColor,
  cards,
  onApprove,
  onReject,
  isProcessing,
  barCode,
  emptyMessage = 'No items to show',
}: InsightColumnProps) => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  
  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = cards.length > visibleCount;
  const remaining = cards.length - visibleCount;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-card-hover/30">
        <div className={cn('p-2 rounded-lg', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {cards.length} {cards.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Cards List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {visibleCards.length > 0 ? (
          visibleCards.map((card) => (
            <ExpandableActionCard
              key={card.id}
              card={card}
              onApprove={onApprove}
              onReject={onReject}
              isProcessing={isProcessing}
              barCode={barCode}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Load {Math.min(remaining, ITEMS_PER_PAGE)} more ({remaining} remaining)
          </Button>
        )}
      </div>
    </div>
  );
};

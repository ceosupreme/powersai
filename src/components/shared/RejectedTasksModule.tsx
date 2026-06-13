import { useState } from 'react';
import { ActionCard } from '@/types/venue';
import { X, Clock, ChevronDown } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { Button } from '@/components/ui/button';

interface RejectedTasksModuleProps {
  cards: ActionCard[];
  className?: string;
}

export const RejectedTasksModule = ({ 
  cards, 
  className 
}: RejectedTasksModuleProps) => {
  const [visibleCount, setVisibleCount] = useState(5);

  // Show empty state instead of returning null
  if (cards.length === 0) {
    return (
      <div className={className}>
        <SectionHeader title="Rejected Tasks" count={0} />
        <div className="bg-card/50 border border-border/50 border-dashed rounded-lg p-6 text-center">
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <X className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No rejected tasks</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Rejected insights will appear here
          </p>
        </div>
      </div>
    );
  }

  const visibleCards = cards.slice(0, visibleCount);
  const remainingCount = cards.length - visibleCount;

  return (
    <div className={className}>
      <SectionHeader title="Rejected Tasks" count={cards.length} />
      <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden hover:border-primary/50 transition-all duration-200">
        {visibleCards.map(card => (
          <div 
            key={card.id} 
            className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors min-h-[56px]"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3 h-3 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{card.action_title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {card.estimated_minutes} min
                  </span>
                  <span className="capitalize">{card.pillar}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <Button
          variant="ghost"
          onClick={() => setVisibleCount(prev => prev + 5)}
          className="w-full mt-2 py-2 border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ChevronDown className="w-4 h-4 mr-2" />
          Load {Math.min(5, remainingCount)} more ({remainingCount} remaining)
        </Button>
      )}
    </div>
  );
};

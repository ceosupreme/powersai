import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { ActionCard } from '@/types/venue';
import { Checkbox } from '@/components/ui/checkbox';

interface InsightSectionProps {
  title: string;
  icon: string;
  colorClass: string;
  borderColorClass: string;
  cards: ActionCard[];
  defaultExpanded: boolean;
  onApprove: (id: string, assigneeId?: string, barCode?: string, note?: string, dueDate?: string, asanaGid?: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  processingId?: string | null;
  processingIds?: Set<string>;
  barCode?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  autoApproveEnabled?: boolean;
  venueNameMap?: Map<string, string>;
}

export const InsightSection = ({
  title,
  icon,
  colorClass,
  borderColorClass,
  cards,
  defaultExpanded,
  onApprove,
  onReject,
  processingId,
  processingIds,
  barCode,
  selectedIds,
  onToggleSelect,
  autoApproveEnabled,
  venueNameMap,
}: InsightSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 p-3 rounded-lg border transition-colors hover:bg-muted/50',
          borderColorClass
        )}
      >
        <span>{icon}</span>
        <span className={cn('font-semibold text-sm', colorClass)}>
          {title.toUpperCase()} ({cards.length})
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-auto transition-transform text-muted-foreground',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 mt-3">
          {cards.map((card, idx) => (
            <div key={card.id} className="flex items-start gap-2" style={{ animationDelay: `${idx * 50}ms` }}>
              {onToggleSelect && selectedIds && (
                <Checkbox
                  checked={selectedIds.has(card.id)}
                  onCheckedChange={() => onToggleSelect(card.id)}
                  className="mt-4 flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <ExpandableActionCard
                  card={card}
                  onApprove={onApprove}
                  onReject={onReject}
                  isProcessing={processingIds ? processingIds.has(card.id) : processingId === card.id}
                  barCode={barCode}
                  venueName={venueNameMap?.get((card as any).bar_id) || undefined}
                />
                {autoApproveEnabled && !card.auto_approved && (
                  <span className="text-[10px] text-muted-foreground ml-1 italic">Requires manual review</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

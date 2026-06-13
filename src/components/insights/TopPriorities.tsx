import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { ActionCardWithWeek } from '@/hooks/useActionItems';

const SEVERITY_BADGE: Record<string, { icon: string; color: string }> = {
  Critical: { icon: '🔴', color: 'text-destructive' },
  High: { icon: '🟠', color: 'text-orange' },
  Medium: { icon: '🟡', color: 'text-gold' },
  Low: { icon: '🟢', color: 'text-signal-green' },
};

const PILLAR_COLORS: Record<string, string> = {
  Revenue: 'text-signal-green',
  Labor: 'text-blue-400',
  Operations: 'text-orange',
  'Guest Experience': 'text-gold',
};

interface TopPrioritiesProps {
  cards: ActionCardWithWeek[];
  onApprove: (id: string, assigneeId?: string, barCode?: string, note?: string, dueDate?: string, asanaGid?: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onRejectClearExpanded?: (id: string) => void;
  processingId?: string | null;
  processingIds?: Set<string>;
  barCode?: string;
  venueNameMap?: Map<string, string>;
}

export function TopPriorities({ cards, onApprove, onReject, processingId, processingIds, barCode, venueNameMap }: TopPrioritiesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleReject = async (id: string) => {
    if (expandedId === id) setExpandedId(null);
    await onReject(id);
  };

  // Take up to 5: all Critical + top High
  const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const sorted = [...cards].sort((a, b) =>
    (priorityOrder.indexOf(a.priority) ?? 99) - (priorityOrder.indexOf(b.priority) ?? 99)
  );
  const top5 = sorted.slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <div className="mb-6 bg-card border border-primary/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">This Week's Priorities</h2>
        <span className="text-xs text-muted-foreground ml-auto">{top5.length} items</span>
      </div>
      <div className="space-y-2">
        {top5.map(card => {
          const badge = SEVERITY_BADGE[card.priority] || SEVERITY_BADGE.Medium;
          const isExpanded = expandedId === card.id;
          const venueName = venueNameMap?.get(card.bar_id || '');
          return (
            <div key={card.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : card.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-sm">{badge.icon}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {card.insight_title || card.action_title}
                </span>
                <span className={cn('text-[10px] shrink-0', PILLAR_COLORS[card.pillar] || 'text-muted-foreground')}>
                  {card.pillar}
                </span>
                {venueName && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {venueName}
                  </span>
                )}
              </button>
              {isExpanded && (
                <div className="ml-6 mt-1">
                  <ExpandableActionCard
                    card={card}
                    onApprove={onApprove}
                    onReject={handleReject}
                    isProcessing={processingIds ? processingIds.has(card.id) : processingId === card.id}
                    barCode={barCode}
                    venueName={venueName}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Target, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionCardWithWeek } from '@/hooks/useActionItems';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface FocusActionsProps {
  actions: ActionCardWithWeek[];
}

const PILLAR_PILL: Record<string, string> = {
  Revenue: 'bg-signal-green/20 text-signal-green',
  Labor: 'bg-gold/20 text-gold',
  Operations: 'bg-primary/20 text-primary',
  'Guest Experience': 'bg-gold/20 text-gold',
};

export function FocusActions({ actions }: FocusActionsProps) {
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const top3 = actions.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Target className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground mb-3">
          No approved actions yet. Review and approve this week's recommendations.
        </p>
        <a href="/insights" className="text-sm text-primary font-medium hover:underline">
          Review Insights →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-card border border-indigo-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Target className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Focus Actions</h3>
      </div>
      <div className="divide-y divide-border">
        {top3.map((action, i) => {
          const pushed = pushedIds.has(action.id);
          return (
            <div key={action.id} className="px-4 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{action.action_title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', PILLAR_PILL[action.pillar] || 'bg-muted text-muted-foreground')}>
                    {action.pillar}
                  </span>
                  {action.due_date && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {format(parseISO(action.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={pushed ? 'ghost' : 'outline'}
                size="sm"
                className={cn('text-xs shrink-0', pushed && 'text-signal-green')}
                onClick={() => setPushedIds(prev => new Set(prev).add(action.id))}
                disabled={pushed}
              >
                {pushed ? (
                  <><Check className="w-3 h-3 mr-1" /> In Asana</>
                ) : (
                  <><ArrowRight className="w-3 h-3 mr-1" /> Push to Asana</>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

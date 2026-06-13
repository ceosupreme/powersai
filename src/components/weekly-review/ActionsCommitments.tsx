import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ActionCardWithWeek } from '@/hooks/useActionItems';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ActionsCommitmentsProps {
  actions: ActionCardWithWeek[];
}

export function ActionsCommitments({ actions }: ActionsCommitmentsProps) {
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const top3 = actions.slice(0, 3);

  if (top3.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Confirm Actions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-4 h-4 text-signal-green" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm Actions</h3>
        </div>
        <div className="space-y-3">
          {top3.map((action) => {
            const approved = approvedIds.has(action.id);
            return (
              <div key={action.id} className="flex items-start gap-3">
                <Checkbox
                  checked={approved}
                  onCheckedChange={() => setApprovedIds(prev => {
                    const next = new Set(prev);
                    approved ? next.delete(action.id) : next.add(action.id);
                    return next;
                  })}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm text-foreground', approved && 'line-through text-muted-foreground')}>
                    {action.action_title}
                  </p>
                </div>
                {!approved && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => setApprovedIds(prev => new Set(prev).add(action.id))}
                  >
                    Approve
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* GM Commitments */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GM Commitments</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">These will be tracked and scored next Monday.</p>
        <div className="space-y-3">
          {top3.map((action, i) => (
            <div key={action.id} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{action.action_title}</p>
                {action.due_date && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Due {format(parseISO(action.due_date), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Target, ChevronDown, Check, Loader2, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActionCardWithWeek } from '@/hooks/useActionItems';
import { ASANA_TEAM } from '@/services/asana';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ActionPlanModuleProps {
  actions: ActionCardWithWeek[];
  onApprove: (cardId: string, assigneeId?: string, barCode?: string, note?: string) => Promise<void>;
  onReject: (cardId: string) => Promise<void>;
  processingIds: Set<string>;
  barCode?: string;
}

const PILLAR_PILL: Record<string, string> = {
  Revenue: 'bg-signal-green/20 text-signal-green',
  Labor: 'bg-gold/20 text-gold',
  Operations: 'bg-primary/20 text-primary',
  'Guest Experience': 'bg-gold/20 text-gold',
  Marketing: 'bg-primary/20 text-primary',
};

function getStatus(action: ActionCardWithWeek): 'sent' | 'completed' | 'not_sent' {
  if (action.approval_status === 'Approved' && action.asana_task_gid) return 'sent';
  if (action.approval_status === 'Approved') return 'completed';
  return 'not_sent';
}

function parseEvidenceBullets(summary: string | null | undefined): string[] {
  if (!summary) return [];
  return summary.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 4);
}

export function ActionPlanModule({ actions, onApprove, onReject, processingIds, barCode }: ActionPlanModuleProps) {
  const display = actions.slice(0, 5);
  const hasMore = actions.length > 5;

  if (display.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Target className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          No actions this week. Actions are generated from weekly insights.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Action Plan</h3>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
          {display.length} item{display.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-border">
        {display.map((action, i) => (
          <ActionPlanRow
            key={action.id}
            action={action}
            index={i}
            isProcessing={processingIds.has(action.id)}
            onApprove={onApprove}
            onReject={onReject}
            barCode={barCode}
          />
        ))}
      </div>
      {hasMore && (
        <div className="px-4 py-3 border-t border-border">
          <a href="/insights" className="text-xs text-primary hover:underline">
            View all on Insights page →
          </a>
        </div>
      )}
    </div>
  );
}

interface ActionPlanRowProps {
  action: ActionCardWithWeek;
  index: number;
  isProcessing: boolean;
  onApprove: (cardId: string, assigneeId?: string, barCode?: string, note?: string) => Promise<void>;
  onReject: (cardId: string) => Promise<void>;
  barCode?: string;
}

function ActionPlanRow({ action, index, isProcessing, onApprove, onReject, barCode }: ActionPlanRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [assigneeGid, setAssigneeGid] = useState<string>('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const status = getStatus(action);
  const evidence = parseEvidenceBullets(action.insight_summary);

  const asanaTitle = barCode ? `[${barCode}] ${action.action_title}` : action.action_title;
  const asanaDescription = [
    action.insight_title,
    '',
    'What Happened:',
    action.problem_detail || 'N/A',
    '',
    'Action:',
    action.action_title,
  ].join('\n');

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      {/* Collapsed row */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <CollapsibleTrigger className="text-left w-full group">
              <p className="text-sm font-medium text-foreground">{action.action_title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', PILLAR_PILL[action.pillar] || 'bg-muted text-muted-foreground')}>
                  {action.pillar}
                </span>
                {action.due_date && (
                  <span className="text-[10px] text-muted-foreground">
                    Due {format(parseISO(action.due_date), 'MMM d')}
                  </span>
                )}
                <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              </div>
              {action.insight_summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{action.insight_summary}</p>
              )}
            </CollapsibleTrigger>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {status === 'sent' ? (
              <span className="inline-flex items-center gap-1 text-xs text-signal-green font-medium">
                <Check className="w-3 h-3" /> In Asana
              </span>
            ) : status === 'completed' ? (
              <span className="inline-flex items-center gap-1 text-xs text-signal-green font-medium">
                <Check className="w-3 h-3" /> Approved
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={isProcessing}
                onClick={() => onApprove(action.id, assigneeGid || undefined, barCode)}
              >
                {isProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Target className="w-3 h-3 mr-1" />}
                Approve & Push
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground hover:text-primary px-2"
              onClick={(e) => { e.stopPropagation(); setShowCreateTask(true); }}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Related
            </Button>
          </div>
        </div>
      </div>
      <CreateTaskModal
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        prefill={{
          sourceInsightId: (action as any).insightId || (action as any).insight_id || action.id,
          sourceTitle: action.action_title || action.insight_title,
          venueId: (action as any).bar_id,
          pillar: action.pillar,
        }}
      />

      {/* Expanded detail */}
      <CollapsibleContent>
        <div className="px-4 pb-4 pl-13 space-y-4 ml-9 border-l border-border/50">
          {/* Context */}
          {action.problem_detail && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What Happened</p>
              <p className="text-xs text-foreground">{action.problem_detail}</p>
            </div>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Evidence</p>
              <ul className="space-y-1">
                {evidence.map((e, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completion condition */}
          {action.action_detail && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What "done" looks like</p>
              <p className="text-xs text-foreground">{action.action_detail}</p>
            </div>
          )}

          {/* Asana Preview */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Asana Preview</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">Title:</span>
                <span className="text-foreground font-medium truncate">{asanaTitle}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">Desc:</span>
                <span className="text-foreground line-clamp-2">{asanaDescription}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-16 shrink-0">Assignee:</span>
                <Select value={assigneeGid} onValueChange={setAssigneeGid}>
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASANA_TEAM.map(m => (
                      <SelectItem key={m.gid} value={m.gid} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {action.due_date && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-16 shrink-0">Due:</span>
                  <span className="text-foreground">{format(parseISO(action.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            {status === 'not_sent' && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={isProcessing}
                  onClick={() => onApprove(action.id, assigneeGid || undefined, barCode)}
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Approve & Push to Asana
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  disabled={isProcessing}
                  onClick={() => onReject(action.id)}
                >
                  Dismiss
                </Button>
              </div>
            )}
            {action.asana_task_url && (
              <a
                href={action.asana_task_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> View in Asana
              </a>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

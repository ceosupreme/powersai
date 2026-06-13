import { useState, useCallback } from 'react';
import { ActionCard } from '@/types/venue';
import { Check, ExternalLink, Clock, ChevronDown, Calendar, AlertTriangle, AlertCircle, Info, Bot, Undo2 } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApprovedTasksModuleProps {
  cards: ActionCard[];
  className?: string;
}

const priorityConfig = {
  Critical: { icon: AlertTriangle, color: 'text-destructive' },
  High: { icon: AlertCircle, color: 'text-orange' },
  Medium: { icon: Info, color: 'text-gold' },
  Low: { icon: Info, color: 'text-muted-foreground' },
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return null;
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return null;
  }
};

export const ApprovedTasksModule = ({ 
  cards, 
  className 
}: ApprovedTasksModuleProps) => {
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAutoApproved, setShowAutoApproved] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<ActionCard | null>(null);
  const [revoking, setRevoking] = useState(false);
  const queryClient = useQueryClient();

  const hasAutoApproved = cards.some(c => c.auto_approved);
  const filteredCards = showAutoApproved ? cards : cards.filter(c => !c.auto_approved);

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      // Move back to Proposed and clear auto_approved
      const { error: updateError } = await supabase
        .from('action_items')
        .update({ approval_status: 'Proposed', auto_approved: false })
        .eq('id', revokeTarget.id);
      if (updateError) throw updateError;

      // Log revocation
      await supabase.from('auto_approve_log').insert([{
        action_item_id: revokeTarget.id,
        bar_id: 'default',
        action_title: revokeTarget.action_title,
        pillar: revokeTarget.pillar,
        rule_triggered: 'Manual Revoke',
        status: 'Revoked',
        revoked_at: new Date().toISOString(),
      }]);

      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      queryClient.invalidateQueries({ queryKey: ['auto-approve-log'] });
      toast({ title: 'Action revoked', description: 'Moved back to Proposed for manual review.' });
    } catch (error) {
      console.error('Revoke failed:', error);
      toast({ title: 'Revoke failed', variant: 'destructive' });
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }, [revokeTarget, queryClient]);

  if (cards.length === 0) {
    return (
      <div className={className}>
        <SectionHeader title="Approved Tasks" count={0} />
        <div className="bg-card/50 border border-border/50 border-dashed rounded-lg p-6 text-center">
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Check className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No approved tasks yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Approve action items to see them here
          </p>
        </div>
      </div>
    );
  }

  const visibleCards = filteredCards.slice(0, visibleCount);
  const remainingCount = filteredCards.length - visibleCount;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Approved Tasks" count={cards.length} />
        {hasAutoApproved && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showAutoApproved} onCheckedChange={setShowAutoApproved} className="scale-75" />
            Auto
          </label>
        )}
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200">
        {visibleCards.map(card => {
          const isExpanded = expandedId === card.id;
          const PriorityIcon = priorityConfig[card.priority]?.icon || Info;
          const priorityColor = priorityConfig[card.priority]?.color || 'text-muted-foreground';

          return (
            <div key={card.id} className="border-b border-border last:border-b-0">
              <div 
                className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors cursor-pointer min-h-[56px]"
                onClick={() => setExpandedId(isExpanded ? null : card.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-signal-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-signal-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium truncate">{card.action_title}</p>
                      {card.auto_approved && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium flex-shrink-0">
                          <Bot className="w-3 h-3" /> Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {card.estimated_minutes} min
                      </span>
                      <span className="capitalize">{card.pillar}</span>
                    </div>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-2",
                  isExpanded && "rotate-180"
                )} />
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 bg-muted/30 border-t border-border space-y-4">
                  {card.problem_detail && (
                    <div className="pt-3">
                      <span className="text-gold text-xs font-semibold uppercase tracking-wide">What Happened</span>
                      <p className="text-foreground/80 text-sm mt-1 leading-relaxed">{card.problem_detail}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-primary text-xs font-semibold uppercase tracking-wide">Insight</span>
                    <p className="text-foreground font-medium mt-1">{card.insight_title}</p>
                    {card.insight_summary && (
                      <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{card.insight_summary}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={cn("flex items-center gap-1", priorityColor)}>
                      <PriorityIcon className="w-3.5 h-3.5" />
                      {card.priority}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {card.estimated_minutes} min
                    </span>
                    {card.due_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(card.due_date)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {card.asana_task_url && (
                      <a
                        href={card.asana_task_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        Open in Asana
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {card.auto_approved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80 text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); setRevokeTarget(card); }}
                      >
                        <Undo2 className="w-3 h-3 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke auto-approved action?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from Asana and moved back to Proposed for manual review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revoking}>
              {revoking ? 'Revoking...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

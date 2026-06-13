import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { DriversCard } from '@/components/shared/DriversCard';
import { ChevronDown, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface WeeklyBriefingSectionProps {
  mondayBriefing: string | null;
  wins: string | null;
  keyDrivers: string | null;
  generatedAt: string | null;
  weekStart: string | null;
  barId: string | null;
}

export function WeeklyBriefingSection({
  mondayBriefing,
  wins,
  keyDrivers,
  generatedAt,
  weekStart,
  barId,
}: WeeklyBriefingSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRegenerate = async () => {
    if (!barId || !weekStart) return;
    setRegenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-monday-briefing', {
        body: { bar_id: barId, week_start: weekStart },
      });
      if (error) throw error;
      // Refetch scorecard data
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'weeks', barId] });
      toast({ title: 'Briefing regenerated', description: 'Your weekly briefing has been updated.' });
    } catch (err: any) {
      console.error('Failed to regenerate briefing:', err);
      toast({ title: 'Regeneration failed', description: err.message || 'Could not regenerate the briefing.', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const winsList = wins
    ? wins.split('\n').map(l => l.replace(/^[•\-]\s*/, '').trim()).filter(l => l.length > 0)
    : [];

  const weekLabel = weekStart
    ? `Week of ${format(new Date(weekStart + 'T00:00:00'), 'MMM d')}`
    : '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Weekly Briefing</h2>
              {weekLabel && (
                <span className="text-xs text-muted-foreground">{weekLabel}</span>
              )}
            </div>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {mondayBriefing ? (
              <>
                {/* Main narrative */}
                <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {mondayBriefing}
                </div>

                {/* Wins */}
                {winsList.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🏆 Wins</h3>
                    <ul className="space-y-1.5">
                      {winsList.map((win, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <span className="text-signal-green mt-0.5">•</span>
                          <span>{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Drivers */}
                {keyDrivers && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📊 Key Drivers</h3>
                    <DriversCard drivers={keyDrivers} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No briefing generated for this week yet.</p>
                <p className="text-xs mt-1">Click Regenerate to create one.</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                {generatedAt
                  ? `💡 Generated ${format(new Date(generatedAt), 'EEE MMM d \'at\' h:mm a')}`
                  : 'Not yet generated'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating || !barId}
                className="text-xs"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', regenerating && 'animate-spin')} />
                {regenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

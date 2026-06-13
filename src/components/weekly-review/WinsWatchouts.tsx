import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Trophy, AlertTriangle, CheckCircle, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { ActionCardWithWeek } from '@/hooks/useActionItems';
import { CreateTaskModal, PrefillContext } from '@/components/tasks/CreateTaskModal';

interface WinsWatchoutsProps {
  wins: string | null;
  watchouts: ActionCardWithWeek[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-destructive text-destructive-foreground',
  High: 'bg-orange text-foreground',
  Medium: 'bg-gold text-foreground',
  Low: 'bg-blue text-primary-foreground',
};

const PILLAR_COLORS: Record<string, string> = {
  Revenue: 'text-signal-green',
  Labor: 'text-gold',
  Operations: 'text-primary',
  'Guest Experience': 'text-gold',
};

export function WinsWatchouts({ wins, watchouts }: WinsWatchoutsProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskPrefill, setCreateTaskPrefill] = useState<PrefillContext | undefined>();

  const winsList = (() => {
    if (!wins) return [];

    const cleanItem = (value: string) =>
      value
        .replace(/\\n/g, ' ')
        .replace(/^[\s"'`\[{(,]+|[\s"'`\]}) ,]+$/g, '')
        .replace(/^[•\-]\s*/, '')
        .trim();

    const finalize = (items: string[]) =>
      Array.from(
        new Set(
          items
            .map(cleanItem)
            .filter(item => item.length > 1)
            .filter(item => /[A-Za-z0-9]/.test(item))
            .filter(item => !/^[\[\]{}"',:]+$/.test(item))
        )
      ).slice(0, 3);

    const raw = wins.trim();

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return finalize(parsed.filter((item): item is string => typeof item === 'string'));
      }
      if (parsed && typeof parsed === 'object' && 'wins' in parsed) {
        const parsedWins = (parsed as { wins?: unknown }).wins;
        if (Array.isArray(parsedWins)) {
          return finalize(parsedWins.filter((item): item is string => typeof item === 'string'));
        }
        if (typeof parsedWins === 'string') {
          return finalize(parsedWins.split(/\n|•/));
        }
      }
    } catch {
      // Fall through to plain-text parsing.
    }

    return finalize(raw.split(/\n|•/));
  })();

  const topWatchouts = watchouts.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-signal-green" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-signal-green">Wins</h3>
        </div>
        {winsList.length > 0 ? (
          <div className="space-y-2">
            {winsList.map((win, i) => {
              const strongDelimiters = [': ', ' — ', ' - '];
              const delimiterMatch = strongDelimiters
                .map(delimiter => ({ delimiter, index: win.indexOf(delimiter) }))
                .filter(match => match.index > 0)
                .sort((a, b) => a.index - b.index)[0];

              const sentenceBoundaryMatch = win.match(/\.\s+(?=[A-Z])/);
              const sentenceBoundaryIdx = sentenceBoundaryMatch?.index ?? -1;

              const splitIdx = delimiterMatch
                ? delimiterMatch.index
                : sentenceBoundaryIdx > 0
                  ? sentenceBoundaryIdx
                  : -1;

              const splitOffset = delimiterMatch
                ? delimiterMatch.delimiter.length
                : sentenceBoundaryIdx > 0
                  ? 2
                  : 0;

              const title = splitIdx > 0 ? win.substring(0, splitIdx).trim() : win;
              const evidence = splitIdx > 0 ? win.substring(splitIdx + splitOffset).trim() : '';

              return (
                <div
                  key={`${title}-${i}`}
                  className={cn('bg-card border rounded-lg transition-colors border-border')}
                >
                  <div className="w-full p-3 text-left">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-signal-green/15 text-signal-green shrink-0 mt-0.5">
                        <Trophy className="w-3 h-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{title}</p>
                            {evidence ? (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-5">{evidence}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <CheckCircle className="w-5 h-5 text-signal-green mx-auto mb-1 opacity-70" />
            <p className="text-sm text-muted-foreground">No wins identified this week</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-gold" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gold">Warnings</h3>
        </div>
        {topWatchouts.length > 0 ? (
          <div className="space-y-2">
            {topWatchouts.map((item, i) => {
              const isExpanded = expandedId === item.id;
              const detailText = item.problem_detail?.trim() || item.insight_summary;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-card border rounded-lg transition-colors',
                    isExpanded ? 'border-primary/40 bg-muted/20' : 'border-border'
                  )}
                >
                  <button
                    type="button"
                    className="w-full p-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5', SEVERITY_COLORS[item.priority] || 'bg-muted text-muted-foreground')}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium text-foreground', !isExpanded && 'truncate')}>
                              {item.insight_title}
                            </p>
                            <p className={cn('text-xs text-muted-foreground mt-0.5', !isExpanded && 'line-clamp-1')}>
                              {item.insight_summary}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            <span className={cn('text-[10px]', PILLAR_COLORS[item.pillar] || 'text-muted-foreground')}>
                              {item.pillar}
                            </span>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/60">
                      <div className="mt-3 pl-7">
                        <p className="text-sm leading-6 text-foreground/90 whitespace-pre-line">{detailText}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCreateTaskPrefill({
                                sourceInsightId: (item as any).insightId || (item as any).insight_id || item.id,
                                sourceTitle: item.insight_title,
                                venueId: (item as any).bar_id,
                                pillar: item.pillar,
                              });
                              setCreateTaskOpen(true);
                            }}
                            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add related task
                          </button>
                          {item.insightId && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate('/insights', { state: { focusCardId: item.id } });
                              }}
                              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              View on Insights →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <CheckCircle className="w-5 h-5 text-signal-green mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">No warnings — smooth week ✓</p>
          </div>
        )}
      </div>

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        prefill={createTaskPrefill}
      />
    </div>
  );
}

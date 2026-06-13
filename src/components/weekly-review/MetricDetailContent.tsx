import { useEffect, useState } from 'react';
import { Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetricInterpretation } from '@/hooks/useMetricInterpretation';
import type { MetricStats } from '@/lib/metricStats';

interface Props {
  pillar: string;
  pillarLabel: string;
  metricLabel: string;
  scoreKey: string;
  score: number | null;
  weekStart?: string | null;
  weekRange?: string | null;
  venueName?: string | null;
  gmName?: string | null;
  barId?: string | null;
  weekId?: string | null;
  stats: MetricStats;
  open: boolean;
  notApplicable?: boolean;
}

const getScoreBadgeStyle = (s: number | null): string => {
  if (s === null) return 'bg-muted text-muted-foreground';
  if (s >= 80) return 'bg-signal-green text-primary-foreground';
  if (s >= 60) return 'bg-gold text-foreground';
  return 'bg-destructive text-destructive-foreground';
};

export function MetricDetailContent({
  pillar,
  pillarLabel,
  metricLabel,
  scoreKey,
  score,
  weekStart,
  weekRange,
  venueName,
  gmName,
  barId,
  weekId,
  stats,
  open,
  notApplicable = false,
}: Props) {
  const cacheKey = `${barId ?? 'nobar'}|${weekId ?? 'noweek'}|${scoreKey}`;
  const [aiRequested, setAiRequested] = useState(false);

  // Reset opt-in when drawer closes so reopening doesn't auto-run
  useEffect(() => {
    if (!open) setAiRequested(false);
  }, [open]);

  const aiAvailable = !notApplicable && !stats.kdsEmpty && stats.tiles.length > 0;
  const aiEnabled = open && aiRequested && aiAvailable;

  const ai = useMetricInterpretation({
    enabled: aiEnabled,
    cacheKey,
    pillar: pillarLabel,
    metricLabel,
    scoreKey,
    gmName: gmName ?? null,
    venueName: venueName ?? null,
    weekStart: weekStart ?? null,
    tiles: stats.tiles,
    comparison: stats.comparison,
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground truncate">{metricLabel}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pillarLabel}
              {weekRange ? ` · Week of ${weekRange}` : ''}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-sm font-bold min-w-[44px] text-center',
              notApplicable ? 'bg-muted text-muted-foreground' : getScoreBadgeStyle(score),
            )}
          >
            {notApplicable ? 'N/A' : (score !== null ? Math.round(score) : '—')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-5 overflow-y-auto">
        {notApplicable ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Not applicable — this venue does not use a KDS workflow.
          </div>
        ) : stats.kdsEmpty ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No KDS data available for this period.
          </div>
        ) : (
          <>
            {/* Raw Numbers */}
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Raw Numbers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {stats.tiles.map((tile, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="text-[11px] text-muted-foreground leading-tight">{tile.label}</div>
                    <div className="text-base font-semibold text-foreground mt-0.5 tabular-nums">
                      {tile.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Comparison */}
            {stats.comparison && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Comparison
                </h3>
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2.5 flex items-center justify-between',
                    stats.comparison.isGood
                      ? 'border-signal-green/30 bg-signal-green/5'
                      : 'border-destructive/30 bg-destructive/5',
                  )}
                >
                  <span className="text-xs text-muted-foreground">{stats.comparison.fromTo}</span>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      stats.comparison.isGood ? 'text-signal-green' : 'text-destructive',
                    )}
                  >
                    {stats.comparison.pct >= 0 ? '+' : ''}
                    {stats.comparison.pct.toFixed(1)}%
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                      {stats.comparison.label}
                    </span>
                  </span>
                </div>
              </section>
            )}

            {/* AI Interpretation (opt-in) */}
            {aiAvailable && (
              <section>
                {!aiRequested ? (
                  <button
                    type="button"
                    onClick={() => setAiRequested(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    Get AI interpretation
                  </button>
                ) : (
                  <>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3 h-3 text-[#2DD4BF]" />
                      AI Interpretation
                      {ai.isStreaming && <Loader2 className="w-3 h-3 animate-spin" />}
                    </h3>
                    <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
                      {ai.text ? (
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {ai.text}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-3 rounded bg-muted animate-pulse" />
                          <div className="h-3 rounded bg-muted animate-pulse w-5/6" />
                          <div className="h-3 rounded bg-muted animate-pulse w-4/6" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

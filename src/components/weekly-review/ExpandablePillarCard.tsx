import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PillarMetricRow } from '@/components/shared/PillarMetricRow';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { PillarMetricConfig, resolveMetricTarget } from '@/config/pillarMetrics';
import { SupabaseWeekScorecard } from '@/hooks/useSupabaseWeekData';
import { WeeklyCore, ActionCard } from '@/types/venue';
import { PillarKPISnapshot } from '@/components/weekly-review/PillarKPISnapshot';
import { MetricDetailDrawer } from '@/components/weekly-review/MetricDetailDrawer';
import { DailyMetricRow } from '@/hooks/useDailyMetricsForWeek';
import { cn } from '@/lib/utils';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';
import { ChevronDown, ChevronRight, DollarSign, Users, Settings, Star } from 'lucide-react';
import { buildMetricStats } from '@/lib/metricStats';
import { isNoKdsVenue } from '@/config/noKdsVenues';

type PillarType = 'revenue' | 'labor' | 'operations' | 'guest';

interface ExpandablePillarCardProps {
  pillar: PillarType;
  pillarScore: number | undefined | null;
  scorecard: SupabaseWeekScorecard;
  metrics: PillarMetricConfig[];
  coreHistory: WeeklyCore[];
  actionCards: ActionCard[];
  currentCore?: Record<string, unknown> | null;
  previousCore?: Record<string, unknown> | null;
  onApprove?: (id: string, assigneeId?: string, barCode?: string, note?: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  processingIds: Set<string>;
  barCode?: string;
  dailyMetrics?: DailyMetricRow[];
  priorYearCore?: Record<string, unknown> | null;
  periodConfig?: Record<string, unknown> | null;
  // For metric-detail drawer
  barId?: string | null;
  weekId?: string | null;
  weekStart?: string | null;
  weekRange?: string | null;
  venueName?: string | null;
  gmName?: string | null;
}

const pillarConfig: Record<PillarType, { label: string; icon: React.ElementType; color: string; weight: string }> = {
  revenue: { label: 'Revenue', icon: DollarSign, color: 'text-signal-green', weight: '25%' },
  labor: { label: 'Labor', icon: Users, color: 'text-gold', weight: '20%' },
  operations: { label: 'Operations', icon: Settings, color: 'text-primary', weight: '20%' },
  guest: { label: 'Guest Experience', icon: Star, color: 'text-gold', weight: '35%' },
};

export const ExpandablePillarCard = ({
  pillar,
  pillarScore,
  scorecard,
  metrics,
  coreHistory: _coreHistory,
  actionCards,
  currentCore,
  previousCore,
  onApprove,
  onReject,
  processingIds,
  barCode,
  dailyMetrics: _dailyMetrics,
  priorYearCore,
  periodConfig,
  barId,
  weekId,
  weekStart,
  weekRange,
  venueName,
  gmName,
}: ExpandablePillarCardProps) => {
  const [open, setOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<PillarMetricConfig | null>(null);
  const config = pillarConfig[pillar];
  const Icon = config.icon;
  const score = pillarScore ?? null;
  const grade = score != null ? getGradeFromScore(score) : null;
  const gradeColor = grade ? getGradeColor(grade) : undefined;

  const sc = scorecard as unknown as Record<string, unknown>;

  const venueHasNoKds = isNoKdsVenue(barId);

  const signalDots = metrics.map(m => {
    if (venueHasNoKds && m.scoreKey === 'g5_score') return 'bg-muted';
    const s = sc[m.scoreKey];
    const val = typeof s === 'number' ? s : null;
    if (val === null) return 'bg-muted';
    if (val >= 80) return 'bg-signal-green';
    if (val >= 60) return 'bg-gold';
    return 'bg-destructive';
  });

  const activeStats = activeMetric
    ? buildMetricStats(activeMetric.scoreKey, {
        scorecard: sc,
        currentCore,
        priorYearCore,
        periodConfig,
        metric: activeMetric,
      })
    : null;
  const activeScore = activeMetric ? (sc[activeMetric.scoreKey] as number | null) : null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            'bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-primary/30 transition-all cursor-pointer',
            open && 'rounded-b-none border-b-0'
          )}>
            <div className="flex items-center gap-3">
              <Icon className={cn('w-5 h-5', config.color)} />
              <span className="font-semibold text-sm text-foreground">{config.label}</span>
              <span className="text-[10px] text-muted-foreground">{config.weight} weight</span>
              <div className="flex gap-1 ml-1">
                {signalDots.map((dot, i) => (
                  <div key={i} className={cn('w-2 h-2 rounded-full', dot)} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {score != null && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-foreground">{score}</span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: gradeColor }}
                  >
                    {grade}
                  </span>
                </div>
              )}
              <ChevronDown className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180'
              )} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-card border border-border border-t-0 rounded-b-xl p-4 space-y-6">
            {/* Key Metrics */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Key Metrics</h4>
              <div className="divide-y divide-border">
                {metrics.map(m => {
                  const resolved = resolveMetricTarget(m, priorYearCore, periodConfig);
                  const metricNA = venueHasNoKds && m.scoreKey === 'g5_score';
                  return (
                    <button
                      key={m.scoreKey}
                      type="button"
                      onClick={() => setActiveMetric(m)}
                      className="group w-full text-left -mx-2 px-2 rounded-md transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-stretch gap-1"
                      aria-label={`View details for ${m.label}`}
                    >
                      <div className="flex-1 min-w-0">
                        <PillarMetricRow
                          label={m.label}
                          actual={sc[m.actualKey]}
                          score={sc[m.scoreKey]}
                          format={m.format}
                          lowerIsBetter={m.lowerIsBetter}
                          unit={m.unit}
                          multiplyBy100={m.multiplyBy100}
                          resolvedTarget={resolved?.value}
                          targetLabel={resolved?.label}
                          notApplicable={metricNA}
                        />
                      </div>
                      <div className="flex items-center pl-1 text-muted-foreground">
                        <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {pillar === 'labor' && (
              <PillarKPISnapshot pillar={pillar} currentCore={currentCore || null} previousCore={previousCore || null} />
            )}

            {actionCards.length > 0 && (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Action Items ({actionCards.length})
                </h4>
                <div className="space-y-2">
                  {actionCards.slice(0, 3).map(card => (
                    <ExpandableActionCard
                      key={card.id}
                      card={card}
                      barCode={barCode}
                      onApprove={onApprove}
                      onReject={onReject}
                      isProcessing={processingIds.has(card.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {activeMetric && activeStats && (
        <MetricDetailDrawer
          open={!!activeMetric}
          onOpenChange={(o) => { if (!o) setActiveMetric(null); }}
          pillar={pillar}
          pillarLabel={config.label}
          metricLabel={activeMetric.label}
          scoreKey={activeMetric.scoreKey}
          score={typeof activeScore === 'number' ? activeScore : null}
          weekStart={weekStart}
          weekRange={weekRange}
          venueName={venueName}
          gmName={gmName}
          barId={barId}
          weekId={weekId}
          stats={activeStats}
          notApplicable={venueHasNoKds && activeMetric.scoreKey === 'g5_score'}
        />
      )}
    </>
  );
};

import { useMemo, ComponentType, ReactNode } from 'react';
import { useApp } from '@/context/AppContext';

import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { PillarMetricRow } from '@/components/shared/PillarMetricRow';
import { PillarMetricCard } from '@/components/shared/PillarMetricCard';
import { AlertsBlock } from '@/components/shared/AlertsBlock';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { PageScoreCard } from '@/components/shared/PageScoreCard';
import { ApprovedTasksModule } from '@/components/shared/ApprovedTasksModule';
import { Skeleton } from '@/components/ui/skeleton';

import { useActionItems } from '@/hooks/useActionItems';
import { useInsightApproval } from '@/hooks/useInsightApproval';
import { useSupabaseWeeks, useSupabaseWeeklyCores, SupabaseWeekScorecard } from '@/hooks/useSupabaseWeekData';
import { PillarMetricConfig } from '@/config/pillarMetrics';
import { useState, useEffect } from 'react';

type PillarName = 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience';

/** Maps pillar name to its score field on the scorecard */
const PILLAR_SCORE_KEY: Record<PillarName, keyof SupabaseWeekScorecard> = {
  'Revenue': 'revenue_score',
  'Labor': 'labor_score',
  'Operations': 'operations_score',
  'Guest Experience': 'guest_score',
};

interface PillarPageProps {
  pillar: PillarName;
  title: string;
  metrics: PillarMetricConfig[];
  ChartComponent: ComponentType<{ coreHistory: any[] }>;
  extraContent?: (context: { selectedWeek: any; selectedBar: any }) => ReactNode;
}

const PillarPage = ({
  pillar,
  title,
  metrics,
  ChartComponent,
  extraContent,
}: PillarPageProps) => {
  const { selectedBar, isLoading: appLoading, selectedWeek: airtableSelectedWeek, supabaseBarId } = useApp();

  // Fetch Supabase weeks + scorecards for current bar
  const barId = supabaseBarId || undefined;
  const { data: supabaseWeeks = [], isLoading: weeksLoading } = useSupabaseWeeks(barId);

  // Select the most recent week with a scorecard
  // Match Dashboard's week selection logic: use selectedWeek from AppContext
  const selectedSupabaseWeek = useMemo(() => {
    if (!airtableSelectedWeek) return supabaseWeeks[0] || null;
    return supabaseWeeks.find(w => w.week_start === airtableSelectedWeek.week_start) || supabaseWeeks[0] || null;
  }, [supabaseWeeks, airtableSelectedWeek]);

  const scorecard = selectedSupabaseWeek?.scorecard || null;

  // Get pillar score from scorecard
  const pillarScore = scorecard ? (scorecard[PILLAR_SCORE_KEY[pillar]] as number) || 0 : 0;

  // Action items
  const { data: allCards = [], isLoading: cardsLoading } = useActionItems();
  const { handleApprove, handleReject, processingIds } = useInsightApproval();

  const pillarCards = useMemo(() =>
    allCards.filter(c => c.pillar === pillar),
    [allCards, pillar]
  );
  const proposedCards = useMemo(() =>
    pillarCards.filter(c => c.approval_status === 'Proposed'),
    [pillarCards]
  );
  const approvedCards = useMemo(() =>
    pillarCards.filter(c => c.approval_status === 'Approved'),
    [pillarCards]
  );

  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    setVisibleCount(5);
  }, [selectedSupabaseWeek]);

  // Core history for charts (last 12 weeks)
  const coreHistoryWeekIds = useMemo(() => {
    return supabaseWeeks.slice(0, 12).map(w => w.id);
  }, [supabaseWeeks]);

  const { data: coreHistory = [], isLoading: coreHistoryLoading } = useSupabaseWeeklyCores(coreHistoryWeekIds);

  // Sort core history by week_start
  const sortedCoreHistory = useMemo(() => {
    if (!coreHistory.length || !supabaseWeeks.length) return [];
    const weekOrder = new Map(supabaseWeeks.map((w, i) => [w.id, i]));
    return [...coreHistory].sort((a, b) => {
      const aIdx = weekOrder.get(a.week_id) ?? 999;
      const bIdx = weekOrder.get(b.week_id) ?? 999;
      return aIdx - bIdx;
    });
  }, [coreHistory, supabaseWeeks]);

  if (appLoading || weeksLoading || cardsLoading) {
    return <LoadingState message={`Loading ${title.toLowerCase()} data...`} />;
  }

  if (!scorecard) {
    return (
      <EmptyState
        message={`No ${title.toLowerCase()} data available`}
        title="No scorecard data"
        description={`No weekly scorecard has been computed yet for this bar. Data will appear after the weekly scoring runs.`}
      />
    );
  }

  const visibleCards = proposedCards.slice(0, visibleCount);
  const remainingCount = proposedCards.length - visibleCount;
  const hasMore = remainingCount > 0;

  return (
    <>
      {/* Header with Score Card */}
      <div className="animate-fade-in-up">
        <PageScoreCard
          title={title}
          score={pillarScore}
          weekLabel={selectedSupabaseWeek?.week_start}
        />
      </div>

      {/* Two Column Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* KPIs */}
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <SectionHeader title="Key Metrics" />
            <PillarMetricCard>
              {metrics.map(m => (
                <PillarMetricRow
                  key={m.label}
                  label={m.label}
                  actual={scorecard[m.actualKey as keyof SupabaseWeekScorecard]}
                  score={scorecard[m.scoreKey as keyof SupabaseWeekScorecard]}
                  format={m.format}
                  lowerIsBetter={m.lowerIsBetter}
                  multiplyBy100={m.multiplyBy100}
                  unit={m.unit}
                />
              ))}
            </PillarMetricCard>
          </div>

          {/* Insight */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <SectionHeader title={`${title} Insight`} count={proposedCards.length} showInsightIcon />
            {proposedCards.length > 0 ? (
              <div className="space-y-3">
                {visibleCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${200 + index * 50}ms` }}
                  >
                    <ExpandableActionCard
                      card={card}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      isProcessing={processingIds.has(card.id)}
                    />
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="w-full py-3 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/30 font-medium transition-all duration-200 hover:ring-primary/50 active:scale-[0.98] touch-manipulation min-h-[48px]"
                  >
                    Show 5 more ({remainingCount} remaining)
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                message={`No pending ${title.toLowerCase()} actions`}
                title="All caught up!"
                description={`No pending ${title.toLowerCase()} actions right now.`}
              />
            )}
          </div>

          {/* Extra content (e.g. Guest Experience Secret Shop / Reviews) */}
          {extraContent?.({ selectedWeek: airtableSelectedWeek, selectedBar })}

          {/* Trend Charts */}
          <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            {coreHistoryLoading ? (
              <div className="mt-8 space-y-4">
                <Skeleton className="h-6 w-40 shimmer" />
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-[200px] w-full rounded-xl shimmer" />
                ))}
              </div>
            ) : sortedCoreHistory.length > 1 ? (
              <ChartComponent coreHistory={sortedCoreHistory} />
            ) : null}
          </div>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-4 md:space-y-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <ApprovedTasksModule cards={approvedCards} />
          </div>
        </div>
      </div>
    </>
  );
};

export default PillarPage;

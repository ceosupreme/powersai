import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { REVENUE_METRICS, LABOR_METRICS, OPERATIONS_METRICS, GUEST_METRICS, PillarMetricConfig, resolveMetricTarget, computeVariancePct } from '@/config/pillarMetrics';

import { MetricsCharts } from '@/components/dashboard/MetricsCharts';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { AlertsBlock } from '@/components/shared/AlertsBlock';
import { CompetitiveAnalysis } from '@/components/competitive/CompetitiveAnalysis';
import { ToastLiveWidget } from '@/components/shared/ToastLiveWidget';
import { DashboardScoreHero } from '@/components/dashboard/DashboardScoreHero';
import { DashboardPillarCard } from '@/components/dashboard/DashboardPillarCard';
import { DashboardBriefing } from '@/components/dashboard/DashboardBriefing';

import { useAlerts, useWeeklyCores } from '@/hooks/useVenueData';
import { useSupabaseWeeks, SupabaseWeekScorecard, usePeriodConfig, usePriorYearCore } from '@/hooks/useSupabaseWeekData';
import { useDailyMetricsForWeek } from '@/hooks/useDailyMetricsForWeek';
import { Skeleton } from '@/components/ui/skeleton';

// Maps canonical PillarMetricConfig[] to the format expected by DashboardPillarCard
function mapMetrics(
  configs: PillarMetricConfig[],
  scorecard: SupabaseWeekScorecard | null | undefined,
  priorYearCore: Record<string, unknown> | null | undefined,
  periodConfig: Record<string, unknown> | null | undefined,
) {
  if (!scorecard) return configs.map(c => ({ label: c.label, actual: undefined, target: undefined, score: undefined, format: (c.format === 'count' ? 'number' : c.format) as 'currency' | 'percent' | 'number' | 'rating', lowerIsBetter: c.lowerIsBetter, multiplyBy100: c.multiplyBy100 }));
  return configs.map(config => {
    const resolved = resolveMetricTarget(config, priorYearCore, periodConfig);
    return {
      label: config.label,
      actual: (scorecard as unknown as Record<string, unknown>)[config.actualKey] as number | undefined,
      target: undefined,
      score: (scorecard as unknown as Record<string, unknown>)[config.scoreKey] as number | undefined,
      format: (config.format === 'count' ? 'number' : config.format) as 'currency' | 'percent' | 'number' | 'rating',
      lowerIsBetter: config.lowerIsBetter,
      multiplyBy100: config.multiplyBy100,
      dailyBreakdownKey: config.dailyBreakdownKey,
      resolvedTarget: resolved?.value,
      targetLabel: resolved?.label,
    };
  });
}

const Dashboard = () => {
  const { selectedBar, selectedWeek, isLoading: appLoading, supabaseBarId } = useApp();

  // Fetch Supabase weeks + scorecards
  const { data: supabaseWeeks = [], isLoading: supabaseLoading } = useSupabaseWeeks(supabaseBarId || undefined);

  // Find the matching Supabase week. Must match exactly on week_start.
  // No silent fallback to supabaseWeeks[0] — that masks a real mismatch and
  // causes the "This Week's Briefing" card to render the empty state for
  // weeks that actually have a populated briefing on a different week row.
  const currentSupabaseWeek = useMemo(() => {
    if (!selectedWeek || !supabaseWeeks.length) return null;
    const match = supabaseWeeks.find(sw => sw.week_start === selectedWeek.week_start);
    if (!match) {
      console.warn(
        '[Dashboard] No supabaseWeeks row matches selectedWeek.week_start',
        {
          selectedWeekStart: selectedWeek.week_start,
          availableWeekStarts: supabaseWeeks.map(w => w.week_start),
          supabaseBarId,
        }
      );
    }
    return match || null;
  }, [selectedWeek, supabaseWeeks, supabaseBarId]);

  const scorecard = currentSupabaseWeek?.scorecard || null;

  // Fetch prior year core + period config for variance
  const { data: priorYearCore } = usePriorYearCore(supabaseBarId || undefined, currentSupabaseWeek?.week_start);
  const { data: periodConfig } = usePeriodConfig(supabaseBarId || undefined);

  // Fetch alerts from Supabase
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(supabaseBarId || undefined, selectedWeek?.id);

  // Fetch weekly core history from Supabase
  const { data: coreHistory = [], isLoading: coreHistoryLoading } = useWeeklyCores(supabaseBarId || undefined);

  // Fetch daily metrics for hover breakdowns
  const { data: dailyData } = useDailyMetricsForWeek(supabaseBarId, selectedWeek?.week_start, selectedWeek?.week_end);

  // Build metrics from Supabase scorecard
  const revenueMetrics = useMemo(() => mapMetrics(REVENUE_METRICS, scorecard, priorYearCore, periodConfig), [scorecard, priorYearCore, periodConfig]);
  const laborMetrics = useMemo(() => mapMetrics(LABOR_METRICS, scorecard, priorYearCore, periodConfig), [scorecard, priorYearCore, periodConfig]);
  const operationsMetrics = useMemo(() => mapMetrics(OPERATIONS_METRICS, scorecard, priorYearCore, periodConfig), [scorecard, priorYearCore, periodConfig]);
  const guestMetrics = useMemo(() => mapMetrics(GUEST_METRICS, scorecard, priorYearCore, periodConfig), [scorecard, priorYearCore, periodConfig]);

  if (appLoading || supabaseLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!selectedWeek) {
    return <EmptyState message="No week data available" title="No week data available" description="Select a bar and week from the header to view your dashboard." />;
  }

  return (
    <>
      {/* Score Hero Section - Uses Supabase scorecard */}
      <DashboardScoreHero
        overallScore={scorecard?.overall_score ?? 0}
        overallGrade={scorecard?.overall_grade || undefined}
        confidence={scorecard?.confidence != null ? (scorecard.confidence >= 80 ? 'High' : scorecard.confidence >= 50 ? 'Med' : 'Low') : 'Med'}
        trend={scorecard?.trend_4wk || 'flat'}
        weekStart={selectedWeek.week_start}
        barName={selectedBar?.bar_name}
      />

      {/* Monday Briefing Section */}
      <div className="mb-6 animate-fade-in-up stagger-1">
        <DashboardBriefing
          briefing={scorecard?.monday_briefing}
          wins={scorecard?.wins}
          keyDrivers={scorecard?.key_drivers}
        />
      </div>

      {/* Pillar Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in-up stagger-2">
        <DashboardPillarCard
          pillar="Revenue"
          pillarScore={scorecard?.revenue_score}
          metrics={revenueMetrics}
          path="/sales"
          dailyMetrics={dailyData}
        />
        <DashboardPillarCard
          pillar="Labor"
          pillarScore={scorecard?.labor_score}
          metrics={laborMetrics}
          path="/labor"
          dailyMetrics={dailyData}
        />
        <DashboardPillarCard
          pillar="Operations"
          pillarScore={scorecard?.operations_score}
          metrics={operationsMetrics}
          path="/operations"
          dailyMetrics={dailyData}
        />
        <DashboardPillarCard
          pillar="Guest Experience"
          pillarScore={scorecard?.guest_score}
          metrics={guestMetrics}
          path="/guest-experience"
          dailyMetrics={dailyData}
        />
      </div>

      {/* Alerts Section */}
      <div className="mb-6">
        {alertsLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <AlertsBlock alerts={alerts} />
        )}
      </div>

      {/* Toast Performance Module */}
      <section className="mb-6 animate-fade-in-up stagger-3">
        <ToastLiveWidget />
      </section>

      {/* Competitive Analysis Section */}
      {selectedWeek && supabaseBarId && (
        <div className="animate-fade-in-up stagger-4">
          <CompetitiveAnalysis
            barId={supabaseBarId}
            weekId={selectedWeek.id}
            weekStart={selectedWeek.week_start}
            weekEnd={selectedWeek.week_end}
          />
        </div>
      )}

      {/* Metrics Charts - Progressive loading */}
      {coreHistoryLoading ? (
        <Skeleton className="h-80 w-full mb-6 rounded-xl" />
      ) : coreHistory.length > 1 && (
        <div className="animate-fade-in-up stagger-5">
          <MetricsCharts coreHistory={coreHistory as any} />
        </div>
      )}
    </>
  );
};

export default Dashboard;

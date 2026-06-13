import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';

import { PageScoreCard } from '@/components/shared/PageScoreCard';
import { AlertsBlock } from '@/components/shared/AlertsBlock';

import { ApprovedTasksModule } from '@/components/shared/ApprovedTasksModule';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { PillarMetricRow } from '@/components/shared/PillarMetricRow';
import { PillarMetricCard } from '@/components/shared/PillarMetricCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScoreBreakdownCard } from '@/components/marketing/ScoreBreakdownCard';
import { AnalysisCard } from '@/components/marketing/AnalysisCard';
import { EventsCard } from '@/components/marketing/EventsCard';
import { PromotionsCard } from '@/components/marketing/PromotionsCard';
import { SocialActivityCard } from '@/components/marketing/SocialActivityCard';
import { MarketingCharts } from '@/components/charts/MarketingCharts';
import { useInsightApproval } from '@/hooks/useInsightApproval';
import {
  fetchWeeklyScorecardForWeek,
  fetchWeeklyScorecardsForBar,
  fetchAlerts,
  fetchMarketingEvents,
  fetchPromotions,
  fetchWeeklySocialMetrics,
  fetchSocialMediaPosts,
} from '@/services/supabaseData';
import { useActionItems } from '@/hooks/useActionItems';
import { format, parseISO } from 'date-fns';

const Marketing = () => {
  const { selectedWeek, selectedBar, supabaseBarId } = useApp();
  const [visibleCount, setVisibleCount] = useState(5);
  const { handleApprove, handleReject, processingIds } = useInsightApproval();

  useEffect(() => {
    setVisibleCount(5);
  }, [selectedWeek]);

  const barId = supabaseBarId || undefined;
  const weekId = selectedWeek?.id;

  // Fetch scorecard data from Supabase
  const { data: scorecard, isLoading: scorecardLoading } = useQuery({
    queryKey: ['weeklyScorecard', barId, weekId],
    queryFn: () => fetchWeeklyScorecardForWeek(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  // Fetch alerts for Marketing pillar
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', barId, weekId, 'Marketing'],
    queryFn: async () => {
      if (!barId) return [];
      const allAlerts = await fetchAlerts(barId, weekId);
      return allAlerts.filter((a: any) => a.pillar === 'Marketing');
    },
    enabled: !!barId,
  });

  // Fetch action items and filter for Marketing pillar
  const { data: allActionItems = [] } = useActionItems();
  const marketingActionItems = useMemo(() =>
    allActionItems.filter(item => item.pillar === 'Marketing'),
    [allActionItems]
  );
  const approvedMarketingTasks = useMemo(() =>
    marketingActionItems.filter(item => item.approval_status === 'Approved'),
    [marketingActionItems]
  );
  const proposedMarketingItems = useMemo(() =>
    marketingActionItems.filter(item => item.approval_status === 'Proposed'),
    [marketingActionItems]
  );

  // Fetch marketing events from Supabase
  const { data: marketingEvents = [] } = useQuery({
    queryKey: ['marketingEvents', barId, weekId],
    queryFn: () => fetchMarketingEvents(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  // Fetch promotions from Supabase
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', barId],
    queryFn: () => fetchPromotions(barId!),
    enabled: !!barId,
  });

  // Fetch social media metrics and posts from Supabase
  const { data: socialMetrics = [] } = useQuery({
    queryKey: ['socialMetrics', barId, weekId],
    queryFn: () => fetchWeeklySocialMetrics(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  const { data: socialPosts = [] } = useQuery({
    queryKey: ['socialPosts', barId, weekId],
    queryFn: () => fetchSocialMediaPosts(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  // Fetch historical scorecards from Supabase
  const { data: historicalScorecards = [] } = useQuery({
    queryKey: ['historicalScorecards', barId],
    queryFn: () => fetchWeeklyScorecardsForBar(barId!, 8),
    enabled: !!barId,
  });

  // Week label for display
  const weekLabel = selectedWeek?.week_start 
    ? format(parseISO(selectedWeek.week_start), 'MMM d') 
    : undefined;

  if (scorecardLoading) {
    return (
      <>
        <LoadingState message="Loading marketing data..." />
      </>
    );
  }

  // Calculate score and grade
  const score = (scorecard as any)?.marketing_score ?? 0;

  return (
    <>
      <div className="space-y-6 pb-8 md:pb-0">
        {/* Header with PageScoreCard */}
        <PageScoreCard
          title="Marketing"
          score={score}
          weekLabel={weekLabel}
          drivers={(scorecard as any)?.marketing_drivers}
        />

        {/* Alerts */}
        <AlertsBlock alerts={alerts} pillar="Marketing" />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scorecard Metrics */}
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Key Metrics</div>
              <PillarMetricCard>
                <PillarMetricRow 
                  label="Social Posts" 
                  actual={(scorecard as any)?.social_posts_count}
                  target={(scorecard as any)?.social_posts_target}
                  score={(scorecard as any)?.s1_score}
                  format="count"
                  unit="posts"
                />
                <PillarMetricRow 
                  label="Views per Post" 
                  actual={(scorecard as any)?.views_per_post}
                  score={(scorecard as any)?.s2_score}
                  format="number"
                  unit="views/post"
                  showTrendArrow
                />
                <PillarMetricRow 
                  label="Engagement" 
                  actual={(scorecard as any)?.total_interactions}
                  score={(scorecard as any)?.s3_score}
                  format="number"
                  unit="interactions"
                  showTrendArrow
                />
                <PillarMetricRow 
                  label="Marketing Effort" 
                  actual={null}
                  score={(scorecard as any)?.s4_score}
                  format="number"
                />
                <PillarMetricRow 
                  label="Marketing Results" 
                  actual={null}
                  score={(scorecard as any)?.s5_score}
                  format="number"
                />
              </PillarMetricCard>
            </div>

            {/* Score Breakdown */}
            {((scorecard as any)?.event_performance_score || (scorecard as any)?.social_media_score || 
              (scorecard as any)?.content_capture_score || (scorecard as any)?.promo_effectiveness_score) && (
              <ScoreBreakdownCard
                eventScore={(scorecard as any)?.event_performance_score}
                socialScore={(scorecard as any)?.social_media_score}
                contentScore={(scorecard as any)?.content_capture_score}
                promoScore={(scorecard as any)?.promo_effectiveness_score}
              />
            )}

            {/* Analysis */}
            {(scorecard as any)?.marketing_explanation && (
              <AnalysisCard explanation={(scorecard as any).marketing_explanation} />
            )}

            {/* Events */}
            {marketingEvents.length > 0 && (
              <EventsCard events={marketingEvents} />
            )}

            {/* Social Media Activity */}
            {(socialMetrics.length > 0 || socialPosts.length > 0) && (
              <SocialActivityCard metrics={socialMetrics} posts={socialPosts} />
            )}

            {/* Promotions */}
            {promotions.length > 0 && (
              <PromotionsCard promotions={promotions} />
            )}

            {/* Marketing Insights Section */}
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <SectionHeader title="Marketing Insight" count={proposedMarketingItems.length} showInsightIcon />
              {proposedMarketingItems.length > 0 ? (
                <div className="space-y-3">
                  {proposedMarketingItems.slice(0, visibleCount).map((item, index) => (
                    <div 
                      key={item.id} 
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${200 + index * 50}ms` }}
                    >
                      <ExpandableActionCard
                        card={item}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isProcessing={processingIds.has(item.id)}
                      />
                    </div>
                  ))}
                  
                  {proposedMarketingItems.length > visibleCount && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + 5)}
                      className="w-full py-3 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/30 font-medium transition-all duration-200 hover:ring-primary/50 active:scale-[0.98] touch-manipulation min-h-[48px]"
                    >
                      Show 5 more ({proposedMarketingItems.length - visibleCount} remaining)
                    </button>
                  )}
                </div>
              ) : (
                <EmptyState message="No pending marketing actions" title="All caught up!" description="No pending marketing actions right now." />
              )}
            </div>

            {/* Trend Chart */}
            <MarketingCharts
              scorecards={historicalScorecards as any}
              weeks={[]}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ApprovedTasksModule cards={approvedMarketingTasks} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Marketing;

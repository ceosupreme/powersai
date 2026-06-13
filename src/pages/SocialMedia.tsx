// DEAD CODE — retired bar-era social analytics page. /social-media now redirects to /marketing-hub in App.tsx.
// Left on disk as a breadcrumb; safe to delete in a later cleanup pass.
import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { useApp } from '@/context/AppContext';
import { FollowerSummaryCards } from '@/components/social/FollowerSummaryCards';
import { WeeklyPerformanceTable } from '@/components/social/WeeklyPerformanceTable';
import { TopPerformersCard } from '@/components/social/TopPerformersCard';
import { EngagementBreakdown } from '@/components/social/EngagementBreakdown';
import { RecentPostsGrid } from '@/components/social/RecentPostsGrid';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { 
  fetchSocialAccounts, 
  fetchWeeklySocialMetrics, 
  fetchSocialMediaPosts 
} from '@/services/supabaseData';

const SocialMedia = () => {
  const { selectedBar, selectedWeek, isLoading: appLoading, supabaseBarId } = useApp();

  const barId = supabaseBarId || undefined;
  const weekId = selectedWeek?.id;

  const { data: accounts = [] } = useQuery({
    queryKey: ['socialAccounts', barId],
    queryFn: () => fetchSocialAccounts(barId!),
    enabled: !!barId,
  });

  const { data: weeklyMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['socialMetrics', barId, weekId],
    queryFn: () => fetchWeeklySocialMetrics(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['socialPosts', barId, weekId],
    queryFn: () => fetchSocialMediaPosts(barId!, weekId!),
    enabled: !!barId && !!weekId,
  });

  const isLoading = metricsLoading || postsLoading;

  if (appLoading) {
    return (
      <>
        <LoadingState message="Loading..." />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <div className="p-2 md:p-2.5 bg-primary/10 rounded-xl">
            <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Marketing/Social</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Track weekly social performance across platforms
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading social media data..." />
        ) : (
          <>
            <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <FollowerSummaryCards accounts={accounts} metrics={weeklyMetrics} />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <WeeklyPerformanceTable metrics={weeklyMetrics} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <TopPerformersCard posts={posts} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <EngagementBreakdown metrics={weeklyMetrics} />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <RecentPostsGrid posts={posts} />
            </div>

            {weeklyMetrics.length === 0 && posts.length === 0 && (
              <EmptyState 
                message="No social data this week"
                title="No social data this week"
                description="Connect your social accounts or check back after data syncs."
                icon={<Smartphone className="w-6 h-6 text-muted-foreground" />}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default SocialMedia;

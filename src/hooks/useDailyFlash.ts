import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { format, subDays } from 'date-fns';
import { useMemo } from 'react';

export interface DailyFlashVenue {
  barId: string;
  barName: string;
  netSales: number | null;
  dailyRevenueTarget: number | null;
  revenueHit: boolean | null;
  laborPct: number | null;
  laborPctTarget: number | null;
  laborHit: boolean | null;
  compsPct: number | null;
  compsPctTarget: number | null;
  compsHit: boolean | null;
  alertCount: number;
  problemCount: number;
}

export function useDailyFlash() {
  const { accessibleBars } = useApp();
  const yesterday = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const barIds = useMemo(() => accessibleBars.map(b => b.id), [accessibleBars]);

  // Fetch yesterday's daily_metrics for all bars
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['daily-flash-metrics', yesterday],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_metrics')
        .select('bar_id, net_sales, labor_pct, comps_pct, synced_at')
        .eq('date', yesterday);
      return data || [];
    },
    enabled: barIds.length > 0,
  });

  // Fetch period_config targets for all venues (uses UUID bar_id)
  const { data: targetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ['daily-flash-period-config', yesterday],
    queryFn: async () => {
      const { data } = await supabase
        .from('period_config')
        .select('bar_id, weekly_net_sales_target, labor_pct_target, comps_pct_target, effective_start, effective_end')
        .lte('effective_start', yesterday)
        .or(`effective_end.is.null,effective_end.gte.${yesterday}`)
        .order('effective_start', { ascending: false });
      return data || [];
    },
    enabled: barIds.length > 0,
  });

  // Fetch pending action count
  const { data: pendingCount = 0, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-actions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('insight_cards')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'Proposed');
      return count || 0;
    },
  });

  // Fetch alert counts per bar
  const { data: alertCounts, isLoading: alertsLoading } = useQuery({
    queryKey: ['daily-flash-alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('insight_cards')
        .select('bar_id, severity')
        .in('severity', ['Critical', 'High']);
      const counts: Record<string, number> = {};
      (data || []).forEach(a => {
        counts[a.bar_id] = (counts[a.bar_id] || 0) + 1;
      });
      return counts;
    },
    enabled: barIds.length > 0,
  });

  const venues: DailyFlashVenue[] = useMemo(() => {
    if (!metricsData || !targetsData) return [];

    // daily_metrics uses bar_code strings; build a lookup by bar_code
    const metricsMap: Record<string, typeof metricsData[0]> = {};
    metricsData.forEach(m => { metricsMap[m.bar_id] = m; });

    // period_config uses UUID bar_id; build a lookup by UUID
    // Take the first (most recent) config per bar_id
    const targetsMap: Record<string, typeof targetsData[0]> = {};
    targetsData.forEach(t => {
      if (!targetsMap[t.bar_id]) targetsMap[t.bar_id] = t;
    });

    return accessibleBars.map(bar => {
      // accessibleBars has bar.id (UUID) and bar.bar_id (bar_code string)
      const metrics = metricsMap[bar.bar_id] || metricsMap[bar.id];
      const targets = targetsMap[bar.id]; // period_config uses UUID

      const netSales = metrics?.net_sales != null ? Number(metrics.net_sales) : null;
      const weeklyTarget = targets?.weekly_net_sales_target != null ? Number(targets.weekly_net_sales_target) : null;
      const dailyRevenueTarget = weeklyTarget != null ? weeklyTarget / 7 : null;
      const revenueHit = netSales != null && dailyRevenueTarget != null ? netSales >= dailyRevenueTarget : null;

      const laborPct = metrics?.labor_pct != null ? Number(metrics.labor_pct) : null;
      // period_config stores as decimal (0.25), daily_metrics stores as whole number (22.37)
      const laborPctTarget = targets?.labor_pct_target != null ? Number(targets.labor_pct_target) * 100 : null;
      const laborHit = laborPct != null && laborPctTarget != null ? laborPct <= laborPctTarget : null;

      const compsPct = metrics?.comps_pct != null ? Number(metrics.comps_pct) : null;
      const compsPctTarget = targets?.comps_pct_target != null ? Number(targets.comps_pct_target) * 100 : null;
      const compsHit = compsPct != null && compsPctTarget != null ? compsPct <= compsPctTarget : null;

      const alerts = alertCounts?.[bar.id] || 0;
      let problemCount = 0;
      if (revenueHit === false) problemCount++;
      if (laborHit === false) problemCount++;
      if (compsHit === false) problemCount++;

      return {
        barId: bar.id,
        barName: bar.bar_name,
        netSales,
        dailyRevenueTarget,
        revenueHit,
        laborPct,
        laborPctTarget,
        laborHit,
        compsPct,
        compsPctTarget,
        compsHit,
        alertCount: alerts,
        problemCount,
      };
    }).sort((a, b) => b.problemCount - a.problemCount);
  }, [accessibleBars, metricsData, targetsData, alertCounts]);

  const lastUpdated = useMemo(() => {
    if (!metricsData || metricsData.length === 0) return null;
    const latest = metricsData
      .filter(m => m.synced_at)
      .sort((a, b) => new Date(b.synced_at!).getTime() - new Date(a.synced_at!).getTime())[0];
    return latest?.synced_at || null;
  }, [metricsData]);

  const hitCount = venues.filter(v => v.problemCount === 0 && (v.revenueHit != null)).length;
  const missCount = venues.filter(v => v.problemCount > 0).length;

  return {
    venues,
    pendingCount,
    yesterday,
    lastUpdated,
    hitCount,
    missCount,
    isLoading: metricsLoading || targetsLoading || pendingLoading || alertsLoading,
  };
}

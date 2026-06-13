import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { startOfWeek, endOfWeek, format, isToday } from 'date-fns';

export interface TodayMetric {
  label: string;
  value: number | null;
  target: number | null;
  status: 'beat' | 'miss' | 'over' | 'close';
  formatType: 'currency' | 'percent' | 'minutes';
}

export interface GMLogStats {
  todayCompleted: boolean;
  weekCount: number;
  weekTarget: number;
}

export interface TaskDue {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
}

function computeStatus(
  value: number | null,
  target: number | null,
  lowerIsBetter: boolean
): 'beat' | 'miss' | 'over' | 'close' {
  if (value == null || target == null || target === 0) return 'miss';
  const ratio = value / target;
  if (lowerIsBetter) {
    if (ratio <= 1) return 'beat';
    if (ratio <= 1.02) return 'close';
    return 'over';
  }
  if (ratio >= 1) return 'beat';
  if (ratio >= 0.98) return 'close';
  return 'miss';
}

export const useWeeklyReviewData = () => {
  const { supabaseBarId } = useApp();

  // First resolve bar_code from venues table for daily_metrics queries
  const barCodeQuery = useQuery({
    queryKey: ['bar-code', supabaseBarId],
    queryFn: async () => {
      if (!supabaseBarId) return null;
      const { data } = await supabase
        .from('venues')
        .select('bar_code')
        .eq('id', supabaseBarId)
        .maybeSingle();
      return data?.bar_code || null;
    },
    enabled: !!supabaseBarId,
    staleTime: 10 * 60 * 1000,
  });

  const barCode = barCodeQuery.data;

  // Today's metrics from daily_metrics (uses bar_code) + period_config (uses UUID)
  const metricsQuery = useQuery({
    queryKey: ['weekly-review-metrics', barCode, supabaseBarId],
    queryFn: async () => {
      if (!barCode || !supabaseBarId) return null;

      const today = format(new Date(), 'yyyy-MM-dd');

      const [metricsRes, periodRes] = await Promise.all([
        supabase
          .from('daily_metrics')
          .select('net_sales, labor_pct, splh, tip_pct, avg_turn_time_mins, date')
          .eq('bar_id', barCode)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('period_config')
          .select('*')
          .eq('bar_id', supabaseBarId)
          .lte('effective_start', today)
          .or(`effective_end.is.null,effective_end.gte.${today}`)
          .order('effective_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const metrics = metricsRes.data;
      const targets = periodRes.data;

      const dailySalesTarget = targets?.weekly_net_sales_target
        ? Number(targets.weekly_net_sales_target) / 7
        : null;

      // period_config stores decimals (0.25 = 25%), daily_metrics stores whole numbers (22.37 = 22.37%)
      // Convert period_config to whole numbers for comparison
      const laborTarget = targets?.labor_pct_target != null ? Number(targets.labor_pct_target) * 100 : null;
      const tipTarget = targets?.tip_pct_target != null ? Number(targets.tip_pct_target) * 100 : null;
      const splhTarget = targets?.splh_target != null ? Number(targets.splh_target) : null;
      const turnTimeTarget = targets?.turn_time_target_min != null ? Number(targets.turn_time_target_min) : 20;

      const todayMetrics: TodayMetric[] = [
        {
          label: 'Net Sales',
          value: metrics?.net_sales ? Number(metrics.net_sales) : null,
          target: dailySalesTarget,
          status: computeStatus(metrics?.net_sales ? Number(metrics.net_sales) : null, dailySalesTarget, false),
          formatType: 'currency',
        },
        {
          label: 'Labor %',
          value: metrics?.labor_pct ? Number(metrics.labor_pct) : null,
          target: laborTarget,
          status: computeStatus(metrics?.labor_pct ? Number(metrics.labor_pct) : null, laborTarget, true),
          formatType: 'percent',
        },
        {
          label: 'SPLH',
          value: metrics?.splh ? Number(metrics.splh) : null,
          target: splhTarget,
          status: computeStatus(metrics?.splh ? Number(metrics.splh) : null, splhTarget, false),
          formatType: 'currency',
        },
        {
          label: 'Tip %',
          value: metrics?.tip_pct ? Number(metrics.tip_pct) : null,
          target: tipTarget,
          status: computeStatus(metrics?.tip_pct ? Number(metrics.tip_pct) : null, tipTarget, false),
          formatType: 'percent',
        },
        {
          label: 'Avg Ticket Time',
          value: metrics?.avg_turn_time_mins ? Number(metrics.avg_turn_time_mins) : null,
          target: turnTimeTarget,
          status: computeStatus(metrics?.avg_turn_time_mins ? Number(metrics.avg_turn_time_mins) : null, turnTimeTarget, true),
          formatType: 'minutes',
        },
      ];

      return { todayMetrics, metricsDate: metrics?.date || null };
    },
    enabled: !!barCode && !!supabaseBarId,
  });

  // GM Log completion this week (uses UUID)
  const logQuery = useQuery({
    queryKey: ['weekly-review-gm-logs', supabaseBarId],
    queryFn: async (): Promise<GMLogStats> => {
      if (!supabaseBarId) return { todayCompleted: false, weekCount: 0, weekTarget: 6 };

      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data: logs } = await supabase
        .from('log_entries')
        .select('created_at')
        .eq('bar_id', supabaseBarId)
        .eq('log_type', 'gm_log')
        .gte('created_at', weekStart + 'T00:00:00');

      const weekCount = logs?.length || 0;
      const todayCompleted = logs?.some(l => isToday(new Date(l.created_at))) || false;

      return { todayCompleted, weekCount, weekTarget: 6 };
    },
    enabled: !!supabaseBarId,
  });

  // Tasks due this week
  const tasksQuery = useQuery({
    queryKey: ['weekly-review-tasks', supabaseBarId, barCode],
    queryFn: async () => {
      if (!supabaseBarId && !barCode) return { tasksDue: [] as TaskDue[], overdueCount: 0 };

      const now = new Date();
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const today = format(now, 'yyyy-MM-dd');

      const barIdForTasks = barCode || supabaseBarId || '';

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, priority')
        .eq('bar_id', barIdForTasks)
        .neq('status', 'Done')
        .lte('due_date', weekEnd)
        .order('due_date', { ascending: true })
        .limit(6);

      const tasksDue: TaskDue[] = (tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        status: t.status,
        priority: t.priority,
      }));

      const overdueCount = tasksDue.filter(
        t => t.due_date && t.due_date < today
      ).length;

      return { tasksDue, overdueCount };
    },
    enabled: !!(supabaseBarId || barCode),
  });

  return {
    todayMetrics: metricsQuery.data?.todayMetrics || [],
    metricsDate: metricsQuery.data?.metricsDate || null,
    gmLogStats: logQuery.data || { todayCompleted: false, weekCount: 0, weekTarget: 6 },
    tasksDue: tasksQuery.data?.tasksDue || [],
    overdueCount: tasksQuery.data?.overdueCount || 0,
    isLoading: barCodeQuery.isLoading || metricsQuery.isLoading || logQuery.isLoading || tasksQuery.isLoading,
  };
};

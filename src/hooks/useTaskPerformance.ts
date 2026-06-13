import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskPerformanceCurrent {
  assigned: number;
  completed: number;
  inRed: number;
  openBacklog: number | null;
  resolutionRate: number | null; // 0-1
  onTimeRate: number | null;     // 0-1
  totalAssigned: number | null;        // cumulative as of week_end
  totalOutstanding: number | null;     // open as of week_end
  completedThisWeek: number | null;    // closed during week
}

export interface TaskPerformanceTrendPoint {
  weekStart: string;
  resolutionRate: number | null; // 0-1
}

interface CoreLike extends Record<string, unknown> {
  bar_id?: string;
  week_id?: string;
  tasks_due?: number | null;
  tasks_completed?: number | null;
  tasks_in_red?: number | null;
  tasks_on_time?: number | null;
  tasks_open_backlog?: number | null;
  tasks_status?: string | null;
  task_completion_pct?: number | null;
  on_time_rate?: number | null;
  tasks_total_assigned?: number | null;
  tasks_total_outstanding?: number | null;
  tasks_completed_this_week?: number | null;
}

interface WeekLike {
  id: string;
  bar_id: string;
  week_start: string;
  week_end: string;
}

interface UseTaskPerformanceArgs {
  supabaseBarId: string | undefined | null;
  currentWeek: WeekLike | null;
  weeklyCores: CoreLike[];
  supabaseWeeks: WeekLike[];
  venueName?: string;
  gmName?: string;
}

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useTaskPerformance({
  supabaseBarId,
  currentWeek,
  weeklyCores,
  supabaseWeeks,
  venueName,
  gmName,
}: UseTaskPerformanceArgs) {
  const coreByWeek = useMemo(() => {
    const m = new Map<string, CoreLike>();
    for (const c of weeklyCores) {
      if (c.week_id && (!supabaseBarId || c.bar_id === supabaseBarId)) {
        m.set(c.week_id as string, c);
      }
    }
    return m;
  }, [weeklyCores, supabaseBarId]);

  const currentCore = currentWeek ? coreByWeek.get(currentWeek.id) || null : null;

  // Sort weeks newest → oldest
  const sortedWeeks = useMemo(
    () => [...supabaseWeeks].sort((a, b) => b.week_start.localeCompare(a.week_start)),
    [supabaseWeeks]
  );

  const currentIdx = currentWeek
    ? sortedWeeks.findIndex(w => w.id === currentWeek.id)
    : -1;

  const previousWeek = currentIdx >= 0 ? sortedWeeks[currentIdx + 1] : undefined;
  const previousCore = previousWeek ? coreByWeek.get(previousWeek.id) || null : null;

  // Last 4 weeks ending at current (chronological order, oldest → newest)
  const trend4: TaskPerformanceTrendPoint[] = useMemo(() => {
    if (currentIdx < 0) return [];
    const slice = sortedWeeks.slice(currentIdx, currentIdx + 4).reverse(); // oldest first
    return slice.map(w => {
      const c = coreByWeek.get(w.id);
      return {
        weekStart: w.week_start,
        resolutionRate: num(c?.task_completion_pct),
      };
    });
  }, [sortedWeeks, currentIdx, coreByWeek]);

  const current: TaskPerformanceCurrent = useMemo(() => ({
    assigned: num(currentCore?.tasks_due) ?? 0,
    completed: num(currentCore?.tasks_completed) ?? 0,
    inRed: num(currentCore?.tasks_in_red) ?? 0,
    openBacklog: num(currentCore?.tasks_open_backlog),
    resolutionRate: num(currentCore?.task_completion_pct),
    onTimeRate: num(currentCore?.on_time_rate),
    totalAssigned: num(currentCore?.tasks_total_assigned),
    totalOutstanding: num(currentCore?.tasks_total_outstanding),
    completedThisWeek: num(currentCore?.tasks_completed_this_week),
  }), [currentCore]);

  const previous = useMemo(() => ({
    resolutionRate: num(previousCore?.task_completion_pct),
  }), [previousCore]);

  const tasksStatus = (currentCore?.tasks_status as string | undefined) ?? null;
  const isGmNotMapped = tasksStatus === 'gm_not_mapped';

  // Ready to render data when we have a core row AND a mapped GM AND there is
  // any tracked workload (cumulative or this week). Falls back to legacy
  // tasks_due signal until backfill lands.
  const isReady = !!currentCore && !isGmNotMapped && (
    (current.totalAssigned ?? 0) > 0 || current.assigned > 0
  );

  // AI brief
  const [shortBrief, setShortBrief] = useState<string>('');
  const [longBrief, setLongBrief] = useState<string>('');
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);

  useEffect(() => {
    if (!isReady || !supabaseBarId || !currentWeek) {
      setShortBrief('');
      setLongBrief('');
      return;
    }

    let cancelled = false;
    setIsLoadingBrief(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-task-performance-brief', {
          body: {
            barId: supabaseBarId,
            weekId: currentWeek.id,
            venueName,
            gmName,
            current,
            previous,
            trend4,
          },
        });
        if (cancelled) return;
        if (error) {
          console.warn('[useTaskPerformance] brief error', error);
          setShortBrief('');
          setLongBrief('');
        } else {
          setShortBrief((data?.short_brief as string) || '');
          setLongBrief((data?.long_brief as string) || '');
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[useTaskPerformance] brief invoke failed', e);
          setShortBrief('');
          setLongBrief('');
        }
      } finally {
        if (!cancelled) setIsLoadingBrief(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isReady, supabaseBarId, currentWeek?.id, venueName, gmName,
      current.assigned, current.completed, current.inRed,
      current.resolutionRate, current.onTimeRate,
      current.totalAssigned, current.totalOutstanding, current.completedThisWeek,
      previous.resolutionRate, trend4]);

  return {
    current,
    previous,
    trend4,
    shortBrief,
    longBrief,
    isReady,
    isLoadingBrief,
    isGmNotMapped,
    tasksStatus,
  };
}

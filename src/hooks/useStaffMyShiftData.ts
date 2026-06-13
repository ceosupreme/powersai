import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useRole } from '@/context/RoleContext';
import { startOfWeek, startOfDay, format, addDays, subWeeks } from 'date-fns';

interface ShiftUpdate {
  icon: string;
  text: string;
}

interface StaffTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  estimated_minutes: number | null;
  priority: string;
}

interface MyStats {
  sales: number;
  salesChange: number;
  tips: number;
  tipsStatus: string;
  tipPercent: number;
  avgTipPercent: number;
  hours: number;
  hoursStatus: string;
}

interface Recognition {
  text: string;
  link: string | null;
  linkLabel: string | null;
}

interface ScheduleDay {
  date: Date;
  off: boolean;
  start?: string;
  end?: string;
  isDouble?: boolean;
}

export function useStaffMyShiftData() {
  const { user, profile } = useAuth();
  const { selectedBar } = useApp();
  const { currentRole } = useRole();
  const barId = selectedBar?.id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Shift updates: 86 items from latest lead log + critical insights
  const { data: shiftUpdates } = useQuery({
    queryKey: ['staff-shift-updates', barId],
    queryFn: async () => {
      if (!barId) return { items86: [] as string[], updates: [] as ShiftUpdate[], equipmentAlerts: [] as string[] };

      const items86: string[] = [];
      const updates: ShiftUpdate[] = [];
      const equipmentAlerts: string[] = [];

      // Get latest lead log for 86 items
      const { data: logEntry } = await supabase
        .from('log_entries')
        .select('id')
        .eq('bar_id', barId)
        .eq('log_type', 'lead_log')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logEntry) {
        const { data: values } = await supabase
          .from('log_entry_values')
          .select('value_json')
          .eq('log_entry_id', logEntry.id);

        values?.forEach((v) => {
          const val = v.value_json as any;
          if (!val) return;
          const text = typeof val === 'string' ? val : val?.text || val?.description || '';
          if (text && typeof text === 'string') {
            const lower = text.toLowerCase();
            if (lower.includes('86') || lower.includes('out of')) {
              items86.push(text);
            } else if (lower.includes('maintenance') || lower.includes('broken') || lower.includes('repair')) {
              equipmentAlerts.push(text);
            }
          }
        });
      }

      // Critical/High insights
      const { data: insights } = await supabase
        .from('insight_cards')
        .select('title, severity')
        .eq('bar_id', barId)
        .in('severity', ['Critical', 'High'])
        .eq('approval_status', 'Proposed')
        .limit(3);

      insights?.forEach((i) => {
        updates.push({
          icon: i.severity === 'Critical' ? '⚠️' : '📝',
          text: i.title,
        });
      });

      return { items86, updates, equipmentAlerts };
    },
    enabled: !!barId,
  });

  // My tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['staff-my-tasks', barId, userId],
    queryFn: async (): Promise<StaffTask[]> => {
      if (!barId || !userId) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, estimated_minutes, priority')
        .eq('bar_id', barId)
        .eq('assignee_id', userId)
        .neq('status', 'Done')
        .order('due_date', { ascending: true })
        .limit(10);
      return (data || []) as StaffTask[];
    },
    enabled: !!barId && !!userId,
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Done' as const, completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-my-tasks'] });
    },
  });

  // My stats (FOH only) — with real WoW salesChange
  const { data: myStats = null } = useQuery({
    queryKey: ['staff-my-stats', barId, currentRole],
    queryFn: async (): Promise<MyStats | null> => {
      if (!barId || currentRole === 'boh') return null;

      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      const priorWeekStart = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
      const priorWeekEnd = format(addDays(subWeeks(weekStart, 1), 6), 'yyyy-MM-dd');

      // Fetch current + prior week in parallel
      const [currentRes, priorRes] = await Promise.all([
        supabase
          .from('daily_metrics')
          .select('net_sales, tips, tip_pct, labor_hours')
          .eq('bar_id', barId)
          .gte('date', weekStartStr)
          .lte('date', todayStr),
        supabase
          .from('daily_metrics')
          .select('net_sales')
          .eq('bar_id', barId)
          .gte('date', priorWeekStart)
          .lte('date', priorWeekEnd),
      ]);

      const data = currentRes.data;
      if (!data || data.length === 0) return null;

      const totalSales = data.reduce((s, d) => s + (Number(d.net_sales) || 0), 0);
      const totalTips = data.reduce((s, d) => s + (Number(d.tips) || 0), 0);
      const avgTipPct = data.reduce((s, d) => s + (Number(d.tip_pct) || 0), 0) / data.length;
      const totalHours = data.reduce((s, d) => s + (Number(d.labor_hours) || 0), 0);

      // Calculate real WoW sales change
      const priorSales = (priorRes.data || []).reduce((s, d) => s + (Number(d.net_sales) || 0), 0);
      const salesChange = priorSales > 0 ? ((totalSales - priorSales) / priorSales) * 100 : 0;

      return {
        sales: totalSales,
        salesChange: Math.round(salesChange * 10) / 10,
        tips: totalTips,
        tipsStatus: 'This week',
        tipPercent: avgTipPct,
        avgTipPercent: 0.18,
        hours: Math.round(totalHours),
        hoursStatus: 'Scheduled',
      };
    },
    enabled: !!barId && currentRole !== 'boh',
  });

  // Recognition - check for shoutouts mentioning user
  const { data: recognition = null } = useQuery({
    queryKey: ['staff-recognition', barId, userId],
    queryFn: async (): Promise<Recognition | null> => {
      if (!barId || !userId || !profile?.full_name) return null;

      const { data: recentLogs } = await supabase
        .from('log_entries')
        .select('id, created_by')
        .eq('bar_id', barId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (!recentLogs || recentLogs.length === 0) return null;

      for (const log of recentLogs) {
        const { data: values } = await supabase
          .from('log_entry_values')
          .select('value_json')
          .eq('log_entry_id', log.id);

        for (const v of values || []) {
          const val = v.value_json as any;
          const text = typeof val === 'string' ? val : val?.text || val?.description || '';
          if (typeof text === 'string' && text.toLowerCase().includes('shoutout') && text.toLowerCase().includes(profile.full_name!.toLowerCase().split(' ')[0])) {
            const { data: author } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', log.created_by)
              .single();
            return {
              text: `${author?.full_name || 'A manager'} gave you a shoutout: "${text.slice(0, 120)}"`,
              link: null,
              linkLabel: null,
            };
          }
        }
      }
      return null;
    },
    enabled: !!barId && !!userId && !!profile?.full_name,
  });

  // Schedule from 7shifts
  const { data: mySchedule = [] } = useQuery({
    queryKey: ['staff-schedule-7shifts', barId, userId],
    queryFn: async (): Promise<ScheduleDay[]> => {
      if (!barId || !userId || !profile?.email) return getEmptySchedule(weekStart);

      try {
        // Get bar's 7shifts location_id
        const { data: barRecord } = await supabase
          .from('venues')
          .select('seven_shifts_location_id')
          .eq('id', barId)
          .maybeSingle();

        const locationId = (barRecord as any)?.seven_shifts_location_id || undefined;

        const weekEndDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const { data, error } = await supabase.functions.invoke('seven-shifts-proxy', {
          body: {
            action: 'shifts',
            params: { start: weekStartStr, end: weekEndDate, location_id: locationId },
          },
        });

        if (error || !data?.data) {
          console.warn('7shifts shifts fetch failed, showing empty schedule:', error);
          return getEmptySchedule(weekStart);
        }

        // Build schedule from shifts — match by user email in a best-effort way
        // First get users to find our 7shifts user_id
        const usersRes = await supabase.functions.invoke('seven-shifts-proxy', {
          body: { action: 'users', params: { status: 'active' } },
        });

        const users = usersRes.data?.data || [];
        const myUser = users.find((u: any) =>
          u.email?.toLowerCase() === profile.email?.toLowerCase()
        );

        const shifts = data.data || [];
        const myShifts = myUser
          ? shifts.filter((s: any) => s.user_id === myUser.id)
          : [];

        // Map to ScheduleDay for each day of the week
        const schedule: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayShifts = myShifts.filter((s: any) =>
            s.start?.startsWith(dateStr)
          );

          if (dayShifts.length === 0) {
            return { date, off: true };
          }

          // Sort by start time
          dayShifts.sort((a: any, b: any) => a.start.localeCompare(b.start));

          const firstStart = dayShifts[0].start;
          const lastEnd = dayShifts[dayShifts.length - 1].end;

          return {
            date,
            off: false,
            start: firstStart ? new Date(firstStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
            end: lastEnd ? new Date(lastEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
            isDouble: dayShifts.length > 1,
          };
        });

        return schedule;
      } catch (err) {
        console.warn('7shifts schedule error:', err);
        return getEmptySchedule(weekStart);
      }
    },
    enabled: !!barId && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    items86: shiftUpdates?.items86 || [],
    shiftUpdatesList: shiftUpdates?.updates || [],
    equipmentAlerts: shiftUpdates?.equipmentAlerts || [],
    myTasks,
    completeTask: completeTask.mutate,
    myStats,
    recognition,
    mySchedule,
    firstName: profile?.full_name?.split(' ')[0] || 'there',
    isFoh: currentRole === 'foh',
  };
}

function getEmptySchedule(weekStart: Date): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    off: true,
  }));
}

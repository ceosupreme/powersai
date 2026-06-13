import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { startOfWeek, endOfWeek, startOfDay, isBefore, isToday, format } from 'date-fns';

interface HandoffData {
  logId: string;
  leadName: string;
  submittedAt: string;
  summary: string;
  items86: string[];
  maintenance: string[];
  incidents: string[];
  shoutouts: string[];
}

interface WatchItem {
  severity: 'critical' | 'high' | 'medium';
  text: string;
}

interface ShiftTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  estimated_minutes: number | null;
  priority: string;
}

interface StaffAlert {
  staffName: string;
  message: string;
}

export function useShiftDashboardData() {
  const { user } = useAuth();
  const { selectedBar } = useApp();
  const barId = selectedBar?.id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Handoff from previous shift
  const { data: handoff, isLoading: handoffLoading } = useQuery({
    queryKey: ['shift-handoff', barId, userId],
    queryFn: async (): Promise<HandoffData | null> => {
      if (!barId || !userId) return null;

      const { data: logEntry } = await supabase
        .from('log_entries')
        .select('id, submitted_at, created_by')
        .eq('bar_id', barId)
        .eq('log_type', 'lead_log')
        .eq('status', 'submitted')
        .neq('created_by', userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (!logEntry) return null;

      // Fetch profile and values in parallel
      const [profileRes, valuesRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', logEntry.created_by).single(),
        supabase.from('log_entry_values').select('value_json').eq('log_entry_id', logEntry.id),
      ]);

      const values = valuesRes.data || [];
      const items86: string[] = [];
      const maintenance: string[] = [];
      const incidents: string[] = [];
      const shoutouts: string[] = [];
      let summary = '';

      for (const v of values) {
        const val = v.value_json as any;
        if (!val) continue;
        const text = typeof val === 'string' ? val : val?.text || val?.description || val?.name || '';
        // Try to categorize by content patterns
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val)) {
            val.forEach((item: any) => {
              const itemText = typeof item === 'string' ? item : item?.text || item?.description || item?.name || JSON.stringify(item);
              if (itemText) summary += itemText + '. ';
            });
          }
        }
        if (text && typeof text === 'string') {
          summary += text + '. ';
        }
      }

      return {
        logId: logEntry.id,
        leadName: profileRes.data?.full_name || 'Unknown',
        submittedAt: logEntry.submitted_at || '',
        summary: summary.slice(0, 200) || 'Shift log submitted with no summary.',
        items86,
        maintenance,
        incidents,
        shoutouts,
      };
    },
    enabled: !!barId && !!userId,
  });

  // Watch items
  const { data: watchItems = [] } = useQuery({
    queryKey: ['shift-watch', barId],
    queryFn: async (): Promise<WatchItem[]> => {
      if (!barId) return [];
      const items: WatchItem[] = [];

      // Critical/High insights
      const { data: insights } = await supabase
        .from('insight_cards')
        .select('title, severity')
        .eq('bar_id', barId)
        .in('severity', ['Critical', 'High'])
        .eq('approval_status', 'Proposed')
        .limit(5);

      insights?.forEach((i) => {
        items.push({
          severity: i.severity === 'Critical' ? 'critical' : 'high',
          text: i.title,
        });
      });

      // Check labor overage
      const todayStr = format(today, 'yyyy-MM-dd');
      const [metricsRes, targetsRes] = await Promise.all([
        supabase.from('daily_metrics').select('labor_pct').eq('bar_id', barId).eq('date', todayStr).maybeSingle(),
        supabase.from('bar_targets').select('labor_pct_target').eq('bar_id', barId).maybeSingle(),
      ]);

      const laborPct = metricsRes.data?.labor_pct;
      const laborTarget = targetsRes.data?.labor_pct_target;
      if (laborPct && laborTarget && laborPct > laborTarget) {
        items.push({
          severity: 'medium',
          text: `Labor at ${(laborPct * 100).toFixed(1)}% — target is ${(laborTarget * 100).toFixed(1)}%. Send home early if slow.`,
        });
      }

      return items;
    },
    enabled: !!barId,
  });

  // My tasks
  const { data: myTasksData } = useQuery({
    queryKey: ['shift-tasks', barId, userId],
    queryFn: async () => {
      if (!barId || !userId) return { overdue: [] as ShiftTask[], todayTasks: [] as ShiftTask[] };

      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, estimated_minutes, priority')
        .eq('bar_id', barId)
        .eq('assignee_id', userId)
        .neq('status', 'Done')
        .order('due_date', { ascending: true })
        .limit(10);

      const tasks = (data || []) as ShiftTask[];
      const overdue = tasks.filter(
        (t) => t.due_date && isBefore(new Date(t.due_date), today) && !isToday(new Date(t.due_date))
      );
      const todayTasks = tasks.filter(
        (t) => t.due_date && isToday(new Date(t.due_date))
      );
      // Include tasks without due dates or due later this week
      const otherTasks = tasks.filter(
        (t) => !overdue.includes(t) && !todayTasks.includes(t)
      );

      return { overdue, todayTasks: [...todayTasks, ...otherTasks] };
    },
    enabled: !!barId && !!userId,
  });

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Done' as const, completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-tasks'] });
    },
  });

  // Lead log completion today
  const { data: leadLogDone = false } = useQuery({
    queryKey: ['shift-lead-log', barId, userId],
    queryFn: async () => {
      if (!barId || !userId) return false;
      const todayStr = format(today, 'yyyy-MM-dd');
      const { count } = await supabase
        .from('log_entries')
        .select('*', { count: 'exact', head: true })
        .eq('bar_id', barId)
        .eq('created_by', userId)
        .eq('log_type', 'lead_log')
        .gte('created_at', todayStr);
      return (count || 0) > 0;
    },
    enabled: !!barId && !!userId,
  });

  // Shift roster from 7shifts
  const { data: shiftStaff = { foh: [], boh: [] } } = useQuery({
    queryKey: ['shift-staff-7shifts', barId],
    queryFn: async () => {
      if (!barId) return { foh: [] as string[], boh: [] as string[] };

      try {
        // Get bar's 7shifts location_id
        const { data: barRecord } = await supabase
          .from('venues')
          .select('seven_shifts_location_id')
          .eq('id', barId)
          .maybeSingle();

        const locationId = (barRecord as any)?.seven_shifts_location_id || undefined;

        const todayStr = format(today, 'yyyy-MM-dd');
        const { data, error } = await supabase.functions.invoke('seven-shifts-proxy', {
          body: {
            action: 'shifts',
            params: { start: todayStr, end: todayStr, location_id: locationId },
          },
        });

        if (error || !data?.data) {
          console.warn('7shifts roster fetch failed:', error);
          return { foh: [] as string[], boh: [] as string[] };
        }

        // Get users to map IDs to names
        const usersRes = await supabase.functions.invoke('seven-shifts-proxy', {
          body: { action: 'users', params: { status: 'active' } },
        });
        const usersMap = new Map<number, string>();
        (usersRes.data?.data || []).forEach((u: any) => {
          const name = [u.first_name, u.last_name?.[0]].filter(Boolean).join(' ') + '.';
          usersMap.set(u.id, name);
        });

        // Get departments to categorize FOH/BOH
        const deptsRes = await supabase.functions.invoke('seven-shifts-proxy', {
          body: { action: 'departments', params: {} },
        });
        const deptMap = new Map<number, string>();
        (deptsRes.data?.data || []).forEach((d: any) => {
          const name = (d.name || '').toLowerCase();
          deptMap.set(d.id, name.includes('boh') || name.includes('kitchen') || name.includes('back') ? 'boh' : 'foh');
        });

        const foh: string[] = [];
        const boh: string[] = [];
        const seen = new Set<number>();

        for (const shift of data.data) {
          if (!shift.user_id || seen.has(shift.user_id)) continue;
          seen.add(shift.user_id);
          const name = usersMap.get(shift.user_id) || `Staff #${shift.user_id}`;
          const dept = deptMap.get(shift.department_id) || 'foh';
          if (dept === 'boh') boh.push(name);
          else foh.push(name);
        }

        return { foh, boh };
      } catch (err) {
        console.warn('7shifts roster error:', err);
        return { foh: [] as string[], boh: [] as string[] };
      }
    },
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
  });

  const staffAlerts: StaffAlert[] = [];

  return {
    handoff,
    handoffLoading,
    watchItems,
    overdueTasks: myTasksData?.overdue || [],
    todayTasks: myTasksData?.todayTasks || [],
    completeTask: completeTask.mutate,
    leadLogDone,
    shiftStaff,
    staffAlerts,
  };
}

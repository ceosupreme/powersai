import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export interface StaffNotification {
  id: string;
  type: 'task' | 'chat' | 'announcement';
  title: string;
  message: string;
  time: string;
  created_at: string;
}

export function useStaffNotifications() {
  const { user, session } = useAuth();
  const { selectedBar } = useApp();

  return useQuery({
    queryKey: ['staff-notifications', user?.id, selectedBar?.id],
    queryFn: async (): Promise<StaffNotification[]> => {
      if (!user?.id) return [];
      const notifications: StaffNotification[] = [];
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Recent tasks assigned to user
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, created_at')
        .eq('assignee_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10);

      tasks?.forEach(t => {
        notifications.push({
          id: `task-${t.id}`,
          type: 'task',
          title: 'New task assigned',
          message: t.title,
          time: t.created_at,
          created_at: t.created_at,
        });
      });

      // Recent announcements
      if (selectedBar?.id) {
        const { data: announcements } = await supabase
          .from('staff_announcements')
          .select('id, title, message, created_at')
          .eq('bar_id', selectedBar.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(5);

        announcements?.forEach(a => {
          notifications.push({
            id: `ann-${a.id}`,
            type: 'announcement',
            title: 'New announcement',
            message: a.title,
            time: a.created_at,
            created_at: a.created_at,
          });
        });
      }

      // Sort by time descending
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return notifications;
    },
    enabled: !!user?.id && !!session?.access_token,
    refetchInterval: 60000,
  });
}

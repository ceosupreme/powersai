import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Hook to get count of tasks needing attention (overdue + my pending tasks)
export const useTaskBadgeCount = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task-badge-count', session?.user?.id],
    queryFn: async (): Promise<number> => {
      if (!session?.user?.id) return 0;

      const today = new Date().toISOString().split('T')[0];

      // Count: my pending tasks + all overdue tasks I can see
      const [myTasksResult, overdueResult] = await Promise.all([
        // My assigned tasks that aren't done
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', session.user.id)
          .neq('status', 'Done'),
        // Overdue tasks (not done)
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .lt('due_date', today)
          .neq('status', 'Done'),
      ]);

      const myTasks = myTasksResult.count || 0;
      const overdue = overdueResult.count || 0;

      // Return whichever is higher as the badge count
      return Math.max(myTasks, overdue);
    },
    enabled: !!session?.user?.id && !!session?.access_token,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

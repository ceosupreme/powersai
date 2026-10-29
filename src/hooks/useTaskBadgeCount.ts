import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

// Hook to get count of tasks needing attention (overdue + my pending tasks)
export const useTaskBadgeCount = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task-badge-count', session?.user?.id],
    queryFn: async (): Promise<number> => {
      if (!session?.user?.id) return 0;

      const today = format(new Date(), 'yyyy-MM-dd');

      // A union counts assigned and overdue work once, including overlap.
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'Done')
        .or(`assignee_id.eq.${session.user.id},due_date.lt.${today}`);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!session?.user?.id && !!session?.access_token,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

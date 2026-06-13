import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { TaskActivity } from '@/types/tasks';

export const useTaskActivity = (taskId: string | null) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async (): Promise<TaskActivity[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_activity')
        .select(`
          *,
          user:profiles!task_activity_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TaskActivity[];
    },
    enabled: !!session && !!taskId,
    staleTime: 10 * 1000,
  });
};

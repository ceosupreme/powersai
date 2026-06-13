import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, TaskSort } from '@/types/tasks';
import { toast } from '@/hooks/use-toast';

// Fetch tasks with filters
export const useTasks = (filters?: TaskFilters, sort?: TaskSort) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['tasks', filters, sort, session?.user?.id],
    queryFn: async (): Promise<Task[]> => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `);

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.bar && filters.bar !== 'all') {
        query = query.eq('bar_id', filters.bar);
      }
      if (filters?.assignee === 'unassigned') {
        query = query.is('assignee_id', null);
      } else if (filters?.assignee && filters.assignee !== 'all') {
        query = query.eq('assignee_id', filters.assignee);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Due date filters
      if (filters?.dueDate && filters.dueDate !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (filters.dueDate === 'overdue') {
          query = query.lt('due_date', todayStr).neq('status', 'Done');
        } else if (filters.dueDate === 'today') {
          query = query.eq('due_date', todayStr);
        } else if (filters.dueDate === 'this-week') {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          query = query.gte('due_date', todayStr).lte('due_date', weekEnd.toISOString().split('T')[0]);
        }
      }

      // Apply sorting
      const sortField = sort?.field || 'created_at';
      const sortDirection = sort?.direction === 'asc' ? true : false;
      
      // Priority sorting needs custom order
      if (sortField === 'priority') {
        // We'll sort in JS after fetching
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order(sortField, { ascending: sortDirection, nullsFirst: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      let tasks = (data || []) as Task[];

      // Custom priority sorting
      if (sortField === 'priority') {
        const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        tasks = tasks.sort((a, b) => {
          const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
          return sort?.direction === 'desc' ? -diff : diff;
        });
      }

      return tasks;
    },
    enabled: !!session,
    staleTime: 30 * 1000,
  });
};

// Fetch single task with details
export const useTask = (taskId: string | null) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<Task | null> => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as Task;
    },
    enabled: !!session && !!taskId,
  });
};

// Create task mutation
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          created_by: session?.user?.id,
        })
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task created', description: 'Your task has been created successfully.' });
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    },
  });
};

// Update task mutation
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTaskInput }): Promise<Task> => {
      // If status is changing to Done, set completed_at
      if (updates.status === 'Done' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      } else if (updates.status && updates.status !== 'Done') {
        updates.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Log activity
      const activityActions: string[] = [];
      if (updates.status) activityActions.push(`status changed to ${updates.status}`);
      if (updates.assignee_id !== undefined) activityActions.push('assignee updated');
      if (updates.priority) activityActions.push(`priority set to ${updates.priority}`);

      if (activityActions.length > 0) {
        await supabase.from('task_activity').insert({
          task_id: id,
          user_id: session?.user?.id,
          action: activityActions.join(', '),
        });
      }

      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
    },
  });
};

// Delete task mutation
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task deleted', description: 'The task has been removed.' });
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
    },
  });
};

// Fetch my tasks (assigned to current user)
export const useMyTasks = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-tasks', session?.user?.id],
    queryFn: async (): Promise<Task[]> => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('assignee_id', session.user.id)
        .neq('status', 'Done')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!session?.user?.id,
    staleTime: 30 * 1000,
  });
};

// Fetch task counts for stats
export const useTaskCounts = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task-counts', session?.user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [totalResult, todoResult, inProgressResult, doneResult, overdueResult] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'Todo'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'Done'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'Done'),
      ]);

      return {
        total: totalResult.count || 0,
        todo: todoResult.count || 0,
        inProgress: inProgressResult.count || 0,
        done: doneResult.count || 0,
        overdue: overdueResult.count || 0,
      };
    },
    enabled: !!session,
    staleTime: 30 * 1000,
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { TaskComment, CommentMention } from '@/types/tasks';
import { toast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Helper to safely parse mentions from JSON
const parseMentions = (mentions: Json | null | undefined): CommentMention[] => {
  if (!mentions || !Array.isArray(mentions)) return [];
  return mentions.filter(
    (m): m is { user_id: string; display_name: string } =>
      typeof m === 'object' &&
      m !== null &&
      'user_id' in m &&
      'display_name' in m
  );
};

// Fetch comments for a task
export const useTaskComments = (taskId: string | null) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async (): Promise<TaskComment[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((c) => ({
        ...c,
        mentions: parseMentions(c.mentions),
      })) as TaskComment[];
    },
    enabled: !!session && !!taskId,
    staleTime: 10 * 1000,
  });
};

// Create a new comment
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      content, 
      mentions = [] 
    }: { 
      taskId: string; 
      content: string; 
      mentions?: CommentMention[];
    }): Promise<TaskComment> => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: session?.user?.id,
          content,
          mentions: mentions as unknown as Json,
        })
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return {
        ...data,
        mentions: parseMentions(data.mentions),
      } as TaskComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
    },
    onError: (error) => {
      console.error('Failed to create comment:', error);
      toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' });
    },
  });
};

// Update a comment
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      content, 
      mentions 
    }: { 
      id: string; 
      content: string; 
      mentions?: CommentMention[];
    }): Promise<TaskComment> => {
      const updateData: { content: string; mentions?: Json } = { content };
      if (mentions !== undefined) {
        updateData.mentions = mentions as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('task_comments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return {
        ...data,
        mentions: parseMentions(data.mentions),
      } as TaskComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
    },
    onError: (error) => {
      console.error('Failed to update comment:', error);
      toast({ title: 'Error', description: 'Failed to update comment.', variant: 'destructive' });
    },
  });
};

// Delete a comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }): Promise<void> => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error) => {
      console.error('Failed to delete comment:', error);
      toast({ title: 'Error', description: 'Failed to delete comment.', variant: 'destructive' });
    },
  });
};

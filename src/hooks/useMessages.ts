import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessageWithProfile } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';

export const messageQueryKey = (channelId: string | null, userId: string | null | undefined) =>
  ['chat-messages', channelId, userId] as const;

/** Cleanup also invalidates callbacks already awaiting a message lookup. Removing
 * the realtime subscription alone does not cancel those pending continuations. */
export function subscribeToMessages(queryClient: QueryClient, channelId: string, userId: string): () => void {
  let active = true;
  const abort = new AbortController();
  const channel = supabase
    .channel(`messages:${userId}:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      async (payload) => {
        if (!active) return;
        if (payload.eventType === 'INSERT') {
          // Fetch the new message with profile
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profile:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('id', payload.new.id)
            .abortSignal(abort.signal)
            .single();

          if (active && data) {
            queryClient.setQueryData<ChatMessageWithProfile[]>(
              messageQueryKey(channelId, userId),
              (old) => [...(old || []), data as ChatMessageWithProfile]
            );
          }
        } else if (payload.eventType === 'UPDATE') {
          queryClient.setQueryData<ChatMessageWithProfile[]>(
            messageQueryKey(channelId, userId),
            (old) =>
              old?.map((msg) =>
                msg.id === payload.new.id
                  ? { ...msg, ...payload.new, is_edited: true }
                  : msg
              ) || []
          );
        } else if (payload.eventType === 'DELETE') {
          queryClient.setQueryData<ChatMessageWithProfile[]>(
            messageQueryKey(channelId, userId),
            (old) => old?.filter((msg) => msg.id !== payload.old.id) || []
          );
        }
      }
    )
    .subscribe();

  return () => {
    active = false;
    abort.abort();
    void supabase.removeChannel(channel);
  };
}

export const useMessages = (channelId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: messageQueryKey(channelId, user?.id),
    queryFn: async ({ signal }): Promise<ChatMessageWithProfile[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profile:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100)
        .abortSignal(signal);

      if (error) throw error;
      return (data || []) as ChatMessageWithProfile[];
    },
    enabled: !!channelId && !!user,
  });

  useEffect(() => {
    if (!channelId || !user?.id) return;
    return subscribeToMessages(queryClient, channelId, user.id);
  }, [channelId, user?.id, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      mentions = [],
    }: {
      content: string;
      mentions?: { user_id: string; display_name: string }[];
    }) => {
      if (!channelId || !user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content,
          mentions,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Update channel's updated_at to sort by recent activity
      if (channelId) {
        supabase
          .from('chat_channels')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', channelId);
      }
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({ content, is_edited: true })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
  });

  const markAsRead = async () => {
    if (!channelId || !user) return;

    await supabase
      .from('chat_channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    // Invalidate channels to update unread counts
    queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    queryClient.invalidateQueries({ queryKey: ['chat-unread-count'] });
  };

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    editMessage: editMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    markAsRead,
  };
};

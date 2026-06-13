import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessageWithProfile } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';

export const useMessages = (channelId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async (): Promise<ChatMessageWithProfile[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profile:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as ChatMessageWithProfile[];
    },
    enabled: !!channelId && !!user,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!channelId || !user) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new message with profile
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                *,
                profile:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              queryClient.setQueryData<ChatMessageWithProfile[]>(
                ['chat-messages', channelId],
                (old) => [...(old || []), data as ChatMessageWithProfile]
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData<ChatMessageWithProfile[]>(
              ['chat-messages', channelId],
              (old) =>
                old?.map((msg) =>
                  msg.id === payload.new.id
                    ? { ...msg, ...payload.new, is_edited: true }
                    : msg
                ) || []
            );
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData<ChatMessageWithProfile[]>(
              ['chat-messages', channelId],
              (old) => old?.filter((msg) => msg.id !== payload.old.id) || []
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, user, queryClient]);

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

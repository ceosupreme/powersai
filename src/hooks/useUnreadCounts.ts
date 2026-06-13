import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useUnreadCounts = () => {
  const { user, session } = useAuth();

  const unreadQuery = useQuery({
    queryKey: ['chat-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // Get all channels the user is a member of with their last_read_at
      const { data: memberships, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberships?.length) return 0;

      // Count unread messages across all channels
      let totalUnread = 0;

      for (const membership of memberships) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', membership.channel_id)
          .gt('created_at', membership.last_read_at)
          .neq('user_id', user.id);

        totalUnread += count || 0;
      }

      return totalUnread;
    },
    enabled: !!user && !!session?.access_token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    totalUnread: unreadQuery.data || 0,
    isLoading: unreadQuery.isLoading,
    refetch: unreadQuery.refetch,
  };
};

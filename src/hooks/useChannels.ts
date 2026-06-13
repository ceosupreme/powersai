import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatChannel, ChatChannelWithMembers, ChatChannelType } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export const useChannels = () => {
  const { user, session } = useAuth();
  const { selectedBar } = useApp();
  const queryClient = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ['chat-channels', selectedBar?.id],
    queryFn: async (): Promise<ChatChannelWithMembers[]> => {
      if (!user) return [];

      // Get channels the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberData?.length) return [];

      const channelIds = memberData.map(m => m.channel_id);
      const lastReadMap = new Map(memberData.map(m => [m.channel_id, m.last_read_at]));

      // Get channel details
      const { data: channels, error: channelError } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('updated_at', { ascending: false });

      if (channelError) throw channelError;

      // Get unread counts and last messages for each channel
      const channelsWithDetails = await Promise.all(
        (channels || []).map(async (channel) => {
          const lastRead = lastReadMap.get(channel.id) || channel.created_at;

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .gt('created_at', lastRead)
            .neq('user_id', user.id);

          // Get last message with profile
          const { data: lastMessages } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profile:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // For DMs, get the other user
          let members: any[] = [];
          if (channel.type === 'dm') {
            const { data: memberProfiles } = await supabase
              .from('chat_channel_members')
              .select(`
                *,
                profile:profiles!chat_channel_members_user_id_fkey(id, full_name, email, avatar_url)
              `)
              .eq('channel_id', channel.id);
            members = memberProfiles || [];
          }

          return {
            ...channel,
            unread_count: unreadCount || 0,
            last_message: lastMessages?.[0] || null,
            members,
          };
        })
      );

      return channelsWithDetails as unknown as ChatChannelWithMembers[];
    },
    enabled: !!user && !!session?.access_token,
    refetchInterval: 30000, // Refresh every 30 seconds for updates
  });

  const createChannelMutation = useMutation({
    mutationFn: async ({
      name,
      type,
      topic,
      memberIds,
    }: {
      name: string;
      type: ChatChannelType;
      topic?: string;
      memberIds: string[];
    }) => {
      if (!user || !selectedBar) throw new Error('Not authenticated');

      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          bar_id: type === 'team' ? selectedBar.id : null,
          type,
          name,
          topic: topic || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add members (including the creator)
      const allMemberIds = [...new Set([user.id, ...memberIds])];
      const { error: memberError } = await supabase
        .from('chat_channel_members')
        .insert(
          allMemberIds.map((userId) => ({
            channel_id: channel.id,
            user_id: userId,
          }))
        );

      if (memberError) throw memberError;

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });

  const getOrCreateDMChannel = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Check if a DM channel already exists between these users
      const { data: existingChannels } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (existingChannels?.length) {
        const channelIds = existingChannels.map(c => c.channel_id);
        
        // Find DM channels
        const { data: dmChannels } = await supabase
          .from('chat_channels')
          .select('id')
          .in('id', channelIds)
          .eq('type', 'dm');

        if (dmChannels?.length) {
          // Check which DM includes the other user
          for (const channel of dmChannels) {
            const { data: members } = await supabase
              .from('chat_channel_members')
              .select('user_id')
              .eq('channel_id', channel.id);

            const memberIds = members?.map(m => m.user_id) || [];
            if (memberIds.includes(otherUserId)) {
              return channel;
            }
          }
        }
      }

      // No existing DM, create one
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', otherUserId)
        .single();

      const { data: currentUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const dmName = `${currentUser?.full_name || 'User'} & ${otherUser?.full_name || 'User'}`;

      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          type: 'dm',
          name: dmName,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add both users as members
      const { error: memberError } = await supabase
        .from('chat_channel_members')
        .insert([
          { channel_id: channel.id, user_id: user.id },
          { channel_id: channel.id, user_id: otherUserId },
        ]);

      if (memberError) throw memberError;

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
    },
  });

  const ensureGeneralChannel = useMutation({
    mutationFn: async () => {
      if (!user || !selectedBar) throw new Error('Not authenticated');

      // Check if a General channel already exists for this bar
      const { data: existingChannels } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('bar_id', selectedBar.id)
        .eq('type', 'team')
        .eq('name', 'General');

      if (existingChannels?.length) {
        // Check if user is already a member
        const { data: membership } = await supabase
          .from('chat_channel_members')
          .select('id')
          .eq('channel_id', existingChannels[0].id)
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          // Add user to the channel
          await supabase
            .from('chat_channel_members')
            .insert({
              channel_id: existingChannels[0].id,
              user_id: user.id,
            });
        }

        return existingChannels[0];
      }

      // Create the General channel
      return createChannelMutation.mutateAsync({
        name: 'General',
        type: 'team',
        topic: 'General team discussion',
        memberIds: [],
      });
    },
  });

  return {
    channels: channelsQuery.data || [],
    isLoading: channelsQuery.isLoading,
    error: channelsQuery.error,
    refetch: channelsQuery.refetch,
    createChannel: createChannelMutation.mutateAsync,
    isCreating: createChannelMutation.isPending,
    getOrCreateDM: getOrCreateDMChannel.mutateAsync,
    ensureGeneralChannel: ensureGeneralChannel.mutateAsync,
  };
};

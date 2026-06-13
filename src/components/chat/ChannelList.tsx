import { useState, useMemo } from 'react';
import { Hash, MessageCircle, Plus, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CountBadge } from '@/components/shared/CountBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatChannelWithMembers } from '@/types/chat';
import { CreateChannelDialog } from './CreateChannelDialog';
import { StartDMDialog } from './StartDMDialog';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { filterChannelsByRole } from '@/utils/channelVisibility';

interface ChannelListProps {
  channels: ChatChannelWithMembers[];
  selectedChannel: ChatChannelWithMembers | null;
  onSelectChannel: (channel: ChatChannelWithMembers) => void;
  isLoading: boolean;
}

export const ChannelList = ({
  channels,
  selectedChannel,
  onSelectChannel,
  isLoading,
}: ChannelListProps) => {
  const [search, setSearch] = useState('');
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [startDMOpen, setStartDMOpen] = useState(false);
  const { user } = useAuth();
  const { currentRole } = useRole();

  // Role-based filtering for team channels
  const roleFilteredChannels = useMemo(
    () => filterChannelsByRole(channels, currentRole),
    [channels, currentRole]
  );

  const teamChannels = roleFilteredChannels.filter((c) => c.type === 'team');
  const dmChannels = roleFilteredChannels.filter((c) => c.type === 'dm');

  const filteredTeamChannels = teamChannels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDMChannels = dmChannels.filter((c) => {
    const otherMember = c.members?.find((m) => m.user_id !== user?.id);
    const displayName = otherMember?.profile?.full_name || c.name;
    return displayName.toLowerCase().includes(search.toLowerCase());
  });

  // Deduplicate DMs - one channel per unique other-user
  const uniqueDMChannels = useMemo(() => {
    const seen = new Set<string>();
    return filteredDMChannels.filter((ch) => {
      const otherId = ch.members?.find((m) => m.user_id !== user?.id)?.user_id;
      if (!otherId || seen.has(otherId)) return false;
      seen.add(otherId);
      return true;
    });
  }, [filteredDMChannels, user?.id]);

  const getOtherUserInDM = (channel: ChatChannelWithMembers) => {
    const otherMember = channel.members?.find((m) => m.user_id !== user?.id);
    return otherMember?.profile;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-4 w-20" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-3">
        <h2 className="text-lg font-bold text-foreground mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent focus:border-primary/30 rounded-xl h-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3">
          {/* Team Channels Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Channels
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                onClick={() => setCreateChannelOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {filteredTeamChannels.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-6 text-center">
                No channels yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {filteredTeamChannels.map((channel) => {
                  const isSelected = selectedChannel?.id === channel.id;
                  const hasUnread = channel.unread_count && channel.unread_count > 0;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group",
                        isSelected
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary/20" : "bg-muted/80 group-hover:bg-muted"
                      )}>
                        <Hash className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <span className={cn(
                        "flex-1 truncate text-sm",
                        hasUnread && "font-semibold"
                      )}>
                        {channel.name}
                      </span>
                      <CountBadge count={channel.unread_count || 0} variant="subtle" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Direct Messages
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                onClick={() => setStartDMOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {filteredDMChannels.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-6 text-center">
                No direct messages yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {uniqueDMChannels.map((channel) => {
                  const otherUser = getOtherUserInDM(channel);
                  const displayName = otherUser?.full_name || 'Unknown User';
                  const isSelected = selectedChannel?.id === channel.id;
                  const hasUnread = channel.unread_count && channel.unread_count > 0;

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group",
                        isSelected
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={otherUser?.avatar_url || undefined} />
                        <AvatarFallback className={cn(
                          "text-[10px] font-medium",
                          isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "flex-1 truncate text-sm",
                        hasUnread && "font-semibold"
                      )}>
                        {displayName}
                      </span>
                      <CountBadge count={channel.unread_count || 0} variant="subtle" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <CreateChannelDialog open={createChannelOpen} onOpenChange={setCreateChannelOpen} />
      <StartDMDialog open={startDMOpen} onOpenChange={setStartDMOpen} onSelectChannel={onSelectChannel} />
    </div>
  );
};

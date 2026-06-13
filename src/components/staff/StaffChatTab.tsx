import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Hash, Send, Paperclip, ChevronLeft, Loader2, MessageSquare, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CountBadge } from '@/components/shared/CountBadge';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/shared/MentionTextarea';
import { extractMentions } from '@/lib/mentionUtils';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useChannels } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { filterChannelsByRole } from '@/utils/channelVisibility';
import { formatDistanceToNow, format } from 'date-fns';
import type { ChatChannelWithMembers } from '@/types/chat';
import type { Department } from '@/hooks/useStaffDepartment';

interface StaffChatTabProps {
  department: Department;
}

export const StaffChatTab = ({ department }: StaffChatTabProps) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { user } = useAuth();
  const { currentRole } = useRole();
  const { channels, isLoading, ensureGeneralChannel } = useChannels();

  useEffect(() => {
    if (!isLoading && channels.length === 0) {
      ensureGeneralChannel().catch(console.error);
    }
  }, [isLoading, channels.length]);

  // Role-based channel filtering with department context
  const filteredChannels = filterChannelsByRole(channels, currentRole, department);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  if (selectedChannel) {
    return (
      <ChatView
        channel={selectedChannel}
        onBack={() => setSelectedChannelId(null)}
        message={message}
        setMessage={setMessage}
        userId={user?.id || ''}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message Shift Lead shortcut */}
      <button
        className="w-full card-interactive bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3"
        onClick={() => {
          // Would open DM with shift lead - for now just show first DM or create one
          const dm = channels.find(c => c.type === 'dm');
          if (dm) setSelectedChannelId(dm.id);
        }}
      >
        <div className="p-2 rounded-full bg-primary/20">
          <UserCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Message a Team Member</p>
          <p className="text-xs text-muted-foreground">Start a direct message</p>
        </div>
      </button>

      {/* Channel List */}
      {filteredChannels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No channels yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredChannels.map((channel) => {
            const isTeam = channel.type === 'team';
            const channelName = isTeam ? channel.name : getDMDisplayName(channel, user?.id || '');
            const lastMessage = channel.last_message;
            const senderName = lastMessage?.profile?.full_name?.split(' ')[0] || '';
            const timeAgo = lastMessage?.created_at
              ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: false })
              : '';

            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
                className="w-full card-interactive bg-card border rounded-xl p-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                    isTeam ? 'bg-primary/15' : 'bg-muted'
                  )}>
                    {isTeam ? (
                      <Hash className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-sm font-medium text-foreground">{getInitials(channelName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {isTeam ? `#${channel.name.toLowerCase()}` : channelName}
                      </span>
                      {timeAgo && <span className="text-xs text-muted-foreground">{timeAgo}</span>}
                    </div>
                    {lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {isTeam && senderName && `${senderName}: `}{lastMessage.content}
                      </p>
                    )}
                  </div>
                  <CountBadge count={channel.unread_count || 0} variant="subtle" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getDMDisplayName = (channel: ChatChannelWithMembers, currentUserId: string): string => {
  if (channel.type !== 'dm' || !channel.members?.length) return channel.name;
  const otherMember = channel.members.find(m => m.user_id !== currentUserId);
  return otherMember?.profile?.full_name || channel.name;
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const ChatView = ({ channel, onBack, message, setMessage, userId }: {
  channel: ChatChannelWithMembers;
  onBack: () => void;
  message: string;
  setMessage: (m: string) => void;
  userId: string;
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages(channel.id);
  const { data: teamMembers = [] } = useTeamMembers();

  useEffect(() => { markAsRead(); }, [channel.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    const mentions = extractMentions(message.trim(), teamMembers);
    try {
      await sendMessage({ content: message.trim(), mentions });
      setMessage('');
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const isTeam = channel.type === 'team';
  const displayName = isTeam ? `#${channel.name.toLowerCase()}` : getDMDisplayName(channel, userId);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border/60">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          isTeam ? 'bg-primary/15' : 'bg-muted'
        )}>
          {isTeam ? <Hash className="h-4 w-4 text-primary" /> : <span className="text-xs font-medium">{getInitials(displayName)}</span>}
        </div>
        <span className="font-semibold text-sm">{displayName}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        {isLoading ? (
          <div className="space-y-4 px-1">
            <Skeleton className="h-12 w-3/4 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/70">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3 px-1">
            {messages.map((msg) => {
              const isOwn = msg.user_id === userId;
              const senderName = msg.profile?.full_name || 'Unknown';
              const time = format(new Date(msg.created_at), 'h:mm a');
              return (
                <div key={msg.id} className={cn('flex gap-2.5', isOwn && 'flex-row-reverse')}>
                  {!isOwn && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                      {msg.profile?.avatar_url && <AvatarImage src={msg.profile.avatar_url} />}
                      <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-medium">{getInitials(senderName)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('max-w-[80%]', isOwn && 'items-end')}>
                    {!isOwn && <span className="text-[11px] text-muted-foreground/60 mb-0.5 block ml-1">{senderName}</span>}
                    <div className={cn(
                      'rounded-2xl px-3.5 py-2.5',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border/30 rounded-bl-md'
                    )}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 mt-1 block ml-1">{time}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="pt-3 border-t border-border/60">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <MentionTextarea
              value={message}
              onChange={setMessage}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... @mention"
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl bg-muted/40 border-transparent focus:border-primary/30 text-sm"
            />
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="flex-shrink-0 h-10 w-10 rounded-xl mb-0.5"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

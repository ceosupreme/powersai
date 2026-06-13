import { ArrowLeft, Hash, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatChannelWithMembers } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';

interface ChannelHeaderProps {
  channel: ChatChannelWithMembers;
  onBack?: () => void;
}

export const ChannelHeader = ({ channel, onBack }: ChannelHeaderProps) => {
  const { user } = useAuth();

  const getOtherUserInDM = () => {
    if (channel.type !== 'dm') return null;
    const otherMember = channel.members?.find((m) => m.user_id !== user?.id);
    return otherMember?.profile;
  };

  const otherUser = getOtherUserInDM();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-16 px-4 flex items-center gap-3 border-b border-border/60 bg-card/30 backdrop-blur-sm shrink-0">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1 h-9 w-9 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {channel.type === 'dm' && otherUser ? (
        <>
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                {getInitials(otherUser.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {otherUser.full_name || 'Unknown User'}
            </h2>
            <p className="text-xs text-muted-foreground/70 truncate">
              {otherUser.email}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
            {channel.topic && (
              <p className="text-xs text-muted-foreground/70 truncate">{channel.topic}</p>
            )}
          </div>
        </>
      )}

      {channel.type === 'team' && (
        <div className="flex items-center gap-1.5 text-muted-foreground/70 bg-muted/50 px-2.5 py-1.5 rounded-lg">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{channel.members?.length || 0}</span>
        </div>
      )}
    </div>
  );
};

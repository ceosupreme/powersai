import { useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useChannels } from '@/hooks/useChannels';
import { useAuth } from '@/context/AuthContext';
import { ChatChannelWithMembers } from '@/types/chat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StartDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (channel: ChatChannelWithMembers) => void;
}

export const StartDMDialog = ({ open, onOpenChange, onSelectChannel }: StartDMDialogProps) => {
  const [search, setSearch] = useState('');
  const { data: teamMembers = [] } = useTeamMembers();
  const { getOrCreateDM } = useChannels();
  const { user } = useAuth();

  const filteredMembers = teamMembers
    .filter((member) => member.id !== user?.id)
    .filter((member) =>
      (member.full_name || member.email || '')
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelectUser = async (userId: string) => {
    try {
      const channel = await getOrCreateDM(userId);
      onOpenChange(false);
      setSearch('');
      // The channel will be selected through the channels query refetch
      toast.success('Conversation started');
    } catch (error) {
      console.error('Failed to start DM:', error);
      toast.error('Failed to start conversation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Start a Conversation
          </DialogTitle>
          <DialogDescription>
            Select a team member to start a direct message.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectUser(member.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                      "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

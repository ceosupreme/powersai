import { useState, forwardRef } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatMessageWithProfile } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { parseContentWithMentions } from '@/lib/mentionUtils';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: ChatMessageWithProfile;
}

export const MessageItem = forwardRef<HTMLDivElement, MessageItemProps>(({ message }, ref) => {
  const { user } = useAuth();
  const { editMessage, deleteMessage } = useMessages(message.channel_id);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isOwnMessage = message.user_id === user?.id;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessage({ messageId: message.id, content: editContent.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
    if (e.key === 'Escape') { setIsEditing(false); setEditContent(message.content); }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="mt-1.5">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="rounded-lg h-7 text-xs" onClick={handleEdit}>Save</Button>
            <Button size="sm" variant="ghost" className="rounded-lg h-7 text-xs" onClick={() => { setIsEditing(false); setEditContent(message.content); }}>Cancel</Button>
          </div>
        </div>
      );
    }

    const mentions = (message.mentions || []) as { user_id: string; display_name: string }[];
    const parsedContent = parseContentWithMentions(message.content, mentions);

    return (
      <div className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
        {parsedContent.map((part, i) =>
          part.type === 'mention' && part.mention ? (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-xs font-medium mx-0.5"
            >
              @{part.mention.display_name}
            </span>
          ) : (
            <span key={i}>{part.content}</span>
          )
        )}
        {message.is_edited && (
          <span className="text-[10px] text-muted-foreground/60 ml-1.5">(edited)</span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group flex gap-3 py-2 px-3 -mx-3 rounded-xl transition-colors",
        showActions && "bg-muted/20"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarImage src={message.profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
          {getInitials(message.profile?.full_name || null)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[13px] text-foreground">
            {message.profile?.full_name || 'Unknown User'}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>
        {renderContent()}
      </div>

      {isOwnMessage && showActions && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

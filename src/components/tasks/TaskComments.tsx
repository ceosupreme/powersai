import { useState, useRef, useEffect } from 'react';
import { useTaskComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useTaskComments';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { MessageSquare, Send, Loader2, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MentionTextarea } from '@/components/shared/MentionTextarea';
import { extractMentions, parseContentWithMentions, CommentMention } from '@/lib/mentionUtils';

interface TaskCommentsProps {
  taskId: string;
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
  const { session, profile } = useAuth();
  const { data: comments, isLoading } = useTaskComments(taskId);
  const { data: teamMembers = [] } = useTeamMembers();
  const { mutate: createComment, isPending: isCreating } = useCreateComment();
  const { mutate: updateComment, isPending: isUpdating } = useUpdateComment();
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (comments?.length) {
      scrollToBottom();
    }
  }, [comments?.length]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const mentions = extractMentions(newComment, teamMembers);
    createComment(
      { taskId, content: newComment.trim(), mentions },
      {
        onSuccess: () => {
          setNewComment('');
          scrollToBottom();
        },
      }
    );
  };

  const handleEdit = (id: string, currentContent: string) => {
    setEditingId(id);
    setEditContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    const mentions = extractMentions(editContent, teamMembers);
    updateComment(
      { id: editingId, content: editContent.trim(), mentions },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditContent('');
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = (id: string) => {
    deleteComment({ id, taskId });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (dateString: string) => {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const formatExactTime = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy at h:mm a');
  };

  const isOwnComment = (userId: string | null) => session?.user?.id === userId;

  // Render content with highlighted mentions
  const renderContentWithMentions = (content: string, mentions: CommentMention[] | null | undefined) => {
    const segments = parseContentWithMentions(content, mentions || []);
    
    return segments.map((segment, index) => {
      if (segment.type === 'mention' && segment.mention) {
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/20 text-primary font-medium text-xs cursor-default">
                {segment.content}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium">{segment.mention.display_name}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return <span key={index}>{segment.content}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageSquare className="w-4 h-4" />
          <span>Comments</span>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="w-4 h-4" />
        <span>Comments</span>
        {comments && comments.length > 0 && (
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
        {comments?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Start the conversation!
          </p>
        ) : (
          <TooltipProvider delayDuration={300}>
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(comment.user?.full_name || null)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {comment.user?.full_name || 'Unknown'}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-default">
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{formatExactTime(comment.created_at)}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Edit/Delete menu - only for own comments */}
                    {isOwnComment(comment.user_id) && editingId !== comment.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(comment.id, comment.content)}>
                            <Pencil className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(comment.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Comment content or edit mode */}
                  {editingId === comment.id ? (
                    <div className="mt-1 space-y-2">
                      <MentionTextarea
                        value={editContent}
                        onChange={setEditContent}
                        className="min-h-[60px] text-sm bg-card border-border resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isUpdating || !editContent.trim()}
                          className="h-7 px-2"
                        >
                          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          <span className="ml-1">Save</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-7 px-2"
                        >
                          <X className="h-3 w-3" />
                          <span className="ml-1">Cancel</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                      {renderContentWithMentions(comment.content, comment.mentions)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </TooltipProvider>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* New Comment Input */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {getInitials(profile?.full_name || null)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            placeholder="Write a comment... Use @ to mention someone"
            className={cn(
              'min-h-[60px] text-sm bg-card border-border resize-none',
              'focus-visible:ring-primary'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Press ⌘+Enter to post
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isCreating || !newComment.trim()}
              className="h-8"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-1.5">Post</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

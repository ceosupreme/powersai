import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageItem } from './MessageItem';
import { ChatMessageWithProfile } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessageWithProfile[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const shouldShowDateSeparator = (message: ChatMessageWithProfile, index: number) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    return !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at));
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
            <MessageCircle className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground/70">No messages yet</p>
            <p className="text-sm text-muted-foreground/50">Be the first to send a message!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 md:p-6 space-y-0.5">
        {messages.map((message, index) => (
          <div key={message.id}>
            {shouldShowDateSeparator(message, index) && (
              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[11px] font-medium text-muted-foreground/60 bg-background px-2">
                  {formatDateSeparator(new Date(message.created_at))}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
            )}
            <MessageItem message={message} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};

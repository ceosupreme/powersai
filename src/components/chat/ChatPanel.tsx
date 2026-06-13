import { MessageCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CountBadge } from '@/components/shared/CountBadge';
import { ChatLayout } from './ChatLayout';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

interface ChatPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ChatPanel = ({ open, onOpenChange }: ChatPanelProps) => {
  const { totalUnread } = useUnreadCounts();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          <CountBadge count={totalUnread} className="absolute -top-1 -right-1" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <ChatLayout className="h-full" isPanel />
      </SheetContent>
    </Sheet>
  );
};

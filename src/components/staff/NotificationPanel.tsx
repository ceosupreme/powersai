import { ClipboardList, MessageCircle, Megaphone, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useStaffNotifications } from '@/hooks/useStaffNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  task: ClipboardList,
  chat: MessageCircle,
  announcement: Megaphone,
};

export const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const { data: notifications = [], isLoading } = useStaffNotifications();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-sm bg-background border-l border-border">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle className="text-lg font-semibold">Notifications</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="h-10 w-10 text-emerald-400 mb-3" />
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const timeAgo = formatDistanceToNow(new Date(notification.time), { addSuffix: true });
              return (
                <div
                  key={notification.id}
                  className="w-full flex items-start gap-3 p-3 rounded-lg text-left bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/20 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {notification.title}
                    </span>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

import { Bell, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

interface StaffTopBarProps {
  onNotificationsClick: () => void;
}

export const StaffTopBar = ({ onNotificationsClick }: StaffTopBarProps) => {
  const { profile } = useAuth();
  const { selectedBar } = useApp();
  const { totalUnread } = useUnreadCounts();
  const today = new Date();
  const hour = today.getHours();
  const shift = hour < 16 ? 'AM Shift' : 'PM Shift';

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo + Venue */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-primary">
            <Activity className="h-5 w-5 flex-shrink-0" />
            <span className="font-semibold text-sm hidden sm:block">BarPulse</span>
          </div>
          <span className="text-muted-foreground hidden sm:block">·</span>
          <span className="text-sm text-foreground truncate">
            {selectedBar?.bar_name || 'Harbor Town Pub'}
          </span>
        </div>

        {/* Center: Date + Shift */}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span>{format(today, 'EEEE, MMM d')}</span>
          <span>·</span>
          <span className="text-foreground font-medium">{shift}</span>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNotificationsClick}
            className="relative p-2 rounded-full hover:bg-card transition-colors touch-target"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block">
              {profile?.full_name?.split(' ')[0] || 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: Date + Shift row */}
      <div className="md:hidden flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
        <span>{format(today, 'EEEE, MMM d')}</span>
        <span>·</span>
        <Badge variant="secondary" className="text-xs px-2 py-0">{shift}</Badge>
      </div>
    </header>
  );
};

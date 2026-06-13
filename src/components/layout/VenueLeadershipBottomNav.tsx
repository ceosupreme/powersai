import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarCheck, Lightbulb, CheckSquare, MessageCircle, Menu, DollarSign, Settings, Star, ClipboardList, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountBadge } from '@/components/shared/CountBadge';
import { useTaskBadgeCount } from '@/hooks/useTaskBadgeCount';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/context/RoleContext';
import { getAllowedRoles } from '@/config/routes';
import { useOwnerMode } from '@/hooks/useOwnerMode';

export const VenueLeadershipBottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: taskBadgeCount } = useTaskBadgeCount();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();
  const { currentRole } = useRole();
  const mode = useOwnerMode();

  const canAccess = (path: string) => {
    const roles = getAllowedRoles(path);
    if (roles && (!currentRole || !roles.includes(currentRole))) return false;

    if (currentRole === 'owner') {
      const pillarPaths = ['/sales', '/labor', '/operations', '/guest-experience'];
      const staffToolPaths = ['/tasks', '/logs', '/logs/new', '/chat'];
      if (pillarPaths.includes(path) && !mode.showPillarNav) return false;
      if (staffToolPaths.includes(path) && !mode.showStaffTools) return false;
    }
    return true;
  };

  const allPrimaryItems = [
    { to: '/weekly-review', icon: CalendarCheck, label: 'Review' },
    { to: '/insights', icon: Lightbulb, label: 'Insights' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', hasBadge: 'tasks' as const },
    { to: '/chat', icon: MessageCircle, label: 'Chat', hasBadge: 'chat' as const },
  ];

  const allSecondaryItems = [
    { to: '/sales', icon: DollarSign, label: 'Revenue' },
    { to: '/labor', icon: CalendarCheck, label: 'Labor' },
    { to: '/operations', icon: Settings, label: 'Operations' },
    { to: '/guest-experience', icon: Star, label: 'Guest Exp.' },
    { to: '/logs', icon: ClipboardList, label: 'Logs' },
  ];

  const primaryItems = useMemo(() => allPrimaryItems.filter(i => canAccess(i.to)), [currentRole]);
  const secondaryItems = useMemo(() => allSecondaryItems.filter(i => canAccess(i.to)), [currentRole]);

  const getBadge = (key?: 'tasks' | 'chat') => {
    if (key === 'tasks') return taskBadgeCount || 0;
    if (key === 'chat') return chatUnreadCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-secondary/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          const badge = getBadge(item.hasBadge);
          return (
            <NavLink key={item.to} to={item.to} className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[52px] min-h-[52px] relative',
              isActive ? 'text-primary bg-primary/15' : 'text-muted-foreground'
            )}>
              <div className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                {badge > 0 && <CountBadge count={badge} max={9} className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1" />}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}

        {secondaryItems.length > 0 && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px]',
                moreOpen ? 'text-primary bg-primary/15' : 'text-muted-foreground'
              )}>
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
              <SheetHeader className="pb-4"><SheetTitle className="text-left">More Pages</SheetTitle></SheetHeader>
              <div className="grid grid-cols-3 gap-3 pb-4">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-xl text-muted-foreground hover:text-foreground bg-muted/30">
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
              <div className="border-t border-border/50 pt-4">
                <button onClick={() => { setMoreOpen(false); supabase.auth.signOut(); }} className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10">
                  <LogOut className="w-5 h-5" /><span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
};

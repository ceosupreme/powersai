import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Menu,
  Lightbulb,
  CheckSquare,
  ClipboardList,
  LogOut,
  MessageCircle,
  Sunrise,
  Briefcase,
  Inbox as InboxIcon,
  Palette,
  Activity,
  HelpCircle,
  Rocket,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CountBadge } from '@/components/shared/CountBadge';
import { PageKey } from '@/types/permissions';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

// Primary nav items shown directly in bottom nav
const primaryNavItems = [
  { to: '/workspace', icon: Sunrise, label: 'Today', pageKey: 'dashboard' as PageKey },
  { to: '/weekly-review', icon: CalendarCheck, label: 'Weekly', pageKey: 'weekly_review' as PageKey },
  { to: '/inbox', icon: InboxIcon, label: 'Inbox', pageKey: 'dashboard' as PageKey },
  { to: '/chat', icon: MessageCircle, label: 'Chat', pageKey: 'chat' as PageKey, hasBadge: true },
];

// Secondary nav items shown in "More" drawer — mirrors sidebar groups
const secondaryNavItems = [
  { to: '/portfolio', icon: LayoutDashboard, label: 'Portfolio', pageKey: 'dashboard' as PageKey },
  { to: '/insights', icon: Lightbulb, label: 'Insights', pageKey: 'insights' as PageKey },
  { to: '/crm', icon: Briefcase, label: 'CRM', pageKey: 'dashboard' as PageKey },
  { to: '/crm?tab=inbound', icon: InboxIcon, label: 'Inbound', pageKey: 'dashboard' as PageKey },
  { to: '/brand-kit', icon: Palette, label: 'Brand Vault', pageKey: 'dashboard' as PageKey },
  { to: '/growth-audit', icon: Activity, label: 'Growth Audit', pageKey: 'dashboard' as PageKey },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', pageKey: 'tasks' as PageKey },
  { to: '/logs', icon: ClipboardList, label: 'Logs', pageKey: 'logs' as PageKey },
  { to: '/help', icon: HelpCircle, label: 'Help', pageKey: 'dashboard' as PageKey },
  { to: '/launch', icon: Rocket, label: 'Launch', pageKey: 'dashboard' as PageKey },
  { to: '/admin', icon: Settings, label: 'Settings', pageKey: 'dashboard' as PageKey },
];

export const BottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { canAccessPage } = useAuth();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Filter nav items based on permissions
  const filteredPrimaryNavItems = useMemo(() => 
    primaryNavItems.filter(item => canAccessPage(item.pageKey)),
    [canAccessPage]
  );
  
  const filteredSecondaryNavItems = useMemo(() => 
    secondaryNavItems.filter(item => canAccessPage(item.pageKey)),
    [canAccessPage]
  );

  const isSecondaryActive = filteredSecondaryNavItems.some(item => location.pathname === item.to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-secondary/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {filteredPrimaryNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          const showBadge = item.hasBadge && chatUnreadCount > 0;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[52px] min-h-[52px] touch-manipulation active:scale-95 relative',
                isActive 
                  ? 'text-primary bg-primary/15 shadow-[0_0_15px_rgba(212,165,116,0.2)]' 
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-200', 
                  isActive && 'scale-110'
                )} />
                {showBadge && <CountBadge count={chatUnreadCount} max={9} className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1" />}
              </div>
              <span className={cn(
                'text-[10px] font-medium tracking-wide transition-opacity',
                isActive ? 'opacity-100' : 'opacity-70'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
        
        {/* More Menu - only show if there are secondary items */}
        {filteredSecondaryNavItems.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[52px] min-h-[52px] touch-manipulation active:scale-95',
                isSecondaryActive || moreOpen
                  ? 'text-primary bg-primary/15 shadow-[0_0_15px_rgba(212,165,116,0.2)]' 
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              )}
            >
              <Menu className={cn(
                'w-5 h-5 transition-transform duration-200',
                (isSecondaryActive || moreOpen) && 'scale-110'
              )} />
              <span className={cn(
                'text-[10px] font-medium tracking-wide transition-opacity',
                (isSecondaryActive || moreOpen) ? 'opacity-100' : 'opacity-70'
              )}>
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">More Pages</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-4">
              {filteredSecondaryNavItems.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = item.icon;
                
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 touch-manipulation active:scale-95',
                      isActive 
                        ? 'text-primary bg-primary/15' 
                        : 'text-muted-foreground hover:text-foreground active:bg-muted/50 bg-muted/30'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="border-t border-border/50 pt-4">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  handleSignOut();
                }}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200 touch-manipulation"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
        )}
      </div>
    </nav>
  );
};

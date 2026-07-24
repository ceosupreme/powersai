import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  CalendarCheck, 
  Menu,
  MessageCircle,
  Sunrise,
  Inbox as InboxIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountBadge } from '@/components/shared/CountBadge';
import { PageKey } from '@/types/permissions';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { MoreSheet } from './MoreSheet';
import { MORE_SECTIONS } from './moreNavSections';

const primaryNavItems = [
  { to: '/workspace', icon: Sunrise, label: 'Today', pageKey: 'dashboard' as PageKey },
  { to: '/weekly-review', icon: CalendarCheck, label: 'Weekly', pageKey: 'weekly_review' as PageKey },
  { to: '/inbox', icon: InboxIcon, label: 'Inbox', pageKey: 'dashboard' as PageKey },
  { to: '/chat', icon: MessageCircle, label: 'Chat', pageKey: 'chat' as PageKey, hasBadge: true },
];

// Routes already in the primary bar — hidden from More to avoid duplication.
const PRIMARY_ROUTES = ['/workspace', '/weekly-review', '/inbox', '/chat'];

export const BottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { canAccessPage, isAdmin } = useAuth();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();

  const filteredPrimaryNavItems = useMemo(() => 
    primaryNavItems.filter(item => canAccessPage(item.pageKey)),
    [canAccessPage]
  );

  const hasMoreItems = useMemo(() => {
    const primary = new Set(PRIMARY_ROUTES);
    return MORE_SECTIONS.some((s) =>
      s.items.some(
        (i) => !primary.has(i.to) && (!i.adminOnly || isAdmin) && canAccessPage(i.pageKey),
      ),
    );
  }, [canAccessPage, isAdmin]);

  const isSecondaryActive = useMemo(() => {
    const primary = new Set(PRIMARY_ROUTES);
    return MORE_SECTIONS.some((s) =>
      s.items.some((i) => !primary.has(i.to) && location.pathname === i.to),
    );
  }, [location.pathname]);

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

        {hasMoreItems && (
          <MoreSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            excludeRoutes={PRIMARY_ROUTES}
            trigger={
              <button
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-[52px] min-h-[52px] touch-manipulation active:scale-95',
                  isSecondaryActive || moreOpen
                    ? 'text-primary bg-primary/15 shadow-[0_0_15px_rgba(212,165,116,0.2)]'
                    : 'text-muted-foreground hover:text-foreground active:bg-muted/50',
                )}
              >
                <Menu
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    (isSecondaryActive || moreOpen) && 'scale-110',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium tracking-wide transition-opacity',
                    isSecondaryActive || moreOpen ? 'opacity-100' : 'opacity-70',
                  )}
                >
                  More
                </span>
              </button>
            }
          />
        )}
      </div>
    </nav>
  );
};

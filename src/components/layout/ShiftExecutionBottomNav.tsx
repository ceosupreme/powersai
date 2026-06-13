import { NavLink, useLocation } from 'react-router-dom';
import { ClipboardList, PenSquare, MessageCircle, LayoutDashboard, Home } from 'lucide-react';
import { CountBadge } from '@/components/shared/CountBadge';
import { cn } from '@/lib/utils';

interface ShiftExecutionBottomNavProps {
  tasksBadge?: number;
  chatBadge?: number;
  isLead?: boolean;
}

const baseNavItems = [
  { path: '/staff/tasks', icon: ClipboardList, label: 'Tasks', badgeKey: 'tasks' },
  { path: '/staff/chat', icon: MessageCircle, label: 'Chat', badgeKey: 'chat' },
  { path: '/staff/logs', icon: PenSquare, label: 'Logs', badgeKey: null },
];

const leadItem = { path: '/staff/shift', icon: LayoutDashboard, label: 'Shift', badgeKey: null };
const staffHomeItem = { path: '/staff/my-shift', icon: Home, label: 'My Shift', badgeKey: null };

export const ShiftExecutionBottomNav = ({ tasksBadge = 0, chatBadge = 0, isLead = false }: ShiftExecutionBottomNavProps) => {
  const location = useLocation();
  const badges: Record<string, number> = { tasks: tasksBadge, chat: chatBadge };
  const navItems = isLead ? [leadItem, ...baseNavItems] : [staffHomeItem, ...baseNavItems];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label, badgeKey }) => {
          const isActive = location.pathname === path;
          const count = badgeKey ? badges[badgeKey] || 0 : 0;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <CountBadge count={count} className="absolute -top-2 -right-3 h-4 min-w-[16px] px-1" />
              </div>
              <span className={cn('text-xs', isActive && 'font-medium')}>{label}</span>
              {isActive && <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-full" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

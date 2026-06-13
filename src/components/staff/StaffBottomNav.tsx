import { ClipboardList, PenSquare, MessageCircle, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CountBadge } from '@/components/shared/CountBadge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface StaffBottomNavProps {
  tasksBadge?: number;
  chatBadge?: number;
  logsBadge?: number;
}

const baseNavItems: { path: string; icon: typeof ClipboardList; label: string; badgeKey: string | null }[] = [
  { path: '/staff/tasks', icon: ClipboardList, label: 'Tasks', badgeKey: 'tasks' },
  { path: '/staff/chat', icon: MessageCircle, label: 'Chat', badgeKey: 'chat' },
  { path: '/staff/logs', icon: PenSquare, label: 'Logs', badgeKey: 'logs' },
];

const dashboardItem = { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badgeKey: null };

export const StaffBottomNav = ({ tasksBadge = 0, chatBadge = 0, logsBadge = 0 }: StaffBottomNavProps) => {
  const { role, canAccessPage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const badges: Record<string, number> = { tasks: tasksBadge, chat: chatBadge, logs: logsBadge };

  const navItems = role === 'shift_lead' && canAccessPage('dashboard')
    ? [dashboardItem, ...baseNavItems]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label, badgeKey }) => {
          const isActive = location.pathname === path;
          const count = badgeKey ? badges[badgeKey] || 0 : 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
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
            </button>
          );
        })}
      </div>
    </nav>
  );
};

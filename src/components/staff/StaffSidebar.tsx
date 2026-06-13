import { ClipboardList, PenSquare, MessageCircle, Activity, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CountBadge } from '@/components/shared/CountBadge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface StaffSidebarProps {
  tasksBadge?: number;
  chatBadge?: number;
  logsBadge?: number;
}

const baseNavItems = [
  { path: '/staff/tasks', icon: ClipboardList, label: 'Tasks', badgeKey: 'tasks' as const },
  { path: '/staff/chat', icon: MessageCircle, label: 'Chat', badgeKey: 'chat' as const },
  { path: '/staff/logs', icon: PenSquare, label: 'Logs', badgeKey: 'logs' as const },
];

const dashboardItem = { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badgeKey: null };

export const StaffSidebar = ({ tasksBadge = 0, chatBadge = 0, logsBadge = 0 }: StaffSidebarProps) => {
  const { role, canAccessPage, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const badges: Record<string, number> = { tasks: tasksBadge, chat: chatBadge, logs: logsBadge };

  // Shift leads get a Dashboard tab if they have access
  const navItems = role === 'shift_lead' && canAccessPage('dashboard')
    ? [dashboardItem, ...baseNavItems]
    : baseNavItems;

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">Supreme Team Media</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ path, icon: Icon, label, badgeKey }) => {
          const isActive = location.pathname === path;
          const count = badgeKey ? badges[badgeKey] || 0 : 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              {isActive && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r" />}
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              <CountBadge count={count} />
            </button>
          );
        })}
      </nav>

      {/* User Profile + Sign Out */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {(user?.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm text-foreground truncate">{user?.email}</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

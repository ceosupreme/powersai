import { ReactNode } from 'react';
import { Activity, CalendarCheck, Lightbulb, DollarSign, Users as UsersIcon, Settings, Star, CheckSquare, ClipboardList, MessageCircle, PenSquare, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarSection } from './SidebarSection';
import { SidebarLink } from './SidebarLink';
import { GlobalHeader } from './GlobalHeader';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { useTaskBadgeCount } from '@/hooks/useTaskBadgeCount';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { VenueLeadershipBottomNav } from './VenueLeadershipBottomNav';
import { useOwnerMode } from '@/hooks/useOwnerMode';
import { getAllowedRoles } from '@/config/routes';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface VenueLeadershipLayoutProps {
  children: ReactNode;
}

export const VenueLeadershipLayout = ({ children }: VenueLeadershipLayoutProps) => {
  const { data: taskBadgeCount } = useTaskBadgeCount();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();
  const { currentRole, currentVenue, setCurrentVenue } = useRole();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const mode = useOwnerMode();

  const canAccess = (path: string) => {
    const roles = getAllowedRoles(path);
    if (roles && (!currentRole || !roles.includes(currentRole))) return false;

    // Owners drilling into a venue must still honor ownerMode flags
    if (currentRole === 'owner') {
      const pillarPaths = ['/sales', '/labor', '/operations', '/guest-experience'];
      const staffToolPaths = ['/tasks', '/logs', '/logs/new', '/chat'];
      if (pillarPaths.includes(path) && !mode.showPillarNav) return false;
      if (staffToolPaths.includes(path) && !mode.showStaffTools) return false;
    }
    return true;
  };
  

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <Link to="/weekly-review" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <span className="font-sans text-lg font-bold text-foreground tracking-tight">Bar Pulse</span>
            </Link>
            {currentRole === 'owner' && currentVenue && (
              <button
                onClick={() => {
                  setCurrentVenue(null);
                  navigate('/portfolio');
                }}
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Portfolio
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <SidebarSection title="Scorecard">
              {canAccess('/weekly-review') && <SidebarLink href="/weekly-review" icon={CalendarCheck}>Weekly Review</SidebarLink>}
              {canAccess('/insights') && <SidebarLink href="/insights" icon={Lightbulb}>Insights</SidebarLink>}

              {canAccess('/sales') && <SidebarLink href="/sales" icon={DollarSign}>Revenue</SidebarLink>}
              {canAccess('/labor') && <SidebarLink href="/labor" icon={UsersIcon}>Labor</SidebarLink>}
              {canAccess('/operations') && <SidebarLink href="/operations" icon={Settings}>Operations</SidebarLink>}
              {canAccess('/guest-experience') && <SidebarLink href="/guest-experience" icon={Star}>Guest Experience</SidebarLink>}
            </SidebarSection>

            {(canAccess('/tasks') || canAccess('/logs') || canAccess('/chat')) && (
              <SidebarSection title="Team Tools">
                {canAccess('/tasks') && <SidebarLink href="/tasks" icon={CheckSquare} badge={taskBadgeCount} badgeVariant="urgent">Tasks</SidebarLink>}
                {canAccess('/logs') && <SidebarLink href="/logs" icon={ClipboardList}>Logs</SidebarLink>}
                {canAccess('/chat') && <SidebarLink href="/chat" icon={MessageCircle} badge={chatUnreadCount}>Chat</SidebarLink>}
              </SidebarSection>
            )}
          </nav>

          {/* Quick Actions Footer */}
          {mode.showGMLogPrompts && (
            <div className="p-4 border-t border-sidebar-border space-y-2">
              <button
                onClick={() => navigate('/logs/new')}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <PenSquare className="h-4 w-4" />
                + Daily Log
              </button>
            </div>
          )}

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
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GlobalHeader showVenueSelector showDateSelector />
        <div className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      <FloatingAskButton />
      {isMobile && <VenueLeadershipBottomNav />}
    </div>
  );
};

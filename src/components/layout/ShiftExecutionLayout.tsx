import { ReactNode, useState, useMemo } from 'react';
import { Activity, CheckSquare, MessageCircle, AlertCircle, LayoutDashboard, Home, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SidebarSection } from './SidebarSection';
import { SidebarLink } from './SidebarLink';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { GlobalHeader } from './GlobalHeader';
import { StaffShiftBar } from '@/components/staff/StaffShiftBar';
import { ClockOutModal } from '@/components/staff/ClockOutModal';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStaffDepartment } from '@/hooks/useStaffDepartment';
import { useTaskBadgeCount } from '@/hooks/useTaskBadgeCount';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useTasks } from '@/hooks/useTasks';
import { useLogs } from '@/hooks/useLogs';
import { setClockStatus } from '@/data/staffMockData';
import { ShiftExecutionBottomNav } from './ShiftExecutionBottomNav';
import { isBefore, isToday, startOfDay } from 'date-fns';
import type { Task } from '@/types/tasks';
import type { LogEntry } from '@/types/logs';

interface ShiftExecutionLayoutProps {
  children: ReactNode;
}

export const ShiftExecutionLayout = ({ children }: ShiftExecutionLayoutProps) => {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user } = useAuth();
  const { selectedBar } = useApp();
  const isMobile = useIsMobile();
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const { department, setDepartment, hasBothDepartments } = useStaffDepartment();
  const { data: taskBadgeCount } = useTaskBadgeCount();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();

  const { data: allTasks = [] } = useTasks({ assignee: user?.id || 'all' });
  const { data: allLogs = [] } = useLogs(selectedBar?.id);

  const today = startOfDay(new Date());

  const remainingTasks = useMemo(() => {
    return allTasks
      .filter((t: Task) => t.status !== 'Done' && t.due_date && (isBefore(new Date(t.due_date), today) || isToday(new Date(t.due_date))))
      .map(t => ({ id: t.id, title: t.title }));
  }, [allTasks, today]);

  const dueLogNames = useMemo(() => {
    return allLogs
      .filter((l: LogEntry) => l.status === 'draft' && l.created_by === user?.id)
      .map((l: LogEntry) => l.log_type === 'gm_log' ? 'GM Log' : 'Shift Lead Log');
  }, [allLogs, user?.id]);

  const handleClockOut = () => {
    if (remainingTasks.length > 0 || dueLogNames.length > 0) {
      setClockOutModalOpen(true);
    } else {
      setClockStatus('out');
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <Link to="/staff/tasks" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <span className="font-sans text-lg font-bold text-foreground tracking-tight">Supreme Team Media</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <SidebarSection title="My Shift">
              {currentRole === 'lead' && (
                <SidebarLink href="/staff/shift" icon={LayoutDashboard}>Dashboard</SidebarLink>
              )}
              {(currentRole === 'foh' || currentRole === 'boh') && (
                <SidebarLink href="/staff/my-shift" icon={Home}>My Shift</SidebarLink>
              )}
              <SidebarLink href="/staff/tasks" icon={CheckSquare} badge={taskBadgeCount} badgeVariant="urgent">Tasks</SidebarLink>
            </SidebarSection>

            <SidebarSection title="Team">
              <SidebarLink href="/staff/chat" icon={MessageCircle} badge={chatUnreadCount}>Chat</SidebarLink>
            </SidebarSection>
          </nav>

          {/* Report Something Button */}
          <div className="p-4 border-t border-sidebar-border">
           <button
              onClick={() => navigate('/logs?intent=incident')}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <AlertCircle className="h-5 w-5" />
              🚨 Report Something
            </button>
          </div>

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GlobalHeader showVenueSelector={false} showDateSelector={false} />
        <StaffShiftBar
          department={department}
          setDepartment={setDepartment}
          hasBothDepartments={hasBothDepartments}
          onClockOut={handleClockOut}
        />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
            {children}
          </div>
        </main>

        {isMobile && (
          <ShiftExecutionBottomNav tasksBadge={taskBadgeCount || 0} chatBadge={chatUnreadCount} isLead={currentRole === 'lead'} />
        )}
      </div>

      <FloatingAskButton />

      
      <ClockOutModal
        open={clockOutModalOpen}
        onOpenChange={setClockOutModalOpen}
        remainingTasks={remainingTasks}
        dueLogNames={dueLogNames}
        onClockOutAnyway={() => window.location.reload()}
      />
    </div>
  );
};

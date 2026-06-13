import { ReactNode, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { StaffTopBar } from './StaffTopBar';
import { StaffBottomNav } from './StaffBottomNav';
import { StaffSidebar } from './StaffSidebar';
import { StaffShiftBar } from './StaffShiftBar';
import { ClockOutModal } from './ClockOutModal';
import { NotificationPanel } from './NotificationPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStaffDepartment } from '@/hooks/useStaffDepartment';
import { useTasks } from '@/hooks/useTasks';
import { useLogs } from '@/hooks/useLogs';
import { useChannels } from '@/hooks/useChannels';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { setClockStatus } from '@/data/staffMockData';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { isBefore, isToday, startOfDay } from 'date-fns';
import type { Task } from '@/types/tasks';
import type { LogEntry } from '@/types/logs';

export const StaffLayout = () => {
  const isMobile = useIsMobile();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const { department, setDepartment, hasBothDepartments } = useStaffDepartment();

  const { user } = useAuth();
  const { selectedBar } = useApp();
  const { data: allTasks = [] } = useTasks({ assignee: user?.id || 'all' });
  const { data: allLogs = [] } = useLogs(selectedBar?.id);
  const { channels } = useChannels();

  const today = startOfDay(new Date());

  // Compute badge counts
  const tasksBadge = useMemo(() => {
    return allTasks.filter((t: Task) => {
      if (t.status === 'Done') return false;
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return isBefore(d, today) || isToday(d);
    }).length;
  }, [allTasks, today]);

  const logsBadge = useMemo(() => {
    return allLogs.filter((l: LogEntry) => l.status === 'draft' && l.created_by === user?.id).length;
  }, [allLogs, user?.id]);

  const chatBadge = useMemo(() => {
    return channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0);
  }, [channels]);

  // Clock-out compliance data
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
      window.location.reload(); // Simple refresh to update clock state
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <StaffSidebar tasksBadge={tasksBadge} chatBadge={chatBadge} logsBadge={logsBadge} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <StaffTopBar onNotificationsClick={() => setNotificationsOpen(true)} />

        <StaffShiftBar
          department={department}
          setDepartment={setDepartment}
          hasBothDepartments={hasBothDepartments}
          onClockOut={handleClockOut}
        />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
            <Outlet context={{ department }} />
          </div>
        </main>

        {isMobile && (
          <StaffBottomNav tasksBadge={tasksBadge} chatBadge={chatBadge} logsBadge={logsBadge} />
        )}
      </div>

      <FloatingAskButton />

      <NotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

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

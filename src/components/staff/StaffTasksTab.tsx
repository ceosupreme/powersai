import { useState, useMemo } from 'react';
import { Check, Circle, ChevronDown, ChevronRight, Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useLogs } from '@/hooks/useLogs';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useChannels } from '@/hooks/useChannels';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { isToday, isBefore, startOfDay, format } from 'date-fns';
import { StaffAnnouncementBanner } from './StaffAnnouncementBanner';
import { StaffRequiredStrip } from './StaffRequiredStrip';
import type { Task, TaskPriority } from '@/types/tasks';
import type { LogEntry } from '@/types/logs';
import type { Department } from '@/hooks/useStaffDepartment';

interface StaffTasksTabProps {
  department: Department;
}

export const StaffTasksTab = ({ department }: StaffTasksTabProps) => {
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const { user } = useAuth();
  const { selectedBar } = useApp();
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks({ assignee: user?.id || 'all' });
  const { data: allLogs = [], isLoading: logsLoading } = useLogs(selectedBar?.id);
  const { channels } = useChannels();
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLoading = tasksLoading || logsLoading;
  const today = startOfDay(new Date());

  // Filter tasks (not Done)
  const activeTasks = allTasks.filter(t => t.status !== 'Done');
  const completedToday = allTasks.filter(t => t.status === 'Done' && t.completed_at && isToday(new Date(t.completed_at)));

  // Group by urgency
  const { nowTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    const now: Task[] = [];
    const overdue: Task[] = [];
    const upcoming: Task[] = [];

    activeTasks.forEach(task => {
      if (!task.due_date) {
        upcoming.push(task);
        return;
      }
      const dueDate = new Date(task.due_date);
      if (isBefore(dueDate, today)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        now.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { nowTasks: now, overdueTasks: overdue, upcomingTasks: upcoming };
  }, [activeTasks, today]);

  // Due logs as task-like items in NOW section
  const dueLogItems = useMemo(() => {
    return allLogs
      .filter((log: LogEntry) => log.status === 'draft' && log.created_by === user?.id)
      .map((log: LogEntry) => ({
        id: `log-${log.id}`,
        title: `Complete ${log.log_type === 'gm_log' ? 'GM Log' : 'Shift Lead Log'}`,
        due: 'Due by close',
        isLog: true,
      }));
  }, [allLogs, user?.id]);

  // Badge counts for required strip
  const unreadChat = useMemo(() => {
    return channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0);
  }, [channels]);

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    setCompletingTaskId(taskId);
    try {
      if (currentStatus === 'Done') {
        await updateTask.mutateAsync({ id: taskId, updates: { status: 'Todo', completed_at: null } });
      } else {
        await updateTask.mutateAsync({ id: taskId, updates: { status: 'Done', completed_at: new Date().toISOString() } });
        toast({
          title: 'Task completed',
          description: 'Nice work!',
          action: (
            <button
              className="text-xs text-primary font-medium hover:underline"
              onClick={async () => {
                await updateTask.mutateAsync({ id: taskId, updates: { status: 'Todo', completed_at: null } });
              }}
            >
              Undo
            </button>
          ),
        });
      }
    } finally {
      setCompletingTaskId(null);
    }
  };

  const priorityColors: Record<TaskPriority, string> = {
    Critical: 'bg-destructive',
    High: 'bg-gold',
    Medium: 'bg-blue-500',
    Low: 'bg-muted-foreground',
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const isCompleting = completingTaskId === task.id;
    return (
      <Card className="card-interactive">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleToggleComplete(task.id, task.status)}
              disabled={isCompleting}
              className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 border-muted-foreground/50 hover:border-primary transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isCompleting ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-transparent" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityColors[task.priority])} />
                <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {task.due_date && (
                  <span className={cn(
                    isBefore(new Date(task.due_date), today) ? 'text-destructive' : 'text-gold'
                  )}>
                    {isToday(new Date(task.due_date)) ? 'Due today' : isBefore(new Date(task.due_date), today) ? 'Overdue' : format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-6 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Announcement Banner */}
      <StaffAnnouncementBanner department={department} />

      {/* Required Strip */}
      <StaffRequiredStrip
        overdueCount={overdueTasks.length}
        logsDueCount={dueLogItems.length}
        unreadChat={unreadChat}
      />

      {/* NOW Section */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-sm">
          <span className="font-semibold text-foreground">🔥 Now</span>
          <Badge variant="secondary" className="text-xs">{nowTasks.length + dueLogItems.length}</Badge>
        </div>
        {nowTasks.length === 0 && dueLogItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-6 text-center">
              <p className="text-sm text-muted-foreground">Nothing urgent right now ✓</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Due logs as task-like items */}
            {dueLogItems.map(item => (
              <button key={item.id} className="w-full" onClick={() => navigate('/staff/logs')}>
                <Card className="card-interactive border-l-2 border-l-gold">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-gold/20 flex-shrink-0">
                        <FileText className="h-4 w-4 text-gold" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-gold">{item.due}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
            {nowTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </section>

      {/* OVERDUE Section */}
      {overdueTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="font-semibold text-destructive">⚠ Overdue</span>
            <Badge variant="destructive" className="text-xs">{overdueTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        </section>
      )}

      {/* UPCOMING Section */}
      {upcomingTasks.length > 0 && (
        <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            {upcomingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Upcoming</span>
            <Badge variant="secondary" className="text-xs">{upcomingTasks.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {upcomingTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* COMPLETED TODAY */}
      {completedToday.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            {completedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Completed Today</span>
            <Badge variant="secondary" className="text-xs">{completedToday.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {completedToday.map(task => (
              <Card key={task.id} className="opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

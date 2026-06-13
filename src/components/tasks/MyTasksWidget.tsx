import { useMyTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { CheckSquare, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, isToday } from 'date-fns';

interface MyTasksWidgetProps {
  maxItems?: number;
  onTaskClick?: (taskId: string) => void;
}

export const MyTasksWidget = ({ maxItems = 5, onTaskClick }: MyTasksWidgetProps) => {
  const { data: tasks, isLoading, error } = useMyTasks();

  // Sort tasks: overdue first, then by due date
  const sortedTasks = tasks?.slice().sort((a, b) => {
    const aOverdue = a.due_date && isPast(parseISO(a.due_date)) && a.status !== 'Done';
    const bOverdue = b.due_date && isPast(parseISO(b.due_date)) && b.status !== 'Done';
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return 0;
  });

  const displayTasks = sortedTasks?.slice(0, maxItems) || [];
  const overdueCount = tasks?.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'Done').length || 0;
  const dueTodayCount = tasks?.filter(t => t.due_date && isToday(parseISO(t.due_date))).length || 0;

  if (isLoading) {
    return (
      <div className="card-metric p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail
  }

  return (
    <div className="card-metric p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">My Tasks</h3>
          {tasks && tasks.length > 0 && (
            <span className="text-sm text-muted-foreground">({tasks.length})</span>
          )}
        </div>
        <Link to="/tasks">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      {(overdueCount > 0 || dueTodayCount > 0) && (
        <div className="flex gap-3 mb-4">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdueCount} overdue
            </div>
          )}
          {dueTodayCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange/10 text-orange text-xs font-medium">
              {dueTodayCount} due today
            </div>
          )}
        </div>
      )}

      {/* Task list */}
      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No tasks assigned to you</p>
          <Link to="/tasks">
            <Button variant="outline" size="sm" className="mt-3">
              Browse Tasks
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              compact 
              onClick={() => onTaskClick?.(task.id)}
            />
          ))}
          {tasks.length > maxItems && (
            <Link to="/tasks" className="block">
              <div className="text-center py-2 text-sm text-primary hover:text-primary/80 transition-colors">
                +{tasks.length - maxItems} more tasks
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

import { useTaskCounts } from '@/hooks/useTasks';
import { Circle, PlayCircle, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export const TaskStatsRow = () => {
  const { data: counts, isLoading } = useTaskCounts();

  const stats = [
    {
      label: 'Total',
      value: counts?.total || 0,
      icon: ListTodo,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'Todo',
      value: counts?.todo || 0,
      icon: Circle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: 'In Progress',
      value: counts?.inProgress || 0,
      icon: PlayCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Done',
      value: counts?.done || 0,
      icon: CheckCircle2,
      color: 'text-signal-green',
      bgColor: 'bg-signal-green/10',
    },
    {
      label: 'Overdue',
      value: counts?.overdue || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      highlight: (counts?.overdue || 0) > 0,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'p-4 rounded-lg border border-border',
              stat.bgColor,
              stat.highlight && 'ring-2 ring-destructive/30'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Icon className={cn('w-5 h-5', stat.color)} />
              <span className={cn('text-2xl font-bold', stat.color)}>{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
};

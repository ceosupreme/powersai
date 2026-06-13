import { Task } from '@/types/tasks';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Calendar, Clock, User, CheckCircle2, Circle, PlayCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const priorityBorderColors: Record<string, string> = {
  Critical: 'border-destructive/50',
  High: 'border-orange/50',
  Medium: 'border-gold/50',
  Low: 'border-blue/50',
};

const priorityHoverGlowColors: Record<string, string> = {
  Critical: 'hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  High: 'hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]',
  Medium: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  Low: 'hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]',
};

const priorityPillColors: Record<string, string> = {
  Critical: 'bg-destructive/20 text-destructive',
  High: 'bg-orange/20 text-orange',
  Medium: 'bg-gold/20 text-gold',
  Low: 'bg-blue/20 text-blue',
};

const statusIcons: Record<string, React.ReactNode> = {
  'Todo': <Circle className="w-4 h-4 text-muted-foreground" />,
  'In Progress': <PlayCircle className="w-4 h-4 text-primary" />,
  'Done': <CheckCircle2 className="w-4 h-4 text-signal-green" />,
};

const statusColors: Record<string, string> = {
  'Todo': 'text-muted-foreground',
  'In Progress': 'text-primary',
  'Done': 'text-signal-green',
};

export const TaskCard = ({ task, onClick, compact = false, selectable = false, selected = false, onSelectToggle }: TaskCardProps) => {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'Done';
  const isDueToday = task.due_date && isToday(parseISO(task.due_date));

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToggle?.(task.id);
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'p-3 bg-card border rounded-xl cursor-pointer transition-all duration-200 touch-manipulation',
          'hover-lift active:scale-[0.98]',
          priorityBorderColors[task.priority],
          priorityHoverGlowColors[task.priority],
          task.status === 'Done' && 'opacity-60'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectable && (
              <div onClick={handleCheckboxClick}>
                <Checkbox checked={selected} className="shrink-0" />
              </div>
            )}
            {statusIcons[task.status]}
            <span className={cn('truncate text-sm font-medium', task.status === 'Done' && 'line-through')}>
              {task.title}
            </span>
          </div>
          {task.assignee && (
            <Avatar className="h-6 w-6 shrink-0 ring-2 ring-background">
              <AvatarImage src={task.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                {getInitials(task.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 bg-card border rounded-xl cursor-pointer transition-all duration-200 touch-manipulation',
        'hover-lift active:scale-[0.99]',
        priorityBorderColors[task.priority],
        priorityHoverGlowColors[task.priority],
        task.status === 'Done' && 'opacity-60'
      )}
    >
      {/* Header with priority and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <div onClick={handleCheckboxClick}>
              <Checkbox checked={selected} className="shrink-0" />
            </div>
          )}
          <span className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-semibold',
            priorityPillColors[task.priority]
          )}>
            {task.priority}
          </span>
          <div className={cn('flex items-center gap-1.5 text-xs', statusColors[task.status])}>
            {statusIcons[task.status]}
            <span className="font-medium">{task.status}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground font-medium mb-1', task.status === 'Done' && 'line-through')}>
        {task.title}
      </h3>

      {/* Insight-linked badge */}
      {task.action_card_id && (
        <div className="flex items-center gap-1 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-primary/10 text-primary">
            <Lightbulb className="w-3 h-3" />
            From Insight
          </span>
        </div>
      )}

      {/* Description preview */}
      {task.description && (
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg',
                isOverdue && 'text-destructive bg-destructive/10',
                isDueToday && !isOverdue && 'text-orange bg-orange/10',
                !isOverdue && !isDueToday && 'bg-muted/50'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {isOverdue ? 'Overdue' : formatDate(task.due_date)}
            </span>
          )}
          {task.estimated_minutes && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50">
              <Clock className="w-3.5 h-3.5" />
              {task.estimated_minutes}m
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-7 w-7 ring-2 ring-background">
              <AvatarImage src={task.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                {getInitials(task.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
              {task.assignee.full_name?.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30">
            <User className="w-3.5 h-3.5" />
            Unassigned
          </span>
        )}
      </div>
    </div>
  );
};

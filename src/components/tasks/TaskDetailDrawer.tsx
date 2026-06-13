import { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, UpdateTaskInput } from '@/types/tasks';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTaskActivity } from '@/hooks/useTaskActivity';
import { TaskComments } from './TaskComments';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format, parseISO as parseISODate } from 'date-fns';
import { Calendar, Clock, Trash2, Loader2, CheckCircle2, Circle, PlayCircle, User, History, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityOptions: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low'];
const statusOptions: TaskStatus[] = ['Todo', 'In Progress', 'Done'];

const priorityColors: Record<string, string> = {
  Critical: 'text-destructive',
  High: 'text-orange',
  Medium: 'text-gold',
  Low: 'text-blue',
};

const statusIcons: Record<string, React.ReactNode> = {
  Todo: <Circle className="w-4 h-4" />,
  'In Progress': <PlayCircle className="w-4 h-4" />,
  Done: <CheckCircle2 className="w-4 h-4" />,
};

export const TaskDetailDrawer = ({ task, open, onOpenChange }: TaskDetailDrawerProps) => {
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { data: teamMembers } = useTeamMembers();
  const { data: activities = [] } = useTaskActivity(task?.id || null);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeId(task.assignee_id || '');
      setDueDate(task.due_date || '');
      setEstimatedMinutes(task.estimated_minutes?.toString() || '');
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    const updates: UpdateTaskInput = {
      title,
      description: description || null,
      priority,
      status,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    };

    updateTask(
      { id: task.id, updates },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask(task.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (task) {
      updateTask({ id: task.id, updates: { status: newStatus } });
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

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Edit Task</SheetTitle>
          <SheetDescription className="text-left">
            Make changes to your task here.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick status buttons */}
          <div className="flex gap-2">
            {statusOptions.map((s) => (
              <Button
                key={s}
                variant={status === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(s)}
                className={cn(
                  'flex-1',
                  status === s && s === 'Done' && 'bg-signal-green hover:bg-signal-green/90'
                )}
              >
                {statusIcons[s]}
                <span className="ml-1.5">{s}</span>
              </Button>
            ))}
          </div>

          <Separator />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="bg-card border-border resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Priority & Assignee row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={priorityColors[p]}>{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId || 'unassigned'} onValueChange={(v) => setAssigneeId(v === 'unassigned' ? '' : v)}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date & Time estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-9 bg-card border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimate">Time Estimate (min)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="estimate"
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="pl-9 bg-card border-border"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Meta info */}
          <div className="text-xs text-muted-foreground space-y-1">
            {task.creator && (
              <p>Created by {task.creator.full_name} on {format(parseISODate(task.created_at), 'MMM d, yyyy')}</p>
            )}
            {task.completed_at && (
              <p className="text-signal-green">Completed on {format(parseISODate(task.completed_at), 'MMM d, yyyy')}</p>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <TaskComments taskId={task.id} />

          <Separator />

          {/* Activity Timeline */}
          {activities.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Activity ({activities.length})
                </div>
                <div className="relative pl-4 border-l-2 border-border/50 space-y-3">
                  {(showAllActivity ? activities : activities.slice(0, 5)).map((activity) => (
                    <div key={activity.id} className="relative flex items-start gap-2">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-muted-foreground/40 ring-2 ring-background" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {activity.user?.full_name || 'System'}
                          </span>{' '}
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {activities.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="text-xs text-muted-foreground w-full"
                  >
                    <ChevronDown className={cn('w-3 h-3 mr-1 transition-transform', showAllActivity && 'rotate-180')} />
                    {showAllActivity ? 'Show less' : `Show all ${activities.length} entries`}
                  </Button>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isUpdating || !title.trim()} className="flex-1">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

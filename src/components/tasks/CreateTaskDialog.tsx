import { useState } from 'react';
import { CreateTaskInput, TaskPriority, TaskStatus } from '@/types/tasks';
import { useCreateTask } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBarId?: string;
}

const priorityOptions: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low'];

const priorityColors: Record<string, string> = {
  Critical: 'text-destructive',
  High: 'text-orange',
  Medium: 'text-gold',
  Low: 'text-blue',
};

export const CreateTaskDialog = ({ open, onOpenChange, defaultBarId }: CreateTaskDialogProps) => {
  const { mutate: createTask, isPending } = useCreateTask();
  const { data: teamMembers } = useTeamMembers();
  const { accessibleBars, selectedBar } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [barId, setBarId] = useState(defaultBarId || selectedBar?.id || '');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setAssigneeId('');
    setDueDate('');
    setEstimatedMinutes('');
    setBarId(defaultBarId || selectedBar?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !barId) return;

    const input: CreateTaskInput = {
      bar_id: barId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee_id: assigneeId || undefined,
      due_date: dueDate || undefined,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
    };

    createTask(input, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to your list.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="create-title">Title *</Label>
            <Input
              id="create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-card border-border"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-card border-border resize-none"
              placeholder="Add details..."
            />
          </div>

          {/* Bar selector (if multiple bars) */}
          {accessibleBars && accessibleBars.length > 1 && (
            <div className="space-y-2">
              <Label>Bar *</Label>
              <Select value={barId} onValueChange={setBarId}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Select a bar" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleBars.map((bar) => (
                    <SelectItem key={bar.id} value={bar.id}>
                      {bar.bar_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority & Assignee */}
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

          {/* Due date & Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-due">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="create-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-9 bg-card border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-estimate">Estimate (min)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="create-estimate"
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="pl-9 bg-card border-border"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !barId} className="flex-1">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

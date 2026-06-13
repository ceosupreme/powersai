import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFiltersComponent } from '@/components/tasks/TaskFilters';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskStatsRow } from '@/components/tasks/TaskStatsRow';
import { BatchTaskBar } from '@/components/tasks/BatchTaskBar';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { Task, TaskFilters, TaskSort } from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ListTodo, LayoutGrid, CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const Tasks = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    bar: 'all',
    dueDate: 'all',
    search: '',
  });
  const [sort, setSort] = useState<TaskSort>({ field: 'due_date', direction: 'asc' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const { data: tasks, isLoading, error } = useTasks(filters, sort);
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Handle deep link to specific task
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setDrawerOpen(true);
      }
    }
  }, [searchParams, tasks]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!tasks) return;
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  }, [tasks, selectedTaskIds.size]);

  const handleBatchMarkDone = async () => {
    setIsBatchProcessing(true);
    try {
      for (const id of selectedTaskIds) {
        await updateTask({ id, updates: { status: 'Done' } });
      }
      toast({ title: `${selectedTaskIds.size} tasks marked done` });
      setSelectedTaskIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to update some tasks.', variant: 'destructive' });
    }
    setIsBatchProcessing(false);
  };

  const handleBatchMarkInProgress = async () => {
    setIsBatchProcessing(true);
    try {
      for (const id of selectedTaskIds) {
        await updateTask({ id, updates: { status: 'In Progress' } });
      }
      toast({ title: `${selectedTaskIds.size} tasks updated` });
      setSelectedTaskIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to update some tasks.', variant: 'destructive' });
    }
    setIsBatchProcessing(false);
  };

  const handleBatchDelete = async () => {
    setIsBatchProcessing(true);
    try {
      for (const id of selectedTaskIds) {
        await deleteTask(id);
      }
      toast({ title: `${selectedTaskIds.size} tasks deleted` });
      setSelectedTaskIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to delete some tasks.', variant: 'destructive' });
    }
    setIsBatchProcessing(false);
  };

  const selectable = selectedTaskIds.size > 0;

  // Group tasks by status for grid view
  const groupedTasks = {
    Todo: tasks?.filter((t) => t.status === 'Todo') || [],
    'In Progress': tasks?.filter((t) => t.status === 'In Progress') || [],
    Done: tasks?.filter((t) => t.status === 'Done') || [],
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
              <p className="text-muted-foreground text-sm">Manage and track your team's tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Select all toggle */}
            {tasks && tasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs text-muted-foreground"
              >
                <Checkbox
                  checked={tasks.length > 0 && selectedTaskIds.size === tasks.length}
                  className="mr-1.5"
                />
                {selectedTaskIds.size === tasks.length ? 'Deselect' : 'Select All'}
              </Button>
            )}
            {/* View toggle */}
            <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 rounded-lg transition-all',
                  viewMode === 'list' && 'bg-card shadow-sm text-foreground'
                )}
              >
                <ListTodo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 rounded-lg transition-all',
                  viewMode === 'grid' && 'bg-card shadow-sm text-foreground'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up stagger-1">
          <TaskStatsRow />
        </div>

        {/* Filters */}
        <div className="animate-fade-in-up stagger-2">
          <TaskFiltersComponent filters={filters} sort={sort} onFiltersChange={setFilters} onSortChange={setSort} />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
            <p>Failed to load tasks. Please try again.</p>
          </div>
        ) : tasks && tasks.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-b from-muted/30 to-transparent rounded-xl border border-border/30 animate-fade-in-up">
            <ListTodo className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No tasks found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {filters.search || filters.status !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3 animate-fade-in-up stagger-3">
            {tasks?.map((task, index) => (
              <div key={task.id} style={{ animationDelay: `${index * 50}ms` }}>
                <TaskCard
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  selectable={selectable}
                  selected={selectedTaskIds.has(task.id)}
                  onSelectToggle={handleSelectToggle}
                />
              </div>
            ))}
          </div>
        ) : (
          // Grid/Kanban-style view
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up stagger-3">
            {(['Todo', 'In Progress', 'Done'] as const).map((status) => (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between p-2">
                  <h3 className="font-semibold text-foreground">{status}</h3>
                  <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    {groupedTasks[status].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px] p-3 bg-muted/20 rounded-xl border border-border/30">
                  {groupedTasks[status].length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No tasks</p>
                  ) : (
                    groupedTasks[status].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        compact
                        selectable={selectable}
                        selected={selectedTaskIds.has(task.id)}
                        onSelectToggle={handleSelectToggle}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <Button
        onClick={() => setCreateDialogOpen(true)}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full shadow-xl hover:shadow-2xl z-40 p-0"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Batch Action Bar */}
      <BatchTaskBar
        selectedCount={selectedTaskIds.size}
        onMarkDone={handleBatchMarkDone}
        onMarkInProgress={handleBatchMarkInProgress}
        onDelete={handleBatchDelete}
        onClearSelection={() => setSelectedTaskIds(new Set())}
        isProcessing={isBatchProcessing}
      />

      {/* Drawers/Dialogs */}
      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onOpenChange={setDrawerOpen} />
      <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
};

export default Tasks;

import { TaskFilters as TaskFiltersType, TaskPriority, TaskStatus, TaskSort, TaskSortField, TaskSortDirection } from '@/types/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ArrowUpDown, Filter } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useApp } from '@/context/AppContext';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  sort: TaskSort;
  onFiltersChange: (filters: TaskFiltersType) => void;
  onSortChange: (sort: TaskSort) => void;
}

export const TaskFiltersComponent = ({ filters, sort, onFiltersChange, onSortChange }: TaskFiltersProps) => {
  const { data: teamMembers } = useTeamMembers();
  const { accessibleBars } = useApp();

  const hasActiveFilters =
    (filters.status && filters.status !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.assignee && filters.assignee !== 'all') ||
    (filters.bar && filters.bar !== 'all') ||
    (filters.dueDate && filters.dueDate !== 'all') ||
    filters.search;

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      assignee: 'all',
      bar: 'all',
      dueDate: 'all',
      search: '',
    });
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-card border-border h-10"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        {/* Status */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as TaskStatus | 'all' })}
        >
          <SelectTrigger className="w-[100px] sm:w-[130px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Todo">Todo</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value as TaskPriority | 'all' })}
        >
          <SelectTrigger className="w-[100px] sm:w-[130px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Due Date */}
        <Select
          value={filters.dueDate || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, dueDate: value as TaskFiltersType['dueDate'] })}
        >
          <SelectTrigger className="w-[95px] sm:w-[130px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <SelectValue placeholder="Due" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
          </SelectContent>
        </Select>

        {/* Assignee */}
        <Select
          value={filters.assignee || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, assignee: value })}
        >
          <SelectTrigger className="w-[110px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name || member.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bar filter */}
        {accessibleBars && accessibleBars.length > 1 && (
          <Select
            value={filters.bar || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, bar: value })}
          >
            <SelectTrigger className="w-[100px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
              <SelectValue placeholder="Bar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
            {accessibleBars.map((bar) => (
              <SelectItem key={bar.id} value={bar.id}>
                {bar.bar_name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <Select
          value={`${sort.field}-${sort.direction}`}
          onValueChange={(value) => {
            const [field, direction] = value.split('-') as [TaskSortField, TaskSortDirection];
            onSortChange({ field, direction });
          }}
        >
          <SelectTrigger className="w-[110px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_date-asc">Due Date ↑</SelectItem>
            <SelectItem value="due_date-desc">Due Date ↓</SelectItem>
            <SelectItem value="priority-asc">Priority ↑</SelectItem>
            <SelectItem value="priority-desc">Priority ↓</SelectItem>
            <SelectItem value="created_at-desc">Newest</SelectItem>
            <SelectItem value="created_at-asc">Oldest</SelectItem>
            <SelectItem value="title-asc">Title A-Z</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9 sm:h-10 px-2 sm:px-3">
            <X className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}
      </div>
    </div>
  );
};

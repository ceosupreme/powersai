// Task types for native task manager

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  bar_id: string;
  action_card_id?: string | null;
  title: string;
  description?: string | null;
  assignee_id?: string | null;
  created_by?: string | null;
  due_date?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_minutes?: number | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CommentMention {
  user_id: string;
  display_name: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  mentions?: CommentMention[] | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateTaskInput {
  bar_id: string;
  action_card_id?: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimated_minutes?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimated_minutes?: number | null;
  completed_at?: string | null;
}

// Filter types
export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assignee?: string | 'all' | 'unassigned';
  bar?: string | 'all';
  dueDate?: 'overdue' | 'today' | 'this-week' | 'all';
  search?: string;
}

export type TaskSortField = 'due_date' | 'priority' | 'status' | 'created_at' | 'title';
export type TaskSortDirection = 'asc' | 'desc';

export interface TaskSort {
  field: TaskSortField;
  direction: TaskSortDirection;
}

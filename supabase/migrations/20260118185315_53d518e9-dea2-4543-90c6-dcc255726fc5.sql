-- Create enums for task priority and status
CREATE TYPE public.task_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE public.task_status AS ENUM ('Todo', 'In Progress', 'Done');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT NOT NULL,
  action_card_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Todo',
  estimated_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_activity table for audit log
CREATE TABLE public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_tasks_bar_id ON public.tasks(bar_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_activity_task_id ON public.task_activity(task_id);

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user has access to a bar
CREATE OR REPLACE FUNCTION public.user_has_bar_access(_user_id UUID, _bar_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bar_assignments
    WHERE user_id = _user_id AND bar_id = _bar_id
  ) OR public.has_role(_user_id, 'admin')
$$;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for their bars"
ON public.tasks FOR SELECT
USING (public.user_has_bar_access(auth.uid(), bar_id));

CREATE POLICY "Users can create tasks for their bars"
ON public.tasks FOR INSERT
WITH CHECK (public.user_has_bar_access(auth.uid(), bar_id));

CREATE POLICY "Users can update tasks for their bars"
ON public.tasks FOR UPDATE
USING (public.user_has_bar_access(auth.uid(), bar_id))
WITH CHECK (public.user_has_bar_access(auth.uid(), bar_id));

CREATE POLICY "Users can delete tasks for their bars"
ON public.tasks FOR DELETE
USING (public.user_has_bar_access(auth.uid(), bar_id));

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on accessible tasks"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_has_bar_access(auth.uid(), t.bar_id)
  )
);

CREATE POLICY "Users can create comments on accessible tasks"
ON public.task_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_has_bar_access(auth.uid(), t.bar_id)
  )
);

CREATE POLICY "Users can update their own comments"
ON public.task_comments FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.task_comments FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for task_activity
CREATE POLICY "Users can view activity on accessible tasks"
ON public.task_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_has_bar_access(auth.uid(), t.bar_id)
  )
);

CREATE POLICY "Users can create activity on accessible tasks"
ON public.task_activity FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_has_bar_access(auth.uid(), t.bar_id)
  )
);

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on task_comments
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
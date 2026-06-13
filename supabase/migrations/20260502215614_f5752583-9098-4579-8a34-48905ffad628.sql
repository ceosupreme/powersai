ALTER TABLE public.weekly_core
  ADD COLUMN IF NOT EXISTS tasks_open_backlog INTEGER,
  ADD COLUMN IF NOT EXISTS tasks_status TEXT;
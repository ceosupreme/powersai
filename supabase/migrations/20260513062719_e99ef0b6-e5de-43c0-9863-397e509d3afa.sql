ALTER TABLE public.weekly_core
  ADD COLUMN IF NOT EXISTS tasks_total_assigned INT,
  ADD COLUMN IF NOT EXISTS tasks_total_outstanding INT,
  ADD COLUMN IF NOT EXISTS tasks_completed_this_week INT;
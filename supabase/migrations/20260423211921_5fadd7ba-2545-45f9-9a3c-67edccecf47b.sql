-- Add task performance columns to weekly_core
ALTER TABLE public.weekly_core
  ADD COLUMN IF NOT EXISTS tasks_in_red INT NULL,
  ADD COLUMN IF NOT EXISTS tasks_on_time INT NULL,
  ADD COLUMN IF NOT EXISTS on_time_rate NUMERIC NULL;

-- Cache table for AI-generated task performance briefs
CREATE TABLE IF NOT EXISTS public.task_performance_briefs (
  bar_id UUID NOT NULL,
  week_id UUID NOT NULL,
  short_brief TEXT,
  long_brief TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bar_id, week_id)
);

ALTER TABLE public.task_performance_briefs ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins manage task_performance_briefs"
  ON public.task_performance_briefs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Venue-scoped read for assigned users
CREATE POLICY "Users view briefs for their bars"
  ON public.task_performance_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_bar_access(auth.uid(), bar_id::text)
  );

-- Service role (edge functions) bypasses RLS automatically; no policy needed.

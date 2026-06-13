CREATE TABLE IF NOT EXISTS public.employee_performance_briefs (
  bar_id UUID NOT NULL,
  week_id UUID NOT NULL,
  short_brief TEXT,
  long_brief TEXT,
  is_quiet BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bar_id, week_id)
);

ALTER TABLE public.employee_performance_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage employee_performance_briefs"
  ON public.employee_performance_briefs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view employee perf briefs for their bars"
  ON public.employee_performance_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_bar_access(auth.uid(), bar_id::text)
  );
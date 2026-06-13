CREATE TABLE public.insight_employees (
  insight_id    UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'subject' CHECK (role IN ('subject','witness','recognizer')),
  employee_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (insight_id, employee_id, role)
);

CREATE INDEX idx_insight_employees_employee ON public.insight_employees(employee_id);
CREATE INDEX idx_insight_employees_insight  ON public.insight_employees(insight_id);

ALTER TABLE public.insight_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_insight_employees"
ON public.insight_employees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "venue_users_view_insight_employees"
ON public.insight_employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insights i
    WHERE i.id = insight_employees.insight_id
      AND i.bar_id = ANY (public.user_venue_ids())
  )
);

CREATE POLICY "venue_users_insert_insight_employees"
ON public.insight_employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.insights i
    WHERE i.id = insight_employees.insight_id
      AND i.bar_id = ANY (public.user_venue_ids())
  )
);
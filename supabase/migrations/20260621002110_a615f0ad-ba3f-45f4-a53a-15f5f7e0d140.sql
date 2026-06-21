
CREATE TABLE public.recovery_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_dollars numeric NOT NULL DEFAULT 0,
  estimate_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative text,
  narrative_edited boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','sent')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  sent_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, period_start)
);

GRANT SELECT, UPDATE ON public.recovery_reports TO authenticated;
GRANT ALL ON public.recovery_reports TO service_role;

ALTER TABLE public.recovery_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recovery reports for their projects"
  ON public.recovery_reports FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE POLICY "Users can update recovery reports for their projects"
  ON public.recovery_reports FOR UPDATE TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "Service role manages recovery reports"
  ON public.recovery_reports FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER recovery_reports_updated_at
  BEFORE UPDATE ON public.recovery_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_recovery_reports_project_period
  ON public.recovery_reports(project_id, period_start DESC);
CREATE INDEX idx_recovery_reports_status
  ON public.recovery_reports(status) WHERE status = 'draft';

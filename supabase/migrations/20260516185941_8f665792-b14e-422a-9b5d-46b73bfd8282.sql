-- ====================================================================
-- Session 1 observability: suppressed metric coverage gates
-- Mirrors suppressed_insights pattern. Lets UI explain "—" tiles.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.suppressed_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text,
  venue_id uuid,
  week_start date NOT NULL,
  metric_key text NOT NULL,
  gate text NOT NULL,                -- 'E3'|'E4'|'E5'|'coverage_gate'|'coverage_gate_value'
  reason text NOT NULL,
  days_present integer,
  valid_days integer,
  threshold numeric,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppressed_metrics_venue_week
  ON public.suppressed_metrics (venue_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_suppressed_metrics_bar_week
  ON public.suppressed_metrics (bar_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_suppressed_metrics_created
  ON public.suppressed_metrics (created_at DESC);

ALTER TABLE public.suppressed_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only read; service role writes (service role bypasses RLS).
CREATE POLICY "Admins can read suppressed_metrics"
  ON public.suppressed_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
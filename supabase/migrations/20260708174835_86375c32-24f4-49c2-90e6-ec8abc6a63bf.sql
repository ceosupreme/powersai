-- Leak Stack Engine schema

-- 1. Add risk columns to leak vector template + overrides (REPLACE resolver needs full shape)
ALTER TABLE public.project_type_leak_vectors
  ADD COLUMN IF NOT EXISTS risk_type text NOT NULL DEFAULT 'captured_revenue'
    CHECK (risk_type IN ('captured_revenue','avoided_loss')),
  ADD COLUMN IF NOT EXISTS risk_multiplier numeric NOT NULL DEFAULT 1;

ALTER TABLE public.project_leak_vector_overrides
  ADD COLUMN IF NOT EXISTS risk_type text NOT NULL DEFAULT 'captured_revenue'
    CHECK (risk_type IN ('captured_revenue','avoided_loss')),
  ADD COLUMN IF NOT EXISTS risk_multiplier numeric NOT NULL DEFAULT 1;

-- 2. Vertical display defaults on project_types
ALTER TABLE public.project_types
  ADD COLUMN IF NOT EXISTS display_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.project_types SET display_defaults = jsonb_build_object(
  'avg_ticket', 500,
  'close_rate', 0.55,
  'avg_job_low', 300,
  'avg_job_high', 800,
  'emergency_job_low', 3000,
  'emergency_job_high', 8000,
  'hero_stat_headline', '1 missed call a day ≈ $108,000 a year',
  'pain_hook_copy', 'After-hours emergency calls are your biggest jobs — and your biggest leak.'
) WHERE id = 'home_services';

-- 3. leak_stack_runs table
CREATE TABLE IF NOT EXISTS public.leak_stack_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  triggered_by uuid,
  total_monthly_dollars numeric NOT NULL DEFAULT 0,
  total_risk_exposure_dollars numeric NOT NULL DEFAULT 0,
  top_leak_key text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  inputs_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.leak_stack_runs TO authenticated;
GRANT ALL ON public.leak_stack_runs TO service_role;

ALTER TABLE public.leak_stack_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leak_stack_runs_select" ON public.leak_stack_runs
  FOR SELECT TO authenticated
  USING (public.user_can_access_project(venue_id));

CREATE POLICY "leak_stack_runs_insert" ON public.leak_stack_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(venue_id));

CREATE INDEX IF NOT EXISTS leak_stack_runs_venue_time_idx
  ON public.leak_stack_runs (venue_id, computed_at DESC);

CREATE TRIGGER leak_stack_runs_updated_at
  BEFORE UPDATE ON public.leak_stack_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Seed role_page_defaults for new pageKey — client MUST be explicit false
INSERT INTO public.role_page_defaults (role, page_key, enabled) VALUES
  ('owner',      'leak_stack', true),
  ('gm',         'leak_stack', false),
  ('shift_lead', 'leak_stack', false),
  ('staff',      'leak_stack', false),
  ('client',     'leak_stack', false)
ON CONFLICT (role, page_key) DO UPDATE SET enabled = EXCLUDED.enabled;
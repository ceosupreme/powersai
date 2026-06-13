
-- 1) project_type enum + column on venues
CREATE TYPE public.project_type_enum AS ENUM (
  'client', 'content_channel', 'internal_brand', 'app_build', 'service_offer'
);

ALTER TABLE public.venues
  ADD COLUMN project_type public.project_type_enum NOT NULL DEFAULT 'client';

-- 2) pillar_templates: per-type default pillar set
CREATE TABLE public.pillar_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type public.project_type_enum NOT NULL,
  pillar_key text NOT NULL,
  pillar_label text NOT NULL,
  weight numeric NOT NULL DEFAULT 25,
  sort_order int NOT NULL DEFAULT 0,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, pillar_key)
);

GRANT SELECT ON public.pillar_templates TO authenticated;
GRANT ALL ON public.pillar_templates TO service_role;

ALTER TABLE public.pillar_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pillar_templates readable by authenticated"
  ON public.pillar_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "pillar_templates editable by admin"
  ON public.pillar_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pillar_templates_set_updated_at
  BEFORE UPDATE ON public.pillar_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) project_pillar_overrides: per-project divergence
CREATE TABLE public.project_pillar_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  pillar_key text NOT NULL,
  pillar_label text NOT NULL,
  weight numeric NOT NULL DEFAULT 25,
  sort_order int NOT NULL DEFAULT 0,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, pillar_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pillar_overrides TO authenticated;
GRANT ALL ON public.project_pillar_overrides TO service_role;

ALTER TABLE public.project_pillar_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_pillar_overrides accessible by project members"
  ON public.project_pillar_overrides FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE TRIGGER project_pillar_overrides_set_updated_at
  BEFORE UPDATE ON public.project_pillar_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4) project_pillar_scores: manual weekly scores for non-data-source pillars
CREATE TABLE public.project_pillar_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  pillar_key text NOT NULL,
  score numeric,
  note text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, week_start, pillar_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pillar_scores TO authenticated;
GRANT ALL ON public.project_pillar_scores TO service_role;

ALTER TABLE public.project_pillar_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_pillar_scores accessible by project members"
  ON public.project_pillar_scores FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE TRIGGER project_pillar_scores_set_updated_at
  BEFORE UPDATE ON public.project_pillar_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) Seed pillar_templates
-- client: matches today's hardcoded behavior exactly (keys revenue/labor/operations/guest, equal weights)
INSERT INTO public.pillar_templates (project_type, pillar_key, pillar_label, weight, sort_order, data_source) VALUES
  ('client', 'revenue',    'Revenue',           25, 0, 'weekly_scorecard.revenue_score'),
  ('client', 'labor',      'Team',              25, 1, 'weekly_scorecard.labor_score'),
  ('client', 'operations', 'Delivery',          25, 2, 'weekly_scorecard.operations_score'),
  ('client', 'guest',      'Client Experience', 25, 3, 'weekly_scorecard.guest_score'),

  ('content_channel', 'output',       'Output',       25, 0, NULL),
  ('content_channel', 'audience',     'Audience',     25, 1, NULL),
  ('content_channel', 'engagement',   'Engagement',   25, 2, NULL),
  ('content_channel', 'monetization', 'Monetization', 25, 3, NULL),

  ('internal_brand', 'growth',          'Growth',          25, 0, NULL),
  ('internal_brand', 'revenue',         'Revenue',         25, 1, NULL),
  ('internal_brand', 'brand_presence',  'Brand Presence',  25, 2, NULL),
  ('internal_brand', 'operations',      'Operations',      25, 3, NULL),

  ('app_build', 'progress',        'Progress',        25, 0, NULL),
  ('app_build', 'quality',         'Quality',         25, 1, NULL),
  ('app_build', 'adoption',        'Adoption',        25, 2, NULL),
  ('app_build', 'roadmap_health',  'Roadmap Health',  25, 3, NULL),

  ('service_offer', 'reach',      'Reach',      33, 0, NULL),
  ('service_offer', 'conversion', 'Conversion', 33, 1, NULL),
  ('service_offer', 'delivery',   'Delivery',   34, 2, NULL);

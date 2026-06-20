
-- 1. venue_onboarding_progress table
CREATE TABLE public.venue_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','complete','skipped')),
  auto_detected boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (venue_id, step_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_onboarding_progress TO authenticated;
GRANT ALL ON public.venue_onboarding_progress TO service_role;

ALTER TABLE public.venue_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view venue onboarding progress for their venues"
  ON public.venue_onboarding_progress FOR SELECT TO authenticated
  USING (public.user_can_access_project(venue_id));

CREATE POLICY "Users can insert venue onboarding progress for their venues"
  ON public.venue_onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(venue_id));

CREATE POLICY "Users can update venue onboarding progress for their venues"
  ON public.venue_onboarding_progress FOR UPDATE TO authenticated
  USING (public.user_can_access_project(venue_id))
  WITH CHECK (public.user_can_access_project(venue_id));

CREATE POLICY "Users can delete venue onboarding progress for their venues"
  ON public.venue_onboarding_progress FOR DELETE TO authenticated
  USING (public.user_can_access_project(venue_id));

CREATE TRIGGER trg_venue_onboarding_progress_updated_at
  BEFORE UPDATE ON public.venue_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. project_types.slug (additive, data-driven qualifier)
ALTER TABLE public.project_types ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.project_types
  SET slug = lower(regexp_replace(id, '_', '-', 'g'))
  WHERE slug IS NULL;

ALTER TABLE public.project_types ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS project_types_slug_unique ON public.project_types (slug);

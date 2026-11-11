-- Growth Plan bridge: explicitly link production jobs to a business goal or KPI.
-- Optional fields are additive; historical plans, stored statuses, cron selectors,
-- and existing callers remain compatible without populating them.
ALTER TABLE public.production_jobs
  ADD COLUMN IF NOT EXISTS goal_text text,
  ADD COLUMN IF NOT EXISTS goal_pillar_key text,
  ADD COLUMN IF NOT EXISTS goal_kpi_key text;

COMMENT ON COLUMN public.production_jobs.goal_text IS 'A user-selected business outcome this plan aims to advance, not a guarantee of measured results.';
COMMENT ON COLUMN public.production_jobs.goal_pillar_key IS 'Optional HQ KPI pillar key for the linked objective.';
COMMENT ON COLUMN public.production_jobs.goal_kpi_key IS 'Optional HQ KPI key for the linked objective.';

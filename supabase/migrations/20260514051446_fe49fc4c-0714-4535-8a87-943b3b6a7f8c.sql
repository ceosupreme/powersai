
ALTER TABLE public.growth_audit_runs
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS summary jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'growth_audit_runs' AND constraint_name = 'growth_audit_runs_status_check'
  ) THEN
    ALTER TABLE public.growth_audit_runs DROP CONSTRAINT growth_audit_runs_status_check;
  END IF;
END$$;

ALTER TABLE public.growth_audit_runs
  ADD CONSTRAINT growth_audit_runs_status_check
  CHECK (status IN ('stub','running','success','partial','failed'));

ALTER TABLE public.venue_execution_adapters
  ADD COLUMN IF NOT EXISTS growth_audit_enabled boolean NOT NULL DEFAULT true;

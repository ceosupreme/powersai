ALTER TABLE public.gbp_snapshots DROP CONSTRAINT gbp_snapshots_scope_check;
ALTER TABLE public.gbp_snapshots ADD CONSTRAINT gbp_snapshots_scope_check
  CHECK (scope = ANY (ARRAY['daily_basics','weekly_full','manual','public_lean']));
ALTER TABLE public.foundation_item_templates
  ADD COLUMN IF NOT EXISTS est_dollars_90d numeric,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS leverage numeric,
  ADD COLUMN IF NOT EXISTS est_hours numeric;

ALTER TABLE public.project_foundation_item_overrides
  ADD COLUMN IF NOT EXISTS est_dollars_90d numeric,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS leverage numeric,
  ADD COLUMN IF NOT EXISTS est_hours numeric;
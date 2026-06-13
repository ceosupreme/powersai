ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_insight_id uuid NULL,
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL,
  ADD COLUMN IF NOT EXISTS created_at_manual timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_is_manual ON public.action_items(is_manual) WHERE is_manual = true;
CREATE INDEX IF NOT EXISTS idx_action_items_created_by_id ON public.action_items(created_by_id) WHERE created_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_source_insight_id ON public.action_items(source_insight_id) WHERE source_insight_id IS NOT NULL;
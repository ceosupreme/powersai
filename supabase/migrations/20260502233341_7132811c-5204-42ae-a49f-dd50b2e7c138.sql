-- Partial unique index: each deterministic insight gets at most one action item.
-- Scoped to source='deterministic_trigger' so AI generators (daily/weekly) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS action_items_insight_id_deterministic_unique
  ON public.action_items (insight_id)
  WHERE insight_id IS NOT NULL AND source = 'deterministic_trigger';
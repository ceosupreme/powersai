-- 1. Add period columns to insights for week-decoupled (e.g. inventory) insights
ALTER TABLE public.insights
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS period_label TEXT;

-- 2. Index for overlap-window queries (week-less insights filtered by bar + period_end)
CREATE INDEX IF NOT EXISTS idx_insights_bar_period_end
  ON public.insights (bar_id, period_end)
  WHERE week_id IS NULL;

-- 3. Seed/update both threshold app_config keys
INSERT INTO public.app_config (key, value)
VALUES
  ('inventory_loss_threshold_usd', '200'::jsonb),
  ('inventory_loss_high_severity_usd', '1000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
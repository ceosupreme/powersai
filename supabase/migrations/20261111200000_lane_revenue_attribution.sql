-- Attach recorded income to a specific earning opportunity without inferring
-- any income from its setup status or projected value.
-- Nullable columns preserve historical channel_revenue rows and existing readers.
ALTER TABLE public.channel_revenue
  ADD COLUMN IF NOT EXISTS lane_item_key text,
  ADD COLUMN IF NOT EXISTS entry_source text,
  ADD COLUMN IF NOT EXISTS evidence_url text;

CREATE INDEX IF NOT EXISTS channel_revenue_project_lane_month_idx
  ON public.channel_revenue(project_id, lane_item_key, period_month);

-- Existing records remain unattributed (lane_item_key NULL, entry_source NULL).
-- The HQ UI sets entry_source='manual' only on new manually entered revenue.

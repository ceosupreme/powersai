ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS kds_total_tickets   integer,
  ADD COLUMN IF NOT EXISTS kds_over_25_tickets integer;

ALTER TABLE public.weekly_core
  ADD COLUMN IF NOT EXISTS kds_total_tickets   integer,
  ADD COLUMN IF NOT EXISTS kds_over_25_tickets integer;

COMMENT ON COLUMN public.daily_metrics.kds_total_tickets   IS 'Count of KDS tickets (checks with READY items) for the day. Source: Toast Orders API or KDS CSV upload.';
COMMENT ON COLUMN public.daily_metrics.kds_over_25_tickets IS 'Count of KDS tickets whose max fulfillment time exceeded 25 minutes.';
COMMENT ON COLUMN public.weekly_core.kds_total_tickets     IS 'Sum of daily KDS ticket counts across the week. Null for weeks computed before this column existed.';
COMMENT ON COLUMN public.weekly_core.kds_over_25_tickets   IS 'Sum of daily KDS tickets > 25 min across the week. Null for weeks computed before this column existed.';
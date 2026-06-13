ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS kds_over_25_pct numeric;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS kds_over_25_pct numeric;
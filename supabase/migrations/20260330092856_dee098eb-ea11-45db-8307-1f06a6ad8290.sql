ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS last_year_transactions INTEGER;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS last_year_aov DECIMAL;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS last_year_guests INTEGER;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS yoy_transactions_pct DECIMAL;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS yoy_aov_pct DECIMAL;
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS yoy_guests_pct DECIMAL;
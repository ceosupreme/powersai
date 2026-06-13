
-- Add KDS time column to daily_metrics
ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS avg_kds_time_mins NUMERIC;

-- Add KDS time column to weekly_core
ALTER TABLE public.weekly_core ADD COLUMN IF NOT EXISTS avg_kds_time_mins NUMERIC;

-- Add G5 fields to weekly_scorecard
ALTER TABLE public.weekly_scorecard ADD COLUMN IF NOT EXISTS g5_actual NUMERIC;
ALTER TABLE public.weekly_scorecard ADD COLUMN IF NOT EXISTS g5_score INTEGER;

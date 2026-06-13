ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS tip_data_missing boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.daily_metrics.tip_data_missing IS
'True when the Toast check/day report failed for this date — tips/unpaid/turn columns are null because the API did not return data, not because the values were genuinely zero.';
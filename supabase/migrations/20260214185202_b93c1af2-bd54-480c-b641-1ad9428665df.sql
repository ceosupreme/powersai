-- Add unique constraints needed for upsert operations in compute-weekly-scores
ALTER TABLE public.weekly_core 
  ADD CONSTRAINT weekly_core_week_id_bar_id_unique UNIQUE (week_id, bar_id);

ALTER TABLE public.weekly_scorecard 
  ADD CONSTRAINT weekly_scorecard_week_id_bar_id_unique UNIQUE (week_id, bar_id);

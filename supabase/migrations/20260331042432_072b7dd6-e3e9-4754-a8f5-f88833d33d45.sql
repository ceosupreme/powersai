CREATE UNIQUE INDEX IF NOT EXISTS insights_deterministic_unique 
ON public.insights (bar_id, title) 
WHERE generated_by = 'deterministic_trigger' AND status != 'Dismissed';
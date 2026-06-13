CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_dedupe_unique_deterministic
ON public.insights (dedupe_hash)
WHERE generated_by = 'deterministic_trigger' AND dedupe_hash IS NOT NULL;
UPDATE public.insights
SET status = 'New'
WHERE generated_by = 'daily_insights_v2'
  AND status = 'Consolidated'
  AND source_date >= '2026-05-11'
  AND source_date <= '2026-05-17';
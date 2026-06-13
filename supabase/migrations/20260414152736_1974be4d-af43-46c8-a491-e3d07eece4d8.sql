DELETE FROM public.insights
WHERE generated_by = 'deterministic_trigger'
  AND title LIKE '%Only%GM logs submitted%'
  AND source_date >= '2026-04-13';
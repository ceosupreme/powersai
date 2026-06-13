UPDATE public.insights
SET source_type = 'BarPulse data validation check — ' || to_char(source_date, 'YYYY-MM-DD')
WHERE generated_by = 'daily_insights_v2'
  AND source_date >= '2026-04-19'
  AND source_type ILIKE '7shifts%'
  AND (
    detail ILIKE '%shift log%' OR
    detail ILIKE '%manager log%' OR
    detail ILIKE '%no operational data%' OR
    detail ILIKE '%no logs%' OR
    detail ILIKE '%complete absence%' OR
    title ILIKE '%no operational logs%' OR
    title ILIKE '%complete absence of operational%' OR
    title ILIKE '%incomplete shift logs%'
  );
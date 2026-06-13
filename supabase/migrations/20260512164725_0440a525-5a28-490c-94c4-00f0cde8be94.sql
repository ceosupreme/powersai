UPDATE public.insights
SET status = 'Dismissed',
    dismiss_reason = 'replaced_by_weekly_aggregation'
WHERE generated_by = 'deterministic_trigger'
  AND source_metric = 'red_score_alert'
  AND status NOT IN ('Dismissed','Resolved')
  AND (title ILIKE '%Schedule Variance%' OR detail ILIKE '%Signal: Schedule Variance%');
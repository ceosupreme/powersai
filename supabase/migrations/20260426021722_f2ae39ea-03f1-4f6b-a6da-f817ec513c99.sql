DROP VIEW IF EXISTS public.venue_sync_status;

CREATE VIEW public.venue_sync_status
WITH (security_invoker = true) AS
SELECT DISTINCT ON (bar_id, sync_type)
  bar_id,
  sync_type,
  status,
  started_at,
  completed_at,
  records_processed,
  records_created,
  records_updated,
  error_message
FROM public.sync_runs
WHERE sync_type IN ('seven_shifts_roster','toast_employees','toast_time_entries')
ORDER BY bar_id, sync_type, started_at DESC;
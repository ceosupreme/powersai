-- Keep the scheduled-job history to the last 7 days.
--
-- pg_cron logs every run in cron.job_run_details and never cleans it up; by Nov 9 2026 it held 44,766
-- rows (76 MB of a 122 MB database). Supabase's Cron docs recommend a daily job that keeps the last
-- 7 days. coalesce() also clears rows that never recorded an end time. Safe to re-run: scheduling a job
-- name that already exists updates it.
delete from cron.job_run_details where coalesce(end_time, start_time) < now() - interval '7 days';

select cron.schedule(
  'job-run-details-cleanup',
  '17 9 * * *',
  $$ delete from cron.job_run_details where coalesce(end_time, start_time) < now() - interval '7 days' $$
);

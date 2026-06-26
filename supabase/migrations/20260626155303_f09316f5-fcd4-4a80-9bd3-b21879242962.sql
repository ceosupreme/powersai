-- Weekly recovery report generation (Build E). Runs once a week on Monday
-- 08:00 UTC; the edge function itself iterates over all active projects.
SELECT cron.unschedule('weekly-recovery-report')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-recovery-report');

SELECT cron.schedule(
  'weekly-recovery-report',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://uoqybkvinbptlpwxsewg.supabase.co/functions/v1/generate-recovery-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
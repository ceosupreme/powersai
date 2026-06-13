
SELECT cron.unschedule('sync-google-ratings-weekly');
SELECT cron.unschedule('compute-weekly-scores');
SELECT cron.unschedule('generate-monday-briefing-weekly');

SELECT cron.schedule(
  'sync-google-ratings-weekly',
  '30 17 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/sync-google-ratings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'compute-weekly-scores',
  '45 17 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/compute-weekly-scores',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'generate-monday-briefing-weekly',
  '0 18 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/generate-monday-briefing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

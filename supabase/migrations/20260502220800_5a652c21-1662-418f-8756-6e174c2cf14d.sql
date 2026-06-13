SELECT cron.schedule(
  'sync-asana-gm-tasks-daily',
  '30 13 * * *', -- 5:30 AM PT (13:30 UTC during PST; will be 12:30 UTC during PDT, acceptable drift)
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/sync-asana-gm-tasks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
-- Schedule context-sources-pull every 6 hours (00:10, 06:10, 12:10, 18:10 UTC).
-- Runs across all active venues. Calendar adapter is free; external adapters
-- (NWS/NewsData/TheSportsDB/Ticketmaster) handle their own rate limits.
SELECT cron.schedule(
  'context-sources-pull-6h',
  '10 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/context-sources-pull',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

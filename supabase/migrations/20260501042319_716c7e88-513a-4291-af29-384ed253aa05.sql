-- Auto-backfill last 14 days of Asana activity when a new log source is added
-- to a venue. Fires only on INSERT of an active row. The edge function dedups
-- via asana_comment_gid (gm_logs/lead_logs) and (bar_id,date,source) (shift_logs),
-- so the trigger is safe even if it ever re-fires accidentally.

CREATE OR REPLACE FUNCTION public.fn_backfill_new_asana_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since text;
  v_url text;
BEGIN
  -- Only backfill when the new row is active.
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  -- 14 days ago in Pacific Time, formatted YYYY-MM-DD.
  v_since := to_char((now() AT TIME ZONE 'America/Los_Angeles')::date - INTERVAL '14 days', 'YYYY-MM-DD');

  v_url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/sync-asana-logs'
        || '?venue_id=' || NEW.venue_id::text
        || '&backfill_since=' || v_since;

  -- Fire-and-forget. If the HTTP call fails, the row insert still succeeds.
  PERFORM net.http_post(
    url := v_url,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  );

  RAISE NOTICE 'Triggered Asana backfill for venue % since %', NEW.venue_id, v_since;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_new_asana_source ON public.venue_asana_log_sources;

CREATE TRIGGER trg_backfill_new_asana_source
AFTER INSERT ON public.venue_asana_log_sources
FOR EACH ROW
EXECUTE FUNCTION public.fn_backfill_new_asana_source();
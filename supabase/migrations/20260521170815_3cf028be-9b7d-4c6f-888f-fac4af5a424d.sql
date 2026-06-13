
ALTER TABLE public.sync_runs ADD COLUMN IF NOT EXISTS alert_task_gid text;

CREATE INDEX IF NOT EXISTS idx_sync_runs_unalerted_failures
  ON public.sync_runs (started_at)
  WHERE status IN ('failed','partial') AND alert_task_gid IS NULL;

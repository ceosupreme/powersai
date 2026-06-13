ALTER TABLE public.shift_logs
  ADD COLUMN IF NOT EXISTS asana_comment_gid text,
  ADD COLUMN IF NOT EXISTS asana_task_gid text,
  ADD COLUMN IF NOT EXISTS comment_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_parsed boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS shift_logs_asana_comment_gid_key
  ON public.shift_logs (asana_comment_gid)
  WHERE asana_comment_gid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_logs_is_parsed
  ON public.shift_logs (is_parsed) WHERE is_parsed = false;
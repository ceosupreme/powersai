DROP INDEX IF EXISTS public.shift_logs_asana_comment_gid_key;
CREATE UNIQUE INDEX shift_logs_asana_comment_gid_key
  ON public.shift_logs (asana_comment_gid);
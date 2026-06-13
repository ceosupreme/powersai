-- Promote existing unique index on shift_logs (bar_id, date, source) to a named UNIQUE constraint
-- so PostgREST can resolve onConflict='bar_id,date,source' reliably.
-- The existing index `shift_logs_bar_date_source_idx` is reused via USING INDEX, preserving rows.
ALTER TABLE public.shift_logs
  ADD CONSTRAINT shift_logs_bar_date_source_key
  UNIQUE USING INDEX shift_logs_bar_date_source_idx;

-- Force PostgREST to reload its schema cache so the new constraint is visible immediately.
NOTIFY pgrst, 'reload schema';
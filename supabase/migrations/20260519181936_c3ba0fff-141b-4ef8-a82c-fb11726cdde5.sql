CREATE OR REPLACE FUNCTION public.toast_submit_lock(p_key bigint, p_spacing_ms int)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(p_key);
  PERFORM pg_sleep(GREATEST(0, p_spacing_ms) / 1000.0);
END;
$$;
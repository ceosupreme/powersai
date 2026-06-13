CREATE OR REPLACE FUNCTION public.toast_submit_lock(p_key bigint, p_spacing_ms int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hold the (tenant, path) lock for the configured spacing window. Auto-released at txn end.
  PERFORM pg_advisory_xact_lock(p_key);
  PERFORM pg_sleep(GREATEST(0, p_spacing_ms) / 1000.0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toast_submit_lock(bigint, int) TO service_role, anon, authenticated;
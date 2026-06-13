DROP TRIGGER IF EXISTS trg_backfill_new_asana_source ON public.venue_asana_log_sources;

CREATE OR REPLACE FUNCTION public.fn_backfill_new_asana_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Phase 1 conversion: neutralized. Previously POSTed to the source project's
  -- sync-asana-logs URL with an inlined anon JWT; that vector is removed.
  RETURN NEW;
END;
$$;
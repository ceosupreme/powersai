-- 1. Add the canonical exempt flag (idempotent; first attempt already added it).
ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS is_exempt boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_is_exempt
  ON public.employee_profiles (venue_id, is_exempt) WHERE is_exempt = true;

COMMENT ON COLUMN public.employee_profiles.is_exempt IS
  'Salaried/exempt — excluded from CA labor compliance detectors. Toast labor v1 does not expose FLSA, so this is manually maintained.';

-- 2. Backfill (idempotent — already true rows are no-ops).
UPDATE public.employee_profiles
   SET is_exempt = true
 WHERE is_active = true
   AND is_exempt = false
   AND (hourly_wage IS NULL OR hourly_wage = 0)
   AND role_primary ~* '(^|[^a-z])(manager|gm|general manager|owner|director|chef de cuisine|executive chef|operating partner)([^a-z]|$)';

-- 3. Cleanup historical compliance insights against newly-flagged exempts,
-- and write per-venue sync_runs rows for visibility.
DO $$
DECLARE
  v_total integer := 0;
  v_venue_count integer := 0;
  rec RECORD;
BEGIN
  -- Dismiss the insights and capture per-venue counts in one pass.
  CREATE TEMP TABLE _exempt_cleanup ON COMMIT DROP AS
  WITH dismissed AS (
    UPDATE public.insights
       SET status = 'Dismissed',
           dismiss_reason = 'exempt_employee'
     WHERE source_metric IN ('no_clockout','missed_meal','late_meal','weekly_overtime','meal_tracking_gap','multi_location')
       AND status NOT IN ('Dismissed','Resolved')
       AND employee_id IN (SELECT id FROM public.employee_profiles WHERE is_exempt = true)
     RETURNING id, bar_id, employee_id
  )
  SELECT * FROM dismissed;

  SELECT COUNT(*) INTO v_total FROM _exempt_cleanup;

  -- Cancel paired deterministic action_items.
  IF v_total > 0 THEN
    UPDATE public.action_items
       SET status = 'cancelled'
     WHERE source = 'deterministic_trigger'
       AND insight_id IN (SELECT id FROM _exempt_cleanup)
       AND status NOT IN ('completed','cancelled');
  END IF;

  -- One sync_runs row per affected venue (bar_id is NOT NULL on sync_runs).
  FOR rec IN
    SELECT bar_id, COUNT(*) AS n, array_agg(id) AS insight_ids, array_agg(DISTINCT employee_id) AS employee_ids
      FROM _exempt_cleanup
     WHERE bar_id IS NOT NULL
     GROUP BY bar_id
  LOOP
    INSERT INTO public.sync_runs (sync_type, status, completed_at, records_updated, bar_id, metadata)
    VALUES (
      'compliance_exempt_cleanup',
      'completed',
      now(),
      rec.n,
      rec.bar_id,
      jsonb_build_object(
        'reason', 'exempt_employee',
        'dismissed_insight_count', rec.n,
        'dismissed_insight_ids', rec.insight_ids,
        'affected_employee_ids', rec.employee_ids,
        'note', 'Initial cleanup after introducing employee_profiles.is_exempt + compliance-detector exempt filter.'
      )
    );
    v_venue_count := v_venue_count + 1;
  END LOOP;

  RAISE NOTICE 'compliance_exempt_cleanup: dismissed % insight(s) across % venue(s)', v_total, v_venue_count;
END $$;
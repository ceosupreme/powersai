-- ============================================================
-- 1. Extend employee_profiles for 7shifts + Toast ingestion
-- ============================================================

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS sevenshifts_punch_id        text,
  ADD COLUMN IF NOT EXISTS sevenshifts_user_id_int     bigint,
  ADD COLUMN IF NOT EXISTS seven_shifts_role_ids       int[],
  ADD COLUMN IF NOT EXISTS seven_shifts_location_ids   int[],
  ADD COLUMN IF NOT EXISTS seven_shifts_department_ids int[],
  ADD COLUMN IF NOT EXISTS hourly_wage                 numeric(8,2),
  ADD COLUMN IF NOT EXISTS toast_external_employee_id  text,
  ADD COLUMN IF NOT EXISTS toast_job_references        jsonb,
  ADD COLUMN IF NOT EXISTS source_systems              text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS match_status                text   DEFAULT 'unmatched',
  ADD COLUMN IF NOT EXISTS match_method                text,
  ADD COLUMN IF NOT EXISTS match_reviewed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS match_reviewed_by           uuid,
  ADD COLUMN IF NOT EXISTS last_synced_at              timestamptz;

-- Validate match_status values
ALTER TABLE public.employee_profiles
  DROP CONSTRAINT IF EXISTS employee_profiles_match_status_check;
ALTER TABLE public.employee_profiles
  ADD CONSTRAINT employee_profiles_match_status_check
  CHECK (match_status IN ('matched','unmatched','manual','no_match_in_other'));

-- Unique partial indexes (allow nulls; prevent duplicate IDs per venue)
CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_profiles_venue_7s_user
  ON public.employee_profiles (venue_id, sevenshifts_user_id_int)
  WHERE sevenshifts_user_id_int IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_profiles_venue_toast_guid
  ON public.employee_profiles (venue_id, toast_employee_guid)
  WHERE toast_employee_guid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_match_status
  ON public.employee_profiles (venue_id, match_status);

-- ============================================================
-- 2. time_entries (Toast = source of truth)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  employee_id         uuid REFERENCES public.employee_profiles(id) ON DELETE SET NULL,
  toast_employee_guid text NOT NULL,
  toast_entry_guid    text NOT NULL UNIQUE,
  toast_shift_guid    text,
  toast_job_guid      text,
  toast_job_title     text,
  business_date       date NOT NULL,
  in_date             timestamptz NOT NULL,
  out_date            timestamptz,
  regular_hours       numeric(6,2),
  overtime_hours      numeric(6,2),
  hourly_wage         numeric(8,2),
  auto_clocked_out    boolean DEFAULT false,
  deleted             boolean DEFAULT false,
  modified_date       timestamptz,
  raw                 jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_venue_date
  ON public.time_entries (venue_id, business_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date
  ON public.time_entries (employee_id, business_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_toast_employee
  ON public.time_entries (toast_employee_guid);

CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access time_entries"
  ON public.time_entries
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue members can view time_entries"
  ON public.time_entries
  FOR SELECT
  USING (venue_id = ANY (user_venue_ids()));

-- ============================================================
-- 3. time_entry_breaks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entry_breaks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id    uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  toast_break_guid text NOT NULL,
  break_type_guid  text,
  paid             boolean,
  in_date          timestamptz,
  out_date         timestamptz,
  missed           boolean DEFAULT false,
  waived           boolean DEFAULT false,
  audit_response   boolean,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (time_entry_id, toast_break_guid)
);

CREATE INDEX IF NOT EXISTS idx_time_entry_breaks_entry
  ON public.time_entry_breaks (time_entry_id);

ALTER TABLE public.time_entry_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access time_entry_breaks"
  ON public.time_entry_breaks
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue members can view time_entry_breaks"
  ON public.time_entry_breaks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_breaks.time_entry_id
        AND te.venue_id = ANY (user_venue_ids())
    )
  );

-- ============================================================
-- 4. toast_sync_cursors (per-venue modifiedDate tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.toast_sync_cursors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  sync_type         text NOT NULL,
  last_modified_at  timestamptz,
  last_business_date date,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, sync_type)
);

CREATE TRIGGER trg_toast_sync_cursors_updated_at
  BEFORE UPDATE ON public.toast_sync_cursors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.toast_sync_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access toast_sync_cursors"
  ON public.toast_sync_cursors
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 5. venue_sync_status view
-- ============================================================

CREATE OR REPLACE VIEW public.venue_sync_status AS
SELECT DISTINCT ON (bar_id, sync_type)
  bar_id,
  sync_type,
  status,
  started_at,
  completed_at,
  records_processed,
  records_created,
  records_updated,
  error_message
FROM public.sync_runs
WHERE sync_type IN ('seven_shifts_roster','toast_employees','toast_time_entries')
ORDER BY bar_id, sync_type, started_at DESC;
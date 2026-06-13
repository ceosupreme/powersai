ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS is_vendor_account boolean NOT NULL DEFAULT false;

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS exempt_reason text;

CREATE INDEX IF NOT EXISTS idx_employee_profiles_vendor
  ON public.employee_profiles (venue_id, is_vendor_account)
  WHERE is_vendor_account = true;

COMMENT ON COLUMN public.employee_profiles.is_vendor_account IS
  'Non-human integration/service account (Sculpture Hospitality, Bevinco, Bev Intel, Toast Terminal Login). Excluded from employee-facing UI and compliance detectors.';

COMMENT ON COLUMN public.employee_profiles.exempt_reason IS
  'Why is_exempt=true. Values: salaried, vendor_account, manual_admin.';
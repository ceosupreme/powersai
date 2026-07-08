
-- 1. Shell flag on venues.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS is_prospect_shell boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS venues_is_prospect_shell_idx
  ON public.venues(is_prospect_shell) WHERE is_prospect_shell = true;

-- 2. public_audit_requests
CREATE TABLE IF NOT EXISTS public.public_audit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  business_name text NOT NULL,
  city text NOT NULL,
  website_url text,
  place_id text,
  email text,
  operation_footprint text NOT NULL
    CHECK (operation_footprint IN ('solo_owner','small_crew_2_5','crew_6_plus','multi_location')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','resolving','snapshotting','auditing','ranking','complete','failed')),
  status_detail text,
  shell_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  redacted_result jsonb,
  full_result jsonb,
  email_captured_at timestamptz,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_audit_requests TO authenticated;
GRANT ALL ON public.public_audit_requests TO service_role;

ALTER TABLE public.public_audit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read public audit requests"
  ON public.public_audit_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS public_audit_requests_place_created_idx
  ON public.public_audit_requests(place_id, created_at DESC)
  WHERE place_id IS NOT NULL AND status = 'complete';

CREATE INDEX IF NOT EXISTS public_audit_requests_ip_created_idx
  ON public.public_audit_requests(ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE TRIGGER public_audit_requests_updated_at
  BEFORE UPDATE ON public.public_audit_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

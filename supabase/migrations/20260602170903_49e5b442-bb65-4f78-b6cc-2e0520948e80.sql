CREATE TABLE public.venue_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_label text NOT NULL,
  phone text,
  email text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_contacts_phone_or_email CHECK (
    (phone IS NOT NULL AND length(btrim(phone)) > 0)
    OR (email IS NOT NULL AND length(btrim(email)) > 0)
  )
);

CREATE INDEX idx_venue_contacts_venue_active ON public.venue_contacts(venue_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_contacts TO authenticated;
GRANT ALL ON public.venue_contacts TO service_role;

ALTER TABLE public.venue_contacts ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage venue contacts"
  ON public.venue_contacts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users assigned to the venue can read its contacts
CREATE POLICY "Venue members can view contacts"
  ON public.venue_contacts
  FOR SELECT
  TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()));
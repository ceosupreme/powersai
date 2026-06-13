-- Venue leadership contacts table
CREATE TABLE public.venue_leadership_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('gm', 'lead_staff')),
  asana_gid TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.venue_leadership_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage venue leadership"
  ON public.venue_leadership_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read venue leadership"
  ON public.venue_leadership_contacts FOR SELECT
  TO authenticated
  USING (true);

-- Fix action_items UPDATE policy: allow users with bar access (not just admins)
DROP POLICY IF EXISTS "Update action_items admin" ON public.action_items;
CREATE POLICY "Update action_items"
  ON public.action_items FOR UPDATE
  TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_bar_access(auth.uid(), (bar_id)::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_bar_access(auth.uid(), (bar_id)::text));

-- Fix action_items INSERT policy: allow users with bar access
DROP POLICY IF EXISTS "Insert action_items admin" ON public.action_items;
CREATE POLICY "Insert action_items"
  ON public.action_items FOR INSERT
  TO public
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_bar_access(auth.uid(), (bar_id)::text));
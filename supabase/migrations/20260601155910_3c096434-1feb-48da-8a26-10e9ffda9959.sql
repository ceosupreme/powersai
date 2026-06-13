
-- 1. venues: scope SELECT to assigned venues + admins
DROP POLICY IF EXISTS bars_select_policy ON public.venues;
CREATE POLICY bars_select_policy ON public.venues
  FOR SELECT TO authenticated
  USING (id = ANY (user_venue_ids()) OR has_role(auth.uid(), 'admin'));

-- 2. google_reviews: scope SELECT
DROP POLICY IF EXISTS "Authenticated users can read google_reviews" ON public.google_reviews;
CREATE POLICY "Venue members can read google_reviews" ON public.google_reviews
  FOR SELECT TO authenticated
  USING (bar_id = ANY (user_venue_ids()) OR has_role(auth.uid(), 'admin'));

-- 3. shift_feedback: scope SELECT + restrict INSERT
DROP POLICY IF EXISTS "Authenticated read shift_feedback" ON public.shift_feedback;
CREATE POLICY "Venue members read shift_feedback" ON public.shift_feedback
  FOR SELECT TO authenticated
  USING (bar_id = ANY (user_venue_ids()) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service insert shift_feedback" ON public.shift_feedback;
CREATE POLICY "Service or admin insert shift_feedback" ON public.shift_feedback
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. venue_leadership_contacts: scope SELECT
DROP POLICY IF EXISTS "Authenticated users can read venue leadership" ON public.venue_leadership_contacts;
CREATE POLICY "Venue members read venue leadership" ON public.venue_leadership_contacts
  FOR SELECT TO authenticated
  USING (venue_id = ANY (user_venue_ids()) OR has_role(auth.uid(), 'admin'));

-- 5. sculpture_site_mappings: scope SELECT
DROP POLICY IF EXISTS "Authenticated users read site mappings" ON public.sculpture_site_mappings;
CREATE POLICY "Venue members read site mappings" ON public.sculpture_site_mappings
  FOR SELECT TO authenticated
  USING (venue_id = ANY (user_venue_ids()) OR has_role(auth.uid(), 'admin'));

-- 6. employee_profiles: restrict to admin / owner / gm / lead
DROP POLICY IF EXISTS "Venue members can view employee_profiles" ON public.employee_profiles;
CREATE POLICY "Managers can view employee_profiles" ON public.employee_profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR (
      venue_id = ANY (user_venue_ids())
      AND get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm','lead')
    )
  );

-- 7. venue_profiles: restrict sensitive ops fields to admin/owner/gm only
DROP POLICY IF EXISTS "Venue members can view venue_profiles" ON public.venue_profiles;
CREATE POLICY "Leadership can view venue_profiles" ON public.venue_profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR (
      venue_id = ANY (user_venue_ids())
      AND get_user_venue_role(auth.uid(), venue_id) IN ('owner','gm')
    )
  );

-- 8. knowledge_base: add venue scope
DROP POLICY IF EXISTS "Staff can view knowledge_base" ON public.knowledge_base;
CREATE POLICY "Staff can view knowledge_base" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR (
      (venue_id IS NULL OR venue_id = ANY (user_venue_ids()))
      AND (
        access_level = 'all_staff'::access_level
        OR (access_level = 'managers_only'::access_level AND has_role(auth.uid(), 'manager'))
      )
    )
  );

-- 9. bar_targets: add venue-scoped SELECT for venue members
CREATE POLICY "Venue members can view targets" ON public.bar_targets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR (venue_id IS NOT NULL AND venue_id = ANY (user_venue_ids())));

-- 10. suppressed_insights: restrict INSERT to service role
DROP POLICY IF EXISTS "Service role can insert suppressed insights" ON public.suppressed_insights;
CREATE POLICY "Service role can insert suppressed insights" ON public.suppressed_insights
  FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

-- 11. inventory-uploads storage: lock down to service_role (bucket unused on client)
DROP POLICY IF EXISTS "Authenticated users can read inventory files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inventory files" ON storage.objects;
CREATE POLICY "Service role manages inventory uploads" ON storage.objects
  FOR ALL TO public
  USING (bucket_id = 'inventory-uploads' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'inventory-uploads' AND auth.role() = 'service_role');

-- 12. user_venue_roles: only 'owner' role may have NULL venue_id
ALTER TABLE public.user_venue_roles
  ADD CONSTRAINT user_venue_roles_null_venue_owner_only
  CHECK (venue_id IS NOT NULL OR role = 'owner');

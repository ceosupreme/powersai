-- Add narrow setup writes for a verified manager of ONE assigned internal brand.
-- Existing admin, client and bar-staff policies remain in force.
-- The user_can_manage_brand helper is SECURITY DEFINER, scoped to auth.uid(),
-- the existing owner role, the venue_assignments membership, and internal_brand.
-- Recoverable policy inventory lives in the restricted 2026-11-11 snapshot.
BEGIN;

DROP POLICY IF EXISTS "Brand manager can add own setup decisions" ON public.brand_asset_decisions;
CREATE POLICY "Brand manager can add own setup decisions"
ON public.brand_asset_decisions FOR INSERT TO authenticated
WITH CHECK (public.user_can_manage_brand(venue_id));

DROP POLICY IF EXISTS "Brand manager can change own setup decisions" ON public.brand_asset_decisions;
CREATE POLICY "Brand manager can change own setup decisions"
ON public.brand_asset_decisions FOR UPDATE TO authenticated
USING (public.user_can_manage_brand(venue_id))
WITH CHECK (public.user_can_manage_brand(venue_id));

DROP POLICY IF EXISTS "Brand manager can undo own setup decisions" ON public.brand_asset_decisions;
CREATE POLICY "Brand manager can undo own setup decisions"
ON public.brand_asset_decisions FOR DELETE TO authenticated
USING (public.user_can_manage_brand(venue_id));

DROP POLICY IF EXISTS "Brand manager can add own brand profile" ON public.brand_profiles;
CREATE POLICY "Brand manager can add own brand profile"
ON public.brand_profiles FOR INSERT TO authenticated
WITH CHECK (public.user_can_manage_brand(venue_id));

DROP POLICY IF EXISTS "Brand manager can edit own brand profile" ON public.brand_profiles;
CREATE POLICY "Brand manager can edit own brand profile"
ON public.brand_profiles FOR UPDATE TO authenticated
USING (public.user_can_manage_brand(venue_id))
WITH CHECK (public.user_can_manage_brand(venue_id));

DROP POLICY IF EXISTS "Brand manager can record own channel stats" ON public.channel_stats;
CREATE POLICY "Brand manager can record own channel stats"
ON public.channel_stats FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_channels bc
  WHERE bc.id = channel_id AND public.user_can_manage_brand(bc.project_id)
));

DROP POLICY IF EXISTS "Brand manager can correct own channel stats" ON public.channel_stats;
CREATE POLICY "Brand manager can correct own channel stats"
ON public.channel_stats FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.brand_channels bc
  WHERE bc.id = channel_id AND public.user_can_manage_brand(bc.project_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_channels bc
  WHERE bc.id = channel_id AND public.user_can_manage_brand(bc.project_id)
));

COMMIT;

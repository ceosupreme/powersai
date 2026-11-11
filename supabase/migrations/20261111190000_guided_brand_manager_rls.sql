-- STM HQ guided brand-manager access.
-- Prepared 2026-11-11 from live RLS inventory. Execute only after verified recovery snapshot.
-- Existing stored status strings are not changed. No project/user assignment is performed here.
BEGIN;

CREATE OR REPLACE FUNCTION public.user_can_manage_brand(_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'owner'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.venue_assignments va
      JOIN public.venues v ON v.id = va.venue_id
      WHERE va.user_id = auth.uid()
        AND va.venue_id = _project_id
        AND v.project_type = 'internal_brand'
    );
$function$;
REVOKE ALL ON FUNCTION public.user_can_manage_brand(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_manage_brand(uuid) TO authenticated;

-- Shared products: visible through any assigned internal brand, editable only if
-- EVERY brand using the product is within that same person's authorized brands.
CREATE OR REPLACE FUNCTION public.user_can_edit_brand_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.channel_product_channels l
      WHERE l.product_id = _product_id
        AND public.user_can_manage_brand(l.project_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.channel_product_channels l
      WHERE l.product_id = _product_id
        AND NOT public.user_can_manage_brand(l.project_id)
    );
$function$;
REVOKE ALL ON FUNCTION public.user_can_edit_brand_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_edit_brand_product(uuid) TO authenticated;

DROP POLICY IF EXISTS "Brand manager can start production jobs" ON public.production_jobs;
CREATE POLICY "Brand manager can start production jobs"
  ON public.production_jobs FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can update production jobs" ON public.production_jobs;
CREATE POLICY "Brand manager can update production jobs"
  ON public.production_jobs FOR UPDATE TO authenticated
  USING (public.user_can_manage_brand(project_id))
  WITH CHECK (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can read linked products" ON public.channel_products;
CREATE POLICY "Brand manager can read linked products"
  ON public.channel_products FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.channel_product_channels link
    WHERE link.product_id = channel_products.id
      AND public.user_can_manage_brand(link.project_id)
  ));

DROP POLICY IF EXISTS "Brand manager can update exclusive products" ON public.channel_products;
CREATE POLICY "Brand manager can update exclusive products"
  ON public.channel_products FOR UPDATE TO authenticated
  USING (public.user_can_edit_brand_product(id))
  WITH CHECK (public.user_can_edit_brand_product(id));

DROP POLICY IF EXISTS "Authenticated can read product channel links" ON public.channel_product_channels;
DROP POLICY IF EXISTS "Read product channel links within assigned projects" ON public.channel_product_channels;
CREATE POLICY "Read product channel links within assigned projects"
  ON public.channel_product_channels FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "Brand manager can record content placements" ON public.content_placements;
CREATE POLICY "Brand manager can record content placements"
  ON public.content_placements FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can view content placements" ON public.content_placements;
CREATE POLICY "Brand manager can view content placements"
  ON public.content_placements FOR SELECT TO authenticated
  USING (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can update content placements" ON public.content_placements;
CREATE POLICY "Brand manager can update content placements"
  ON public.content_placements FOR UPDATE TO authenticated
  USING (public.user_can_manage_brand(project_id))
  WITH CHECK (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can add social accounts" ON public.brand_channels;
CREATE POLICY "Brand manager can add social accounts"
  ON public.brand_channels FOR INSERT TO authenticated
  WITH CHECK (public.user_can_manage_brand(project_id));

DROP POLICY IF EXISTS "Brand manager can update social accounts" ON public.brand_channels;
CREATE POLICY "Brand manager can update social accounts"
  ON public.brand_channels FOR UPDATE TO authenticated
  USING (public.user_can_manage_brand(project_id))
  WITH CHECK (public.user_can_manage_brand(project_id));

-- The legacy 'owner' role must not reveal all company-wide managers_only docs.
-- Preserve manager/global access and assigned-brand documentation access.
DROP POLICY IF EXISTS "Staff can view knowledge_base" ON public.knowledge_base;
CREATE POLICY "Staff can view knowledge_base" ON public.knowledge_base
  FOR SELECT TO PUBLIC USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      access_level = 'managers_only'::access_level
      AND (
        (venue_id IS NULL AND public.has_role(auth.uid(), 'manager'::app_role))
        OR (
          venue_id IS NOT NULL
          AND venue_id = ANY(public.user_venue_ids())
          AND (
            public.has_role(auth.uid(), 'manager'::app_role)
            OR public.has_role(auth.uid(), 'owner'::app_role)
          )
        )
      )
    )
  );
COMMIT;

-- Critical live stabilization: allow verified managers to upload assets to
-- their own assigned INTERNAL BRAND, as promised by the guided Files page.
-- The older hq_admin_* RESTRICTIVE policies silently overrode the existing
-- project-access PERMISSIVE policies, blocking all non-admin asset uploads.
-- Preserve all existing clients, bar staff, admin roles and bucket isolation.
-- The restricted November 11 recovery snapshot holds the original policies.
BEGIN;

ALTER POLICY "hq_admin_insert" ON public.brand_kit_assets
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.brand_kits kit
        WHERE kit.id = kit_id AND public.user_can_manage_brand(kit.project_id)
      )
    )
  );

ALTER POLICY "hq_admin_update" ON public.brand_kit_assets
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.brand_kits kit
      WHERE kit.id = kit_id AND public.user_can_manage_brand(kit.project_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.brand_kits kit
      WHERE kit.id = kit_id AND public.user_can_manage_brand(kit.project_id)
    )
  );

-- Non-admin managers may delete only files they personally uploaded.
ALTER POLICY "hq_admin_delete" ON public.brand_kit_assets
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.brand_kits kit
        WHERE kit.id = kit_id AND public.user_can_manage_brand(kit.project_id)
      )
    )
  );

-- All paths written by the upload component start with project UUID.
-- Use CASE before casting, since legacy objects may have a non-UUID prefix.
ALTER POLICY "hq_brand_asset_insert" ON storage.objects
  WITH CHECK (
    bucket_id <> 'brand-assets'
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (bucket_id = 'brand-assets' AND (
  CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.user_can_manage_brand(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
))
  );

ALTER POLICY "hq_brand_asset_update" ON storage.objects
  USING (
    bucket_id <> 'brand-assets'
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (bucket_id = 'brand-assets' AND owner_id = auth.uid()::text AND (
  CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.user_can_manage_brand(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
))
  )
  WITH CHECK (
    bucket_id <> 'brand-assets'
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (bucket_id = 'brand-assets' AND owner_id = auth.uid()::text AND (
  CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.user_can_manage_brand(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
))
  );

ALTER POLICY "hq_brand_asset_delete" ON storage.objects
  USING (
    bucket_id <> 'brand-assets'
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (bucket_id = 'brand-assets' AND owner_id = auth.uid()::text AND (
  CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.user_can_manage_brand(((storage.foldername(name))[1])::uuid)
    ELSE false
  END
))
  );

COMMIT;

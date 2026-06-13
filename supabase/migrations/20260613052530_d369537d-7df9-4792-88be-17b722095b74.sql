
CREATE POLICY "brand_assets_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND public.user_can_access_project(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "brand_assets_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND public.user_can_access_project(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "brand_assets_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND public.user_can_access_project(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'brand-assets'
  AND public.user_can_access_project(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "brand_assets_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND public.user_can_access_project(((storage.foldername(name))[1])::uuid)
);

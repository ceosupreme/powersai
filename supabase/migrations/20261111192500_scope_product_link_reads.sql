-- HQ guided brand manager security: hide cross-brand product associations.
-- Idempotent policy hardening. Source snapshot: hq_recovery_20261111.
-- Preserves administrator access and the existing non-client project membership model.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channel_product_channels'
      AND policyname = 'Authenticated can read product channel links'
  ) THEN
    EXECUTE 'ALTER POLICY "Authenticated can read product channel links"
      ON public.channel_product_channels TO authenticated
      USING (public.has_role(auth.uid(), ''admin''::public.app_role)
             OR public.user_can_access_project(project_id))';
  ELSE
    RAISE EXCEPTION 'Expected product-link read policy is missing; review before applying';
  END IF;
END $$;

-- Validation after applying:
-- 1. An authorized brand owner sees only their assigned brand's links.
-- 2. Another owner's brand links are invisible.
-- 3. Client roles cannot read unrelated associations.
-- 4. Administrators retain all rows.

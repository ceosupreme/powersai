-- Follow-up to scoped brand-asset upload repair.
-- A manager can create a brand kit for their own assigned internal brand.
-- The legacy RESTRICTIVE hq_admin_insert policy previously overrode the
-- permissive brand_kits_insert check, so the Files page's "Create file space"
-- failed on internal brands without a kit. Preserve admin/client/staff rules.
BEGIN;

ALTER POLICY "hq_admin_insert" ON public.brand_kits
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    created_by = auth.uid()
    AND public.user_can_manage_brand(project_id)
  )
);

COMMIT;

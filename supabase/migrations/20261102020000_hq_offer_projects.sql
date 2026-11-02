-- Preserve existing offers as unassigned shared-library entries. Never guess a brand.
ALTER TABLE public.service_offers
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS service_offers_project_id_idx ON public.service_offers(project_id);

-- Keep existing creator/admin policies. A project assignment must also be visible
-- to the caller under venues RLS; this function deliberately runs as the caller.
CREATE OR REPLACE FUNCTION public.check_service_offer_project()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.venues WHERE id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'The selected project is not available to you';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS service_offer_project_access ON public.service_offers;
CREATE TRIGGER service_offer_project_access
BEFORE INSERT OR UPDATE OF project_id ON public.service_offers
FOR EACH ROW EXECUTE FUNCTION public.check_service_offer_project();


CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  venue_id uuid NULL REFERENCES public.venues(id) ON DELETE SET NULL,
  leak_stack_run_id uuid NULL REFERENCES public.leak_stack_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX proposals_company_idx ON public.proposals(company_id);
CREATE INDEX proposals_venue_idx ON public.proposals(venue_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_scoped" ON public.proposals
FOR SELECT TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'client')
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (venue_id IS NOT NULL AND public.user_can_access_project(venue_id))
  )
);

CREATE POLICY "proposals_insert_admin" ON public.proposals
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "proposals_update_admin" ON public.proposals
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "proposals_delete_admin" ON public.proposals
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER proposals_set_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.project_type_qualifier_fields
  (field_key, field_label, field_type, is_shared, channel, project_type, sort_order)
SELECT
  'operation_footprint',
  'How big is the operation?',
  'select',
  false,
  NULL,
  'home_services',
  COALESCE(
    (SELECT MAX(sort_order) + 1
       FROM public.project_type_qualifier_fields
      WHERE project_type = 'home_services'),
    100
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_type_qualifier_fields
   WHERE project_type = 'home_services'
     AND field_key = 'operation_footprint'
);

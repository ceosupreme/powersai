
-- Enums
CREATE TYPE public.crm_company_status AS ENUM ('prospect','active','past','archived');
CREATE TYPE public.crm_deal_stage AS ENUM ('lead','pitch','proposal','won','lost');
CREATE TYPE public.crm_interaction_type AS ENUM ('call','email','meeting','note');

-- crm_companies
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  notes text,
  status public.crm_company_status NOT NULL DEFAULT 'prospect',
  linked_project_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_companies TO authenticated;
GRANT ALL ON public.crm_companies TO service_role;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_companies_read" ON public.crm_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_companies_insert" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "crm_companies_update" ON public.crm_companies FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "crm_companies_delete" ON public.crm_companies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_crm_companies_updated BEFORE UPDATE ON public.crm_companies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_crm_companies_linked_project ON public.crm_companies(linked_project_id);
CREATE INDEX idx_crm_companies_status ON public.crm_companies(status);

-- crm_contacts
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contacts_read" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_crm_contacts_updated BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company_id);

-- crm_deals
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  stage public.crm_deal_stage NOT NULL DEFAULT 'lead',
  value numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  expected_close date,
  won_at timestamptz,
  lost_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_deals_read" ON public.crm_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "crm_deals_delete" ON public.crm_deals FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_crm_deals_updated BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_crm_deals_company ON public.crm_deals(company_id);
CREATE INDEX idx_crm_deals_stage_sort ON public.crm_deals(stage, sort_order);

-- crm_interactions
CREATE TABLE public.crm_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  type public.crm_interaction_type NOT NULL DEFAULT 'note',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  follow_up_date date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_interactions TO authenticated;
GRANT ALL ON public.crm_interactions TO service_role;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_interactions_read" ON public.crm_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_interactions_insert" ON public.crm_interactions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "crm_interactions_update" ON public.crm_interactions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "crm_interactions_delete" ON public.crm_interactions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_crm_interactions_updated BEFORE UPDATE ON public.crm_interactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_crm_interactions_company ON public.crm_interactions(company_id);
CREATE INDEX idx_crm_interactions_followup ON public.crm_interactions(follow_up_date) WHERE follow_up_date IS NOT NULL;

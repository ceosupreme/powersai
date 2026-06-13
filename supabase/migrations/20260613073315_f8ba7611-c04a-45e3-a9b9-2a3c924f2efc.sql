
CREATE TYPE public.inbound_lead_status AS ENUM ('new','reviewed','promoted','archived');

CREATE TABLE public.inbound_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_name text,
  email text NOT NULL,
  message text NOT NULL,
  status public.inbound_lead_status NOT NULL DEFAULT 'new',
  promoted_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  source text DEFAULT 'public_site',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.inbound_leads TO authenticated;
GRANT ALL ON public.inbound_leads TO service_role;

ALTER TABLE public.inbound_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read inbound leads"
  ON public.inbound_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update inbound leads"
  ON public.inbound_leads FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_inbound_leads_updated_at
BEFORE UPDATE ON public.inbound_leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_inbound_leads_status_created ON public.inbound_leads(status, created_at DESC);


-- ============ 1. service_offers (account-wide library) ============
CREATE TABLE public.service_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  who_its_for text,
  problem_solved text,
  deliverables text,
  timeline text,
  starter_price numeric,
  premium_price numeric,
  best_target text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_offers TO authenticated;
GRANT ALL ON public.service_offers TO service_role;

ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_offers"
  ON public.service_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_offers"
  ON public.service_offers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update service_offers"
  ON public.service_offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete service_offers"
  ON public.service_offers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER service_offers_updated_at
  BEFORE UPDATE ON public.service_offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed the 7 default offers (editable/deletable)
INSERT INTO public.service_offers (name, description, who_its_for, problem_solved, best_target, status) VALUES
  ('Custom Business Operating System',
    'A lightweight OS for a niche business: website + lead capture + Google presence + follow-up + core operating features. Productized custom build for any industry.',
    'Owner-operators in niche service or local businesses without a unified system',
    'Scattered tools, leads slipping through cracks, no single source of truth for running the business',
    'Single-location owner-operator in a defined niche', 'active'),
  ('AI Automation Systems',
    'Lead generation plus automated follow-up for small businesses — capture, qualify, nurture, hand off.',
    'Small businesses that get inbound interest but lose deals to slow follow-up',
    'Manual follow-up is inconsistent, leads go cold, no nurture sequence',
    'SMB with existing lead flow but no automation layer', 'active'),
  ('Website + Lead-Capture Packages',
    'New site plus a lead-capture funnel wired to a CRM/inbox — opt-ins, forms, thank-you pages, tracking.',
    'Businesses with an outdated or zero-conversion site',
    'Site exists but doesn''t convert visitors into leads',
    'Service business doing $250k–$2M revenue with a weak website', 'active'),
  ('CRM + Follow-Up Systems',
    'Pipeline setup plus automated follow-up sequences. Stage tracking, reminders, templates.',
    'Teams trying to manage pipeline in spreadsheets or memory',
    'No pipeline visibility, missed follow-ups, deals stuck without owner',
    'Sales-led SMB with 1–5 reps', 'active'),
  ('Lovable App Builds',
    'Custom application builds — internal tools, dashboards, client portals, vertical SaaS MVPs.',
    'Operators or founders who need a custom app fast without an in-house dev team',
    'Off-the-shelf software doesn''t fit, custom dev is too slow/expensive',
    'Founders or ops leaders with a clear workflow to productize', 'active'),
  ('Bar/Restaurant Growth Systems',
    'Hospitality growth and operations platform: KPI scoring, guest experience, labor, marketing, weekly review.',
    'Independent bars and restaurants',
    'No unified view of performance, slow weekly review, marketing not tied to outcomes',
    'Independent venue or small group (1–8 locations)', 'active'),
  ('Marketing Automation Packages',
    'Marketing campaign and automation setup — email/SMS sequences, social scheduling, lifecycle flows.',
    'Businesses that want consistent marketing without hiring a full team',
    'Marketing is sporadic, no nurture sequences, no measurement loop',
    'SMB with a list and an offer but no automation', 'active');

-- ============ 2. crm_lead_analyses ============
CREATE TABLE public.crm_lead_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('url','text')),
  source_url text,
  source_text text,
  fetched_content text,
  summary text,
  recommended_offer_id uuid REFERENCES public.service_offers(id) ON DELETE SET NULL,
  recommendation_reason text,
  priority text CHECK (priority IN ('high','medium','low')),
  model text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_lead_analyses_company_idx ON public.crm_lead_analyses(company_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_analyses TO authenticated;
GRANT ALL ON public.crm_lead_analyses TO service_role;

ALTER TABLE public.crm_lead_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_lead_analyses_read"
  ON public.crm_lead_analyses FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_lead_analyses_insert"
  ON public.crm_lead_analyses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_lead_analyses_update"
  ON public.crm_lead_analyses FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_lead_analyses_delete"
  ON public.crm_lead_analyses FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ============ 3. crm_outreach_drafts ============
CREATE TABLE public.crm_outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.crm_lead_analyses(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.service_offers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('cold_email','linkedin_dm','instagram_dm','sms')),
  tone text,
  opener text,
  sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_outreach_drafts_company_idx ON public.crm_outreach_drafts(company_id, created_at DESC);
CREATE INDEX crm_outreach_drafts_analysis_idx ON public.crm_outreach_drafts(analysis_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_outreach_drafts TO authenticated;
GRANT ALL ON public.crm_outreach_drafts TO service_role;

ALTER TABLE public.crm_outreach_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_outreach_drafts_read"
  ON public.crm_outreach_drafts FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_outreach_drafts_insert"
  ON public.crm_outreach_drafts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_outreach_drafts_update"
  ON public.crm_outreach_drafts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "crm_outreach_drafts_delete"
  ON public.crm_outreach_drafts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER crm_outreach_drafts_updated_at
  BEFORE UPDATE ON public.crm_outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

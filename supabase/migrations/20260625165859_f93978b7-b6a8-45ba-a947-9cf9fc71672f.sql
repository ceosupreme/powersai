
-- =========================
-- Foundation Audit schema
-- =========================

-- 1) Category templates (per project_type)
CREATE TABLE public.foundation_category_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type text NOT NULL,
  category_key text NOT NULL,
  label text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1.0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, category_key)
);
GRANT SELECT ON public.foundation_category_templates TO authenticated;
GRANT ALL ON public.foundation_category_templates TO service_role;
ALTER TABLE public.foundation_category_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read foundation_category_templates"
  ON public.foundation_category_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write foundation_category_templates"
  ON public.foundation_category_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Item templates (per project_type)
CREATE TABLE public.foundation_item_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type text NOT NULL,
  category_key text NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  description text,
  detection_signal text NOT NULL DEFAULT 'manual',
  is_manual_only boolean NOT NULL DEFAULT false,
  severity text NOT NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0,
  recommended_fix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, item_key),
  CHECK (severity IN ('low','medium','high','critical'))
);
GRANT SELECT ON public.foundation_item_templates TO authenticated;
GRANT ALL ON public.foundation_item_templates TO service_role;
ALTER TABLE public.foundation_item_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read foundation_item_templates"
  ON public.foundation_item_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write foundation_item_templates"
  ON public.foundation_item_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) Per-project category overrides
CREATE TABLE public.project_foundation_category_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  category_key text NOT NULL,
  label text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1.0,
  sort_order integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, category_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_foundation_category_overrides TO authenticated;
GRANT ALL ON public.project_foundation_category_overrides TO service_role;
ALTER TABLE public.project_foundation_category_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project access read foundation_category_overrides"
  ON public.project_foundation_category_overrides FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE POLICY "admin write foundation_category_overrides"
  ON public.project_foundation_category_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) Per-project item overrides
CREATE TABLE public.project_foundation_item_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  category_key text NOT NULL,
  item_key text NOT NULL,
  label text NOT NULL,
  description text,
  detection_signal text NOT NULL DEFAULT 'manual',
  is_manual_only boolean NOT NULL DEFAULT false,
  severity text NOT NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0,
  recommended_fix text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, item_key),
  CHECK (severity IN ('low','medium','high','critical'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_foundation_item_overrides TO authenticated;
GRANT ALL ON public.project_foundation_item_overrides TO service_role;
ALTER TABLE public.project_foundation_item_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project access read foundation_item_overrides"
  ON public.project_foundation_item_overrides FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE POLICY "admin write foundation_item_overrides"
  ON public.project_foundation_item_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Per-venue item status (the actual audit state)
CREATE TABLE public.venue_foundation_item_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  item_key text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  evidence_url text,
  notes text,
  source text NOT NULL DEFAULT 'auto',
  detected_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, item_key),
  CHECK (status IN ('satisfied','partial','missing','unknown','not_applicable')),
  CHECK (source IN ('auto','manual'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_foundation_item_status TO authenticated;
GRANT ALL ON public.venue_foundation_item_status TO service_role;
ALTER TABLE public.venue_foundation_item_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project access read foundation_item_status"
  ON public.venue_foundation_item_status FOR SELECT TO authenticated
  USING (public.user_can_access_project(venue_id));
CREATE POLICY "project access write foundation_item_status"
  ON public.venue_foundation_item_status FOR ALL TO authenticated
  USING (public.user_can_access_project(venue_id))
  WITH CHECK (public.user_can_access_project(venue_id));

-- 6) Audit run history
CREATE TABLE public.foundation_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  triggered_by uuid,
  status text NOT NULL DEFAULT 'running',
  triggered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  resolved integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  summary jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('running','success','partial','failed'))
);
GRANT SELECT, INSERT, UPDATE ON public.foundation_audit_runs TO authenticated;
GRANT ALL ON public.foundation_audit_runs TO service_role;
ALTER TABLE public.foundation_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project access read foundation_audit_runs"
  ON public.foundation_audit_runs FOR SELECT TO authenticated
  USING (public.user_can_access_project(venue_id));
CREATE POLICY "admin write foundation_audit_runs"
  ON public.foundation_audit_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER trg_foundation_category_templates_uat
  BEFORE UPDATE ON public.foundation_category_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_foundation_item_templates_uat
  BEFORE UPDATE ON public.foundation_item_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_project_foundation_category_overrides_uat
  BEFORE UPDATE ON public.project_foundation_category_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_project_foundation_item_overrides_uat
  BEFORE UPDATE ON public.project_foundation_item_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_venue_foundation_item_status_uat
  BEFORE UPDATE ON public.venue_foundation_item_status
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================
-- Seed: home_services
-- =========================

INSERT INTO public.foundation_category_templates (project_type, category_key, label, description, weight, sort_order) VALUES
  ('home_services','legal_admin','Legal & Admin','Entity, EIN, bank, insurance, licenses, policies.',1.5,10),
  ('home_services','brand_identity','Brand Identity','Logo, colors, typography, tagline, voice.',1.0,20),
  ('home_services','web_presence','Web Presence','Live site, SSL, mobile, contact, SEO basics.',1.2,30),
  ('home_services','google_local','Google & Local','GBP claimed, verified, hours, photos, NAP.',1.5,40),
  ('home_services','reviews','Reviews','Volume, rating, response posture.',1.2,50),
  ('home_services','social','Social','Profiles linked, recent activity.',0.8,60),
  ('home_services','offers_channels','Offers & Channels','Productized service offers and channel coverage.',1.0,70),
  ('home_services','collateral','Collateral','Cards, vehicle, uniform, leave-behinds.',0.6,80);

INSERT INTO public.foundation_item_templates
  (project_type, category_key, item_key, label, description, detection_signal, is_manual_only, severity, sort_order, recommended_fix) VALUES
  -- legal / admin (all manual)
  ('home_services','legal_admin','llc_formed','LLC / entity formed','State filing for the operating entity.','manual',true,'critical',10,'File LLC with your state and link the formation docs.'),
  ('home_services','legal_admin','ein_obtained','EIN obtained','Federal employer identification number.','manual',true,'critical',20,'Apply free at irs.gov/ein and link the confirmation.'),
  ('home_services','legal_admin','bank_account','Business bank account','Separate operating account.','manual',true,'high',30,'Open a dedicated business checking account.'),
  ('home_services','legal_admin','general_liability_insurance','General liability insurance','Active GL policy.','manual',true,'critical',40,'Bind GL coverage; link the COI.'),
  ('home_services','legal_admin','workers_comp','Workers'' comp (if employees)','Required once you have W-2 staff.','manual',true,'high',50,'Add WC policy through your carrier.'),
  ('home_services','legal_admin','trade_license','Trade / contractor license','State or municipal license.','manual',true,'critical',60,'File the trade license required for your scope.'),
  ('home_services','legal_admin','privacy_tos','Privacy policy & ToS','Public web policies.','manual',true,'medium',70,'Publish privacy + ToS pages on the site.'),
  ('home_services','legal_admin','accounting_system','Accounting system','Books in QBO/Xero/similar.','manual',true,'medium',80,'Set up QBO or Xero and connect the bank feed.'),
  ('home_services','legal_admin','payment_processor','Payment processor live','Card processing for invoices.','manual',true,'high',90,'Activate Stripe / Square / processor of choice.'),

  -- brand identity (auto)
  ('home_services','brand_identity','logo_uploaded','Logo in brand kit','Vector logo stored.','brand.logo',false,'high',10,'Upload primary logo to Brand Kit.'),
  ('home_services','brand_identity','colors_defined','Brand colors defined','At least 2 brand colors.','brand.colors',false,'medium',20,'Add brand colors in Brand Kit.'),
  ('home_services','brand_identity','tagline_defined','Tagline written','One-line positioning.','brand.tagline',false,'medium',30,'Capture a tagline in Brand Kit.'),

  -- web presence (auto)
  ('home_services','web_presence','website_live','Website live','Reachable URL.','website.live',false,'critical',10,'Publish a live site and map it in settings.'),
  ('home_services','web_presence','https_enabled','HTTPS enabled','TLS active.','website.https',false,'high',20,'Enable HTTPS on the domain.'),
  ('home_services','web_presence','mobile_friendly','Mobile friendly','Responsive layout.','website.mobile',false,'high',30,'Fix mobile responsiveness.'),
  ('home_services','web_presence','contact_form','Contact / quote path','Inbound contact path exists.','website.contact',false,'high',40,'Add a contact or quote-request form.'),

  -- google / local (auto)
  ('home_services','google_local','gbp_mapped','GBP linked','Place mapped to project.','gbp.mapped',false,'critical',10,'Map the Google Business Profile in settings.'),
  ('home_services','google_local','gbp_hours_complete','GBP hours complete','Open/close hours filled.','gbp.hours',false,'medium',20,'Fill business hours on the profile.'),
  ('home_services','google_local','gbp_photos','GBP photos (≥10)','Photo set populated.','gbp.photos',false,'medium',30,'Upload at least 10 photos.'),
  ('home_services','google_local','nap_consistent','NAP consistent','Name/address/phone match.','gbp.nap',false,'high',40,'Align NAP across GBP and site.'),

  -- reviews (auto)
  ('home_services','reviews','has_reviews','Has reviews','At least one review tracked.','reviews.has',false,'high',10,'Start requesting reviews via the Review Requests automation.'),
  ('home_services','reviews','rating_4_plus','Average rating ≥ 4.0','Healthy average.','reviews.rating',false,'high',20,'Address service issues; respond to negative reviews.'),
  ('home_services','reviews','review_volume_25','Review volume ≥ 25','Enough reviews for trust.','reviews.volume',false,'medium',30,'Run review-request automation to past customers.'),

  -- social (auto)
  ('home_services','social','instagram_linked','Instagram linked','IG handle in brand kit links.','social.instagram',false,'low',10,'Add IG link in Brand Kit > Links.'),
  ('home_services','social','facebook_linked','Facebook linked','FB page in brand kit links.','social.facebook',false,'low',20,'Add FB link in Brand Kit > Links.'),
  ('home_services','social','recent_post_30d','Posted in last 30 days','Activity signal.','social.recent',false,'low',30,'Schedule at least one post per month.'),

  -- offers / channels (auto)
  ('home_services','offers_channels','has_service_offer','At least one service offer','Productized scope.','offers.has',false,'high',10,'Define a service offer in Offers.'),
  ('home_services','offers_channels','channel_coverage','Channels configured','At least one acquisition channel.','channels.has',false,'medium',20,'Set up acquisition channels.'),

  -- collateral (mostly manual)
  ('home_services','collateral','primary_contact','Primary contact on file','Owner/GM contact listed.','contacts.primary',false,'medium',10,'Add a primary contact in venue settings.'),
  ('home_services','collateral','business_cards','Business cards printed','Physical collateral.','manual',true,'low',20,'Order business cards.'),
  ('home_services','collateral','vehicle_branding','Vehicle / uniform branded','Field branding.','manual',true,'low',30,'Apply vehicle decals or branded uniforms.');

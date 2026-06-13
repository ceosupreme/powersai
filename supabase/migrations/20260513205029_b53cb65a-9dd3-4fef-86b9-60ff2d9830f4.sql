
-- ============================================================================
-- Growth Audit: persistent findings + type templates + audit trail + runs
-- ============================================================================

-- ---------- 1. Finding type templates ----------
CREATE TABLE IF NOT EXISTS public.growth_finding_types (
  type_id text PRIMARY KEY,
  label text NOT NULL,
  default_category text NOT NULL,
  default_traffic_driving boolean NOT NULL DEFAULT false,
  diagnosis_pattern text NOT NULL DEFAULT '',
  recommended_action_pattern text NOT NULL DEFAULT '',
  action_pack_blueprint jsonb NOT NULL DEFAULT '{"summary":"","assets":[]}'::jsonb,
  evidence_hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_finding_types ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gft_updated_at ON public.growth_finding_types;
CREATE TRIGGER trg_gft_updated_at BEFORE UPDATE ON public.growth_finding_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Authenticated read finding types"
  ON public.growth_finding_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage finding types"
  ON public.growth_finding_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 2. Findings (continuous-signal) ----------
CREATE TABLE IF NOT EXISTS public.growth_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  type_id text NOT NULL,
  signal_key text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Critical','High','Medium','Low')),
  status text NOT NULL DEFAULT 'New'
    CHECK (status IN ('New','In Progress','Sent to Marketing Hub','Resolved','Dismissed','Snoozed')),
  revenue_upside smallint NOT NULL DEFAULT 3 CHECK (revenue_upside BETWEEN 1 AND 5),
  ease smallint NOT NULL DEFAULT 3 CHECK (ease BETWEEN 1 AND 5),
  confidence smallint NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  operational_risk smallint NOT NULL DEFAULT 3 CHECK (operational_risk BETWEEN 1 AND 5),
  priority_score numeric NOT NULL DEFAULT 0,
  is_traffic_driving boolean NOT NULL DEFAULT false,
  gate_reason text,
  title text NOT NULL,
  diagnosis text NOT NULL DEFAULT '',
  recommended_action text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '{"summary":"","sources":[]}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  dismiss_reason text,
  snoozed_until date,
  override_active boolean NOT NULL DEFAULT false,
  override_reason text,
  action_pack_id text,
  campaign_id text,
  outcome text CHECK (outcome IN ('Kill','Improve','Repeat','Scale')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_growth_findings_active_signal
  ON public.growth_findings (venue_id, signal_key)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gf_venue_status   ON public.growth_findings(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_gf_venue_category ON public.growth_findings(venue_id, category);
CREATE INDEX IF NOT EXISTS idx_gf_venue_type     ON public.growth_findings(venue_id, type_id);
CREATE INDEX IF NOT EXISTS idx_gf_venue_resolved ON public.growth_findings(venue_id, resolved_at);

ALTER TABLE public.growth_findings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_gf_updated_at ON public.growth_findings;
CREATE TRIGGER trg_gf_updated_at BEFORE UPDATE ON public.growth_findings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Admins manage findings"
  ON public.growth_findings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Venue members read findings"
  ON public.growth_findings FOR SELECT TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()));
CREATE POLICY "Venue members update findings"
  ON public.growth_findings FOR UPDATE TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()))
  WITH CHECK (venue_id = ANY (public.user_venue_ids()));

-- ---------- 3. Status audit trail ----------
CREATE TABLE IF NOT EXISTS public.growth_finding_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES public.growth_findings(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  actor_user_id uuid,
  actor_service text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gfsa_finding ON public.growth_finding_status_audit(finding_id, created_at DESC);

ALTER TABLE public.growth_finding_status_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit"
  ON public.growth_finding_status_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Venue members read audit"
  ON public.growth_finding_status_audit FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.growth_findings gf
    WHERE gf.id = finding_id AND gf.venue_id = ANY (public.user_venue_ids())
  ));

CREATE OR REPLACE FUNCTION public.fn_growth_findings_audit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_service text;
  v_reason text;
BEGIN
  v_actor_service := nullif(current_setting('app.actor_service', true), '');
  v_reason := nullif(current_setting('app.actor_reason', true), '');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.growth_finding_status_audit
      (finding_id, previous_status, new_status, reason, actor_user_id, actor_service)
    VALUES (NEW.id, NULL, NEW.status, COALESCE(v_reason, 'created'), auth.uid(), v_actor_service);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.growth_finding_status_audit
      (finding_id, previous_status, new_status, reason, actor_user_id, actor_service)
    VALUES (NEW.id, OLD.status, NEW.status,
            COALESCE(v_reason, NEW.dismiss_reason),
            auth.uid(), v_actor_service);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gf_status_audit_ins ON public.growth_findings;
CREATE TRIGGER trg_gf_status_audit_ins AFTER INSERT ON public.growth_findings
  FOR EACH ROW EXECUTE FUNCTION public.fn_growth_findings_audit_status();

DROP TRIGGER IF EXISTS trg_gf_status_audit_upd ON public.growth_findings;
CREATE TRIGGER trg_gf_status_audit_upd AFTER UPDATE OF status ON public.growth_findings
  FOR EACH ROW EXECUTE FUNCTION public.fn_growth_findings_audit_status();

-- ---------- 4. Audit runs (Refresh Now log) ----------
CREATE TABLE IF NOT EXISTS public.growth_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  triggered_by uuid,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'stub',
  notes text
);

CREATE INDEX IF NOT EXISTS idx_gar_venue_time ON public.growth_audit_runs(venue_id, triggered_at DESC);

ALTER TABLE public.growth_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage runs"
  ON public.growth_audit_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Venue members read runs"
  ON public.growth_audit_runs FOR SELECT TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()));
CREATE POLICY "Venue members insert runs"
  ON public.growth_audit_runs FOR INSERT TO authenticated
  WITH CHECK (venue_id = ANY (public.user_venue_ids()));

-- ---------- 5. Seed: finding type templates (10) ----------
INSERT INTO public.growth_finding_types
  (type_id, label, default_category, default_traffic_driving, diagnosis_pattern, recommended_action_pattern, action_pack_blueprint, evidence_hints)
VALUES
('soft_shift_opportunity','Soft Shift Opportunity','revenue',true,
 '[Day] [time range] revenue is [X]% below the venue''s [day-type] average',
 'Test a targeted [campaign theme] campaign for [day] [time range]',
 '{"summary":"Targeted promo to lift a single underperforming shift, with measurable A/B window.","assets":[{"kind":"social_post","title":"Shift-specific feature post (Instagram + Facebook)"},{"kind":"gbp_post","title":"GBP \"What''s New\" promo for the shift"},{"kind":"staff_script","title":"Staff upsell script for the shift"},{"kind":"campaign_brief","title":"4-week test campaign brief with success metric"}]}'::jsonb,
 '["Toast — Daily metrics","Schedule (7shifts)"]'::jsonb),
('strong_shift_amplification','Strong Shift Amplification','revenue',true,
 '[Day] [time range] revenue is [X]% above baseline — amplify with marketing',
 'Build content + promotion around [day] [time range] using [theme]',
 '{"summary":"Amplify what already works — content series + email + menu placement around the strong shift.","assets":[{"kind":"social_post","title":"4-post content series spotlighting the shift"},{"kind":"email_draft","title":"Subscriber email feature (\"don''t miss this\")"},{"kind":"menu_callout","title":"Print/digital menu callout for the shift"},{"kind":"campaign_brief","title":"Amplification brief with reach and lift target"}]}'::jsonb,
 '["Toast — Daily metrics","Toast — Item mix"]'::jsonb),
('menu_item_under_promotion','Menu Item Under-Promotion','menu',false,
 '[Item] generates [margin/volume] but appears in zero recent marketing efforts',
 'Feature [item] in social, GBP posts, and staff scripts for [duration]',
 '{"summary":"Move a high-margin or high-volume item from invisible to featured.","assets":[{"kind":"social_post","title":"Hero post + 2 follow-ups featuring the item"},{"kind":"gbp_post","title":"GBP product post with photo and price"},{"kind":"staff_script","title":"Suggestive-sell script for FOH"},{"kind":"menu_callout","title":"Menu placement spec (position, badge, copy)"}]}'::jsonb,
 '["Toast — Item mix","Marketing log (Asana)"]'::jsonb),
('event_lift_opportunity','Event Lift Opportunity','events',true,
 '[Event] lifts [category] sales but [other category] stays flat',
 'Add a complementary [offering] / cross-promotion to capture [other category]',
 '{"summary":"Capture the missing category lift on an event night with complementary product.","assets":[{"kind":"social_post","title":"Event-night cross-promo post"},{"kind":"menu_callout","title":"Event-only menu insert (cross-category items)"},{"kind":"campaign_brief","title":"Cross-promo brief with attach-rate target"}]}'::jsonb,
 '["Toast — Item mix","Event calendar"]'::jsonb),
('event_underperformance','Event Underperformance','events',false,
 '[Event] occurs [frequency] but revenue is similar to non-event nights',
 'Change [theme/offer/timing] or discontinue [event]',
 '{"summary":"Decide: kill, improve, repeat, or scale — with structured options before pulling the plug.","assets":[{"kind":"campaign_brief","title":"Kill / Improve / Repeat / Scale decision brief"}]}'::jsonb,
 '["Toast — Daily metrics","Event calendar"]'::jsonb),
('reputation_theme_opportunity','Reputation Theme Opportunity','reputation',true,
 'Reviews praise [theme] but marketing rarely features it',
 'Convert [theme] into a social-proof content series and GBP posts',
 '{"summary":"Turn what guests already love into a social-proof engine.","assets":[{"kind":"social_post","title":"Review-quote content series (4 posts)"},{"kind":"website_block","title":"Homepage testimonial block spec"},{"kind":"gbp_post","title":"GBP highlight post featuring the theme"}]}'::jsonb,
 '["Review sentiment classifier","Yelp Business API","Google Reviews"]'::jsonb),
('reputation_risk','Reputation Risk','reputation',false,
 'Reviews mention [issue] in [shift/area] — operational concern',
 'Flag [shift/area] for ops fix; do not push traffic until resolved',
 '{"summary":"Flag the operational gap behind the reviews and prep response language.","assets":[{"kind":"ops_fix_brief","title":"Ops-fix brief with owner, deadline, and re-evaluation metric"},{"kind":"staff_script","title":"Review-response template for the issue"}]}'::jsonb,
 '["Review sentiment classifier","Toast KDS ticket times","7shifts schedule"]'::jsonb),
('operational_readiness_blocker','Operational Readiness Blocker','operational',false,
 '[Shift] shows demand but labor/service indicators suggest capacity strain',
 'Fix [staffing/workflow] before marketing; never auto-push traffic',
 '{"summary":"No marketing assets — fix capacity first. Gate enforces this before traffic-driving content can ship.","assets":[{"kind":"ops_fix_brief","title":"Ops-fix brief (staffing/workflow) with re-evaluation date"}]}'::jsonb,
 '["7shifts schedule","Toast KDS ticket times","Review sentiment classifier"]'::jsonb),
('private_party_conversion_gap','Private Party / Group Conversion Gap','website',false,
 'No private party page / inquiry form / package found on website',
 'Build a [landing page + inquiry form + package] and a follow-up sequence',
 '{"summary":"Build the missing conversion path: page, form, package, and follow-up.","assets":[{"kind":"website_block","title":"Private-party landing page spec"},{"kind":"inquiry_form_spec","title":"Inquiry form fields + routing spec"},{"kind":"email_draft","title":"3-touch follow-up sequence"},{"kind":"campaign_brief","title":"Group/private-event launch brief"}]}'::jsonb,
 '["Site audit","Site chat transcripts"]'::jsonb),
('local_visibility_gap','Local Visibility Gap','local',true,
 'Venue not appearing for [search term] in [area]',
 'GBP refresh + posts + photos + attribute updates + review responses for [term]',
 '{"summary":"GBP-led visibility refresh + review velocity for the missing search terms.","assets":[{"kind":"gbp_post","title":"Weekly GBP post cadence (4 posts)"},{"kind":"social_post","title":"Local-intent post with neighborhood tag"},{"kind":"website_block","title":"On-page block targeting the search term"},{"kind":"campaign_brief","title":"Review-request brief mentioning the term"}]}'::jsonb,
 '["BrightLocal rank tracker","Google Business Profile API"]'::jsonb)
ON CONFLICT (type_id) DO NOTHING;

-- ---------- 6. Seed: 10 demo findings × every venue ----------
WITH seed(idx, type_id, category, severity, status, title, diagnosis, rec_action, ru, ea, co, op, traffic, gate_reason, evidence, snoozed_until, created_at) AS (
  VALUES
  (1,'soft_shift_opportunity','revenue','High','New',
   'Tuesday 4–7pm revenue 28% below weekday happy-hour baseline',
   'Tuesday 4–7pm revenue is 28% below the venue''s weekday happy-hour average. The shift has the same physical capacity but is leaking the local after-work crowd to nearby competitors.',
   'Test a targeted pre-karaoke happy hour (Tue 4–7pm) with a 4-week measurement window before scaling.',
   4,4,4,2,true,'Mid-week BOH coverage already thin; verify staffing holds before pushing happy-hour traffic.',
   '{"summary":"Trailing 8 weeks: Tue 4–7pm $1,820 net vs weekday HH baseline $2,540. Cover counts down 22% in same window.","sources":[{"label":"Toast — Daily metrics","ref":"toast.daily"},{"label":"Schedule (7shifts)","ref":"7shifts.schedule"}]}'::jsonb,
   NULL::date,'2026-05-06T14:00:00Z'::timestamptz),
  (2,'strong_shift_amplification','revenue','Medium','In Progress',
   'Saturday brunch 35% above brunch baseline — amplify',
   'Saturday brunch revenue is 35% above the brunch baseline — amplify with marketing. The shift already has product-market fit; reach is the bottleneck, not the offering.',
   'Build a 4-post content series + subscriber email + menu callout around Saturday brunch over the next 4 weeks.',
   4,4,5,1,true,NULL,
   '{"summary":"Trailing 6 weeks: Sat brunch $7,420 net vs brunch baseline $5,490. Cover counts and avg ticket both up.","sources":[{"label":"Toast — Daily metrics","ref":"toast.daily"},{"label":"Toast — Item mix","ref":"toast.menu_mix"}]}'::jsonb,
   NULL,'2026-05-04T10:00:00Z'::timestamptz),
  (3,'menu_item_under_promotion','menu','Medium','New',
   'Wings: 18% of food revenue, 0 marketing efforts in last 90 days',
   'Wings generate 18% of food revenue at 64% margin but appear in zero recent marketing efforts. The item is doing the work organically — promotion will compound it.',
   'Feature wings in social, GBP posts, and FOH staff scripts for the next 30 days.',
   3,5,5,1,false,NULL,
   '{"summary":"Wings = 18% of food revenue trailing 90d, 64% gross margin. Marketing log shows 0 social/GBP/email mentions in the same window.","sources":[{"label":"Toast — Item mix","ref":"toast.menu_mix"},{"label":"Marketing log (Asana)","ref":"asana.marketing"}]}'::jsonb,
   NULL,'2026-05-05T09:00:00Z'::timestamptz),
  (4,'event_lift_opportunity','events','Medium','New',
   'Karaoke lifts beverages 40% but food sales stay flat',
   'Karaoke lifts beverage sales 40% but food sales stay flat. The crowd is engaged and spending — they just have nothing easy to share over.',
   'Add a karaoke shareables menu insert + cross-promo (e.g. "Round + Wings" combo) to capture food attach.',
   3,4,4,2,true,'Adding food attach increases BOH load on a high-volume night. Confirm prep capacity before launch.',
   '{"summary":"Karaoke nights (Thu/Sat): bev avg +40% vs same-DOW baseline; food avg +3%. Attach rate 0.8 food items/cover vs 1.4 baseline.","sources":[{"label":"Toast — Item mix","ref":"toast.menu_mix"},{"label":"Event calendar","ref":"events.calendar"}]}'::jsonb,
   NULL,'2026-05-03T11:00:00Z'::timestamptz),
  (5,'event_underperformance','events','Low','Snoozed',
   'Monday open-mic averages $4,200 vs Monday baseline of $4,100',
   'Monday open-mic occurs weekly but revenue is statistically equivalent to non-event Mondays. The event is consuming staff bandwidth and stage cost without lift.',
   'Replace open-mic with a tested format (trivia or industry night) for 4 weeks; if no lift, discontinue.',
   2,3,4,2,false,NULL,
   '{"summary":"Trailing 12 Mondays with open-mic: $4,200 net avg vs Monday no-event baseline $4,100. Cover counts identical.","sources":[{"label":"Toast — Daily metrics","ref":"toast.daily"},{"label":"Event calendar","ref":"events.calendar"}]}'::jsonb,
   '2026-05-20'::date,'2026-04-15T09:00:00Z'::timestamptz),
  (6,'reputation_theme_opportunity','reputation','Medium','New',
   'Karaoke and atmosphere are top positive review themes — feature them',
   'Reviews praise karaoke and atmosphere but marketing rarely features either. Guests are already telling the story — repeat it.',
   'Convert karaoke + atmosphere review themes into a 4-post social series and refresh GBP highlights.',
   3,5,4,1,true,NULL,
   '{"summary":"Last 90d reviews: \"karaoke\" mentioned positively in 38%, \"atmosphere/vibe\" in 31%. Marketing log shows ~5% of posts reference either.","sources":[{"label":"Review sentiment classifier","ref":"reviews.sentiment"},{"label":"Yelp Business API","ref":"yelp.reviews"},{"label":"Marketing log (Asana)","ref":"asana.marketing"}]}'::jsonb,
   NULL,'2026-05-02T16:00:00Z'::timestamptz),
  (7,'reputation_risk','reputation','High','In Progress',
   'Reviews mention slow service after 10pm — late-night ops risk',
   'Reviews mention slow service after 10pm — operational concern. This is the same shift driving the Caution gate; reputation will keep degrading if traffic is added.',
   'Flag late-night for ops fix (staffing + expo workflow). Do not push late-night traffic until KDS ticket time clears 12 min for 2 consecutive weeks.',
   2,2,5,1,false,NULL,
   '{"summary":"9 of last 30 reviews cite slow service after 10pm. KDS ticket time avg 18.4 min vs 12 min target in the same window.","sources":[{"label":"Review sentiment classifier","ref":"reviews.sentiment"},{"label":"Toast KDS ticket times","ref":"toast.kds"},{"label":"7shifts schedule","ref":"7shifts.schedule"}]}'::jsonb,
   NULL,'2026-04-29T08:00:00Z'::timestamptz),
  (8,'operational_readiness_blocker','operational','Critical','In Progress',
   'Friday late-night labor 22% under capacity vs covers',
   'Friday late-night demand is high but labor is below 7shifts target and reviews confirm capacity strain. This is the venue''s ops bottleneck and the reason the Ops Readiness Gate is in Caution.',
   'Add 1 BOH and 1 FOH to Wed–Sat 9:30pm–close. Re-evaluate gate in 2 weeks.',
   4,2,5,1,false,NULL,
   '{"summary":"Wed–Sat 10pm–close: 3.1 staff scheduled vs 4.0 modeled requirement; ticket times 18.4 min vs 12 target; 9/30 reviews cite slow service.","sources":[{"label":"7shifts schedule","ref":"7shifts.schedule"},{"label":"Toast KDS ticket times","ref":"toast.kds"},{"label":"Review sentiment classifier","ref":"reviews.sentiment"}]}'::jsonb,
   NULL,'2026-04-28T13:00:00Z'::timestamptz),
  (9,'private_party_conversion_gap','website','High','New',
   'Website lacks private party page despite venue size and group demand',
   'No private party page, inquiry form, or package found on the website. Group demand is arriving via chat and bouncing because there is no path to convert it.',
   'Build a private-party landing page, structured inquiry form, two-tier package, and a 3-touch follow-up sequence.',
   5,3,4,1,false,NULL,
   '{"summary":"Site audit: no /private-events page, no inquiry form, no group package. Site chat logs show 24 group inquiries in last 60d routed to generic email.","sources":[{"label":"Site audit","ref":"audit.site"},{"label":"Site chat transcripts","ref":"site.chat"}]}'::jsonb,
   NULL,'2026-05-01T15:00:00Z'::timestamptz),
  (10,'local_visibility_gap','local','Medium','Sent to Marketing Hub',
   'Not appearing for "karaoke bar Gaslamp" despite category leadership',
   'Venue is not appearing for "karaoke bar Gaslamp" despite being one of the few karaoke venues in the area. GBP signals (attributes, post cadence, photo freshness) are well below the two ranking competitors.',
   'GBP refresh + weekly posts + photos + attribute updates + a review-request push mentioning "karaoke" for the next 4 weeks.',
   4,3,4,2,true,'Search-driven karaoke traffic peaks Thu–Sat late-night — same window as the late-night ops issue. Verify staffing before pushing.',
   '{"summary":"BrightLocal: rank avg 9.4 over last 14d for \"karaoke bar Gaslamp\" (and 5 related queries). Only 2 other venues in Gaslamp offer karaoke — both rank top 3.","sources":[{"label":"BrightLocal rank tracker","ref":"brightlocal.local_pack"},{"label":"Google Business Profile API","ref":"gbp.attributes"}]}'::jsonb,
   NULL,'2026-04-25T13:00:00Z'::timestamptz)
)
INSERT INTO public.growth_findings (
  venue_id, type_id, signal_key, category, severity, status,
  revenue_upside, ease, confidence, operational_risk, priority_score,
  is_traffic_driving, gate_reason, title, diagnosis, recommended_action, evidence,
  snoozed_until, first_detected_at, last_seen_at
)
SELECT
  v.id, s.type_id,
  'seed:' || s.idx || ':' || s.type_id,
  s.category, s.severity, s.status,
  s.ru, s.ea, s.co, s.op,
  ROUND(GREATEST(0, s.ru * s.ea * s.co - s.op)::numeric / 124 * 100),
  s.traffic, s.gate_reason, s.title, s.diagnosis, s.rec_action, s.evidence,
  s.snoozed_until, s.created_at, now()
FROM public.venues v
CROSS JOIN seed s
ON CONFLICT DO NOTHING;

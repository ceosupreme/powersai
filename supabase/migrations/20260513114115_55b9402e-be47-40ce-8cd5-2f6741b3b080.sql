
CREATE TABLE IF NOT EXISTS public.finding_campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id text NOT NULL,
  campaign_id text NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  finding_type text,
  outcome text NOT NULL CHECK (outcome IN ('Resolved','Open','Failed','Inconclusive')),
  score_delta numeric,
  confidence text NOT NULL CHECK (confidence IN ('High','Medium','Low')),
  attribution_tier smallint NOT NULL CHECK (attribution_tier IN (1,2,3)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (finding_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_fcl_finding ON public.finding_campaign_links(finding_id);
CREATE INDEX IF NOT EXISTS idx_fcl_venue   ON public.finding_campaign_links(venue_id);
CREATE INDEX IF NOT EXISTS idx_fcl_type    ON public.finding_campaign_links(finding_type);

DROP TRIGGER IF EXISTS trg_fcl_updated_at ON public.finding_campaign_links;
CREATE TRIGGER trg_fcl_updated_at
  BEFORE UPDATE ON public.finding_campaign_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.finding_campaign_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access finding_campaign_links"
  ON public.finding_campaign_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue members read finding_campaign_links"
  ON public.finding_campaign_links
  FOR SELECT TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue members insert finding_campaign_links"
  ON public.finding_campaign_links
  FOR INSERT TO authenticated
  WITH CHECK (venue_id = ANY (public.user_venue_ids()));

CREATE POLICY "Venue members update finding_campaign_links"
  ON public.finding_campaign_links
  FOR UPDATE TO authenticated
  USING (venue_id = ANY (public.user_venue_ids()))
  WITH CHECK (venue_id = ANY (public.user_venue_ids()));

CREATE OR REPLACE VIEW public.finding_outcome_stats AS
SELECT
  finding_type,
  COUNT(*)                                          AS attempts,
  COUNT(*) FILTER (WHERE outcome = 'Resolved')      AS resolved,
  COUNT(*) FILTER (WHERE outcome = 'Failed')        AS failed,
  COUNT(*) FILTER (WHERE outcome = 'Inconclusive')  AS inconclusive,
  ROUND(AVG(score_delta) FILTER (WHERE score_delta IS NOT NULL), 2) AS avg_score_delta,
  ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'Resolved') / NULLIF(COUNT(*),0), 1) AS resolved_pct
FROM public.finding_campaign_links
WHERE finding_type IS NOT NULL
GROUP BY finding_type;


-- =========================================================
-- marketing_campaigns: persistent store for all campaigns
-- =========================================================

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id text PRIMARY KEY,

  -- Identity
  venue_id text NOT NULL,
  venue_name text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('growth_audit','manual_barpulse','manual_external')),
  external_subsource text,
  originating_finding_id text,

  -- Core
  title text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time text,
  end_time text,
  description text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  recurrence text NOT NULL DEFAULT 'One-Time',
  target_audience text NOT NULL DEFAULT '',
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_partner text,
  brand_partner_contribution numeric,
  budget numeric,
  expected_guest_count numeric,
  expected_revenue_impact numeric,
  linked_toast_promo_code text,
  linked_menu_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_metric text NOT NULL DEFAULT '',
  assigned_to text,
  internal_notes text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Execution adapter & sync
  execution_adapter jsonb,
  sync_lost boolean NOT NULL DEFAULT false,
  last_synced_from text CHECK (last_synced_from IN ('barpulse','asana') OR last_synced_from IS NULL),

  -- Needs-details (Path 3 ingestion of incomplete Asana tasks)
  needs_details boolean NOT NULL DEFAULT false,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Results (after Ended)
  results jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_venue ON public.marketing_campaigns(venue_id);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_origin ON public.marketing_campaigns(origin);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_external_id
  ON public.marketing_campaigns ((execution_adapter->>'external_id'))
  WHERE execution_adapter ? 'external_id';

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_mkt_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trg_mkt_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage all campaigns"
  ON public.marketing_campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Venue owners: read & write campaigns for their venue.
-- venue_id is stored as text; only attempt a uuid match when it parses as a uuid.
CREATE POLICY "Venue owners read their campaigns"
  ON public.marketing_campaigns
  FOR SELECT
  TO authenticated
  USING (
    venue_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND venue_id::uuid = ANY(public.user_venue_ids())
  );

CREATE POLICY "Venue owners insert their campaigns"
  ON public.marketing_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    venue_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND venue_id::uuid = ANY(public.user_venue_ids())
  );

CREATE POLICY "Venue owners update their campaigns"
  ON public.marketing_campaigns
  FOR UPDATE
  TO authenticated
  USING (
    venue_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND venue_id::uuid = ANY(public.user_venue_ids())
  );

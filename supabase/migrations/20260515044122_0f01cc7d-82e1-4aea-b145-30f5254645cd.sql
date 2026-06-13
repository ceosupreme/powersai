
-- Growth Audit: history snapshots + Action Pack persistence

-- ============================================================
-- 1) growth_score_snapshots — daily/run-keyed score history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.growth_score_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  audit_run_id uuid REFERENCES public.growth_audit_runs(id) ON DELETE SET NULL,
  growth_score smallint,
  category_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ops_gate text,
  opportunity_dollars_monthly numeric,
  data_confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings_open_count smallint NOT NULL DEFAULT 0,
  findings_critical_count smallint NOT NULL DEFAULT 0,
  findings_high_count smallint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'audit_run',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_score_snapshots_unique UNIQUE (venue_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_gss_venue_date ON public.growth_score_snapshots (venue_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_gss_run ON public.growth_score_snapshots (audit_run_id);

ALTER TABLE public.growth_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage score snapshots" ON public.growth_score_snapshots
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Venue members read score snapshots" ON public.growth_score_snapshots
  FOR SELECT TO authenticated USING (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members insert score snapshots" ON public.growth_score_snapshots
  FOR INSERT TO authenticated WITH CHECK (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members update score snapshots" ON public.growth_score_snapshots
  FOR UPDATE TO authenticated USING (venue_id = ANY (user_venue_ids())) WITH CHECK (venue_id = ANY (user_venue_ids()));

-- ============================================================
-- 2) growth_action_packs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.growth_action_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  context_kind text NOT NULL CHECK (context_kind IN ('finding','campaign','ad_hoc')),
  finding_id text,
  campaign_id text,
  ad_hoc_brief text,
  ad_hoc_category text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  engine_model text,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','mock')),
  brand_voice text NOT NULL DEFAULT 'casual_professional_default',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gap_venue_generated ON public.growth_action_packs (venue_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gap_venue_finding ON public.growth_action_packs (venue_id, finding_id);

ALTER TABLE public.growth_action_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage action packs" ON public.growth_action_packs
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Venue members read action packs" ON public.growth_action_packs
  FOR SELECT TO authenticated USING (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members insert action packs" ON public.growth_action_packs
  FOR INSERT TO authenticated WITH CHECK (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members update action packs" ON public.growth_action_packs
  FOR UPDATE TO authenticated USING (venue_id = ANY (user_venue_ids())) WITH CHECK (venue_id = ANY (user_venue_ids()));

-- ============================================================
-- 3) growth_action_pack_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.growth_action_pack_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id uuid NOT NULL REFERENCES public.growth_action_packs(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  finding_id text NOT NULL,
  finding_type text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant smallint,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','In Use','Launched','Archived')),
  approval text NOT NULL DEFAULT 'Proposed' CHECK (approval IN ('Proposed','Approved','Rejected')),
  approval_assignee_id text,
  approval_due_date date,
  approval_notes text,
  regeneration_count smallint NOT NULL DEFAULT 0,
  linked_campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  edited_by uuid
);
CREATE INDEX IF NOT EXISTS idx_gapa_venue_status ON public.growth_action_pack_assets (venue_id, status);
CREATE INDEX IF NOT EXISTS idx_gapa_pack ON public.growth_action_pack_assets (pack_id);
CREATE INDEX IF NOT EXISTS idx_gapa_venue_finding ON public.growth_action_pack_assets (venue_id, finding_id);

ALTER TABLE public.growth_action_pack_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage action pack assets" ON public.growth_action_pack_assets
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Venue members read action pack assets" ON public.growth_action_pack_assets
  FOR SELECT TO authenticated USING (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members insert action pack assets" ON public.growth_action_pack_assets
  FOR INSERT TO authenticated WITH CHECK (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members update action pack assets" ON public.growth_action_pack_assets
  FOR UPDATE TO authenticated USING (venue_id = ANY (user_venue_ids())) WITH CHECK (venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members delete action pack assets" ON public.growth_action_pack_assets
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============================================================
-- 4) growth_action_pack_audit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.growth_action_pack_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id uuid REFERENCES public.growth_action_packs(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.growth_action_pack_assets(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  event text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  actor_user_id uuid,
  actor_service text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gapa_audit_pack ON public.growth_action_pack_audit (pack_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gapa_audit_asset ON public.growth_action_pack_audit (asset_id, created_at DESC);

ALTER TABLE public.growth_action_pack_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read action pack audit" ON public.growth_action_pack_audit
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR venue_id = ANY (user_venue_ids()));
CREATE POLICY "Venue members insert audit" ON public.growth_action_pack_audit
  FOR INSERT TO authenticated WITH CHECK (venue_id = ANY (user_venue_ids()) OR has_role(auth.uid(),'admin'));

-- ============================================================
-- updated_at trigger for action packs
-- ============================================================
CREATE TRIGGER trg_growth_action_packs_updated
  BEFORE UPDATE ON public.growth_action_packs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Backfill: one snapshot per existing audit run from summary jsonb
-- ============================================================
INSERT INTO public.growth_score_snapshots (
  venue_id, snapshot_date, audit_run_id, growth_score, category_scores,
  ops_gate, opportunity_dollars_monthly, data_confidence,
  findings_open_count, findings_critical_count, findings_high_count, source
)
SELECT
  r.venue_id,
  (r.triggered_at AT TIME ZONE 'America/Los_Angeles')::date AS snapshot_date,
  r.id,
  NULLIF((r.summary->>'growth_score'),'')::smallint,
  COALESCE(r.summary->'category_scores','{}'::jsonb),
  r.summary->>'ops_gate',
  NULLIF((r.summary->>'opportunity_dollars_monthly'),'')::numeric,
  COALESCE(r.summary->'data_confidence','{}'::jsonb),
  COALESCE(NULLIF(r.summary->>'findings_open_count','')::smallint, 0),
  COALESCE(NULLIF(r.summary->>'findings_critical_count','')::smallint, 0),
  COALESCE(NULLIF(r.summary->>'findings_high_count','')::smallint, 0),
  'audit_run_backfill'
FROM public.growth_audit_runs r
WHERE r.status IN ('success','partial')
ON CONFLICT (venue_id, snapshot_date) DO NOTHING;

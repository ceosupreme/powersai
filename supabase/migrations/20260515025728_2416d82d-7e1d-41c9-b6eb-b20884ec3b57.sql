
-- 1. Coordinates on venues (nullable; admin fills in)
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);

-- 2. Keywords
CREATE TABLE IF NOT EXISTS public.map_pack_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS map_pack_keywords_venue_keyword_uq
  ON public.map_pack_keywords (venue_id, lower(keyword));
CREATE INDEX IF NOT EXISTS map_pack_keywords_venue_idx
  ON public.map_pack_keywords (venue_id, is_active);

CREATE TRIGGER map_pack_keywords_updated_at
  BEFORE UPDATE ON public.map_pack_keywords
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.map_pack_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue users read keywords" ON public.map_pack_keywords
  FOR SELECT USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage keywords" ON public.map_pack_keywords
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Snapshots
CREATE TABLE IF NOT EXISTS public.map_pack_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES public.map_pack_keywords(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rank INTEGER,
  in_map_pack BOOLEAN GENERATED ALWAYS AS (rank IS NOT NULL AND rank BETWEEN 1 AND 3) STORED,
  total_results INTEGER NOT NULL DEFAULT 0,
  query_lat NUMERIC(9,6),
  query_lng NUMERIC(9,6),
  top_competitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  query_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_pack_snapshots_venue_keyword_time_idx
  ON public.map_pack_snapshots (venue_id, keyword_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS map_pack_snapshots_venue_time_idx
  ON public.map_pack_snapshots (venue_id, checked_at DESC);

ALTER TABLE public.map_pack_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue users read snapshots" ON public.map_pack_snapshots
  FOR SELECT USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage snapshots" ON public.map_pack_snapshots
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Run log
CREATE TABLE IF NOT EXISTS public.map_pack_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  venues_processed INTEGER NOT NULL DEFAULT 0,
  keywords_queried INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_source TEXT NOT NULL DEFAULT 'cron'
);

ALTER TABLE public.map_pack_run_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read run log" ON public.map_pack_run_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write run log" ON public.map_pack_run_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Trigger log (per-venue rate limiting)
CREATE TABLE IF NOT EXISTS public.map_pack_trigger_log (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by UUID
);

ALTER TABLE public.map_pack_trigger_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venue users read trigger log" ON public.map_pack_trigger_log
  FOR SELECT USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage trigger log" ON public.map_pack_trigger_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- AI Search Visibility tracker tables

CREATE TABLE public.ai_search_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  source_keyword_id UUID REFERENCES public.map_pack_keywords(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  consecutive_failures INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_search_queries_venue ON public.ai_search_queries(venue_id) WHERE is_active;

CREATE TABLE public.ai_search_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  query_id UUID REFERENCES public.ai_search_queries(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('chatgpt','claude','gemini','perplexity')),
  model TEXT,
  mentioned BOOLEAN,
  position INT,
  top_competitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_excerpt TEXT,
  detection_method TEXT, -- 'heuristic' | 'ai_verified' | 'verification_skipped'
  query_error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_search_snapshots_venue_query ON public.ai_search_snapshots(venue_id, query_id, checked_at DESC);
CREATE INDEX idx_ai_search_snapshots_engine ON public.ai_search_snapshots(venue_id, engine, checked_at DESC);

CREATE TABLE public.ai_search_run_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  venues_processed INT NOT NULL DEFAULT 0,
  queries_tested INT NOT NULL DEFAULT 0,
  mentions_found INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.ai_search_trigger_log (
  venue_id UUID NOT NULL PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_by UUID
);

-- updated_at trigger
CREATE TRIGGER trg_ai_search_queries_updated
  BEFORE UPDATE ON public.ai_search_queries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.ai_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_search_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_search_run_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_search_trigger_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ai_search_queries" ON public.ai_search_queries
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "venue members read ai_search_queries" ON public.ai_search_queries
  FOR SELECT USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage ai_search_snapshots" ON public.ai_search_snapshots
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "venue members read ai_search_snapshots" ON public.ai_search_snapshots
  FOR SELECT USING (venue_id = ANY (public.user_venue_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read ai_search_run_log" ON public.ai_search_run_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read ai_search_trigger_log" ON public.ai_search_trigger_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Schedule weekly cron: Mondays 09:30 UTC
SELECT cron.schedule(
  'ai-search-cron-weekly',
  '30 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://xkyehjmuhgxxdrvlyhcg.supabase.co/functions/v1/ai-search-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreWVoam11aGd4eGRydmx5aGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTM3NDgsImV4cCI6MjA4NjM4OTc0OH0.XTAAJJva0C4IzV7lyQBVSHexmkaBHdhBQ_mU_DhcL8M"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

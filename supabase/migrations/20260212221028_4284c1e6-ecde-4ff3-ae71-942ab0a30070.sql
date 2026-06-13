
-- 1. review_snapshots
CREATE TABLE public.review_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  google_rating DECIMAL(3,2),
  google_review_count INTEGER,
  yelp_rating DECIMAL(3,2),
  yelp_review_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bar_id, snapshot_date)
);

ALTER TABLE public.review_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select review_snapshots" ON public.review_snapshots
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), (bar_id)::text));

CREATE POLICY "Insert review_snapshots admin" ON public.review_snapshots
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Update review_snapshots admin" ON public.review_snapshots
  FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete review_snapshots admin" ON public.review_snapshots
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_review_snapshots_bar_id ON public.review_snapshots(bar_id);

-- 2. sync_runs
CREATE TABLE public.sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select sync_runs" ON public.sync_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), (bar_id)::text));

CREATE POLICY "Insert sync_runs admin" ON public.sync_runs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Update sync_runs admin" ON public.sync_runs
  FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete sync_runs admin" ON public.sync_runs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sync_runs_bar_id ON public.sync_runs(bar_id);
CREATE INDEX idx_sync_runs_bar_sync_type ON public.sync_runs(bar_id, sync_type);

-- 3. asana_sync_cursor
CREATE TABLE public.asana_sync_cursor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  task_gid TEXT,
  last_comment_gid TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bar_id, log_type)
);

ALTER TABLE public.asana_sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select asana_sync_cursor" ON public.asana_sync_cursor
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR user_has_bar_access(auth.uid(), (bar_id)::text));

CREATE POLICY "Insert asana_sync_cursor admin" ON public.asana_sync_cursor
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Update asana_sync_cursor admin" ON public.asana_sync_cursor
  FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete asana_sync_cursor admin" ON public.asana_sync_cursor
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_asana_sync_cursor_bar_id ON public.asana_sync_cursor(bar_id);

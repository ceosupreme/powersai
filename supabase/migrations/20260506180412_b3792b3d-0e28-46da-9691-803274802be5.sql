CREATE TABLE public.suppressed_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bar_id TEXT,
  venue_id UUID,
  source_metric TEXT NOT NULL,
  current_value NUMERIC,
  trailing_mean NUMERIC,
  trailing_sd NUMERIC,
  trailing_n INTEGER,
  threshold_used TEXT,
  suspected_reason TEXT NOT NULL DEFAULT 'data_integrity_suspected',
  would_have_fired_for_date DATE,
  original_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppressed_insights_venue_date ON public.suppressed_insights (venue_id, created_at DESC);
CREATE INDEX idx_suppressed_insights_metric ON public.suppressed_insights (source_metric, created_at DESC);

ALTER TABLE public.suppressed_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suppressed insights"
ON public.suppressed_insights
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert suppressed insights"
ON public.suppressed_insights
FOR INSERT
WITH CHECK (true);

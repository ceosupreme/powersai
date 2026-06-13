-- Review theme extraction storage
CREATE TABLE public.review_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.google_reviews(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  theme_label text NOT NULL,
  theme_category text NOT NULL,
  theme_sentiment text NOT NULL CHECK (theme_sentiment IN ('positive','negative','neutral')),
  context text,
  excerpt text,
  confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, theme_label)
);
CREATE INDEX idx_review_themes_venue_label ON public.review_themes (venue_id, theme_label);
CREATE INDEX idx_review_themes_venue_created ON public.review_themes (venue_id, created_at DESC);
CREATE INDEX idx_review_themes_sentiment ON public.review_themes (venue_id, theme_sentiment);

ALTER TABLE public.review_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage review_themes"
  ON public.review_themes FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users read review_themes"
  ON public.review_themes FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));

-- Per-review processing audit
CREATE TABLE public.review_extraction_runs (
  review_id uuid PRIMARY KEY REFERENCES public.google_reviews(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  model text,
  ok boolean NOT NULL DEFAULT true,
  error text
);
CREATE INDEX idx_review_extraction_runs_venue_processed
  ON public.review_extraction_runs (venue_id, processed_at DESC);

ALTER TABLE public.review_extraction_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage review_extraction_runs"
  ON public.review_extraction_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue users read review_extraction_runs"
  ON public.review_extraction_runs FOR SELECT
  USING (venue_id = ANY(user_venue_ids()));
CREATE TABLE public.google_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  author_name text,
  rating integer NOT NULL,
  review_text text,
  publish_time timestamptz,
  review_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bar_id, review_hash)
);
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read google_reviews"
  ON public.google_reviews FOR SELECT TO authenticated USING (true);

ALTER TABLE public.review_snapshots
  ADD COLUMN IF NOT EXISTS rating_change numeric(3,2) DEFAULT NULL;
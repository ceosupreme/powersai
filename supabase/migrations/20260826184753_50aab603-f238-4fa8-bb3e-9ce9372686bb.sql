CREATE TABLE public.vertical_landing_families (
  family_key text PRIMARY KEY,
  display_name text NOT NULL,
  tour_features jsonb,
  included_features jsonb,
  how_it_works jsonb,
  live_in_line text,
  proof_line text,
  faq_base jsonb,
  guarantee_line text,
  math_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vertical_landing_families TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vertical_landing_families TO authenticated;
GRANT ALL ON public.vertical_landing_families TO service_role;

ALTER TABLE public.vertical_landing_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read landing families"
  ON public.vertical_landing_families FOR SELECT
  USING (true);

CREATE POLICY "Admins can write landing families"
  ON public.vertical_landing_families FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.vertical_landing_pages
  ADD COLUMN family_key text REFERENCES public.vertical_landing_families(family_key),
  ADD COLUMN video_url text,
  ADD COLUMN leaks_heading text,
  ADD COLUMN tour_features jsonb,
  ADD COLUMN included_features jsonb,
  ADD COLUMN how_it_works jsonb,
  ADD COLUMN live_in_line text,
  ADD COLUMN math_config jsonb,
  ADD COLUMN free_check_line text,
  ADD COLUMN price_block jsonb,
  ADD COLUMN guarantee_line text;
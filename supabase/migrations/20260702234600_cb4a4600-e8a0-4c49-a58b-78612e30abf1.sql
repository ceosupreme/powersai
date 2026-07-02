CREATE TABLE public.vertical_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order int NOT NULL DEFAULT 0,
  project_type_id text NULL REFERENCES public.project_types(id) ON DELETE SET NULL,
  headline text NOT NULL,
  headline_accent_word text NOT NULL,
  accent_color text NOT NULL DEFAULT 'rust' CHECK (accent_color IN ('rust','gold','green')),
  subline text NOT NULL,
  stat_value text NOT NULL,
  stat_label text NOT NULL,
  leaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  proof_line text NOT NULL,
  cta_primary_label text NOT NULL,
  cta_primary_url text NOT NULL,
  cta_secondary_label text NULL,
  cta_secondary_url text NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  og_image_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vertical_landing_pages TO anon, authenticated;
GRANT ALL ON public.vertical_landing_pages TO authenticated, service_role;

ALTER TABLE public.vertical_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published landers"
  ON public.vertical_landing_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can read all landers"
  ON public.vertical_landing_pages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write landers"
  ON public.vertical_landing_pages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vertical_landing_pages_updated_at
  BEFORE UPDATE ON public.vertical_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_vertical_landing_pages_status_sort
  ON public.vertical_landing_pages(status, sort_order);
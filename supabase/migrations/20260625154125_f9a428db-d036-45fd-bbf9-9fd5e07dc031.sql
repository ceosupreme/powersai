
CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  client_or_vertical text,
  category text NOT NULL DEFAULT 'Other',
  media_type text NOT NULL CHECK (media_type IN ('image','video','link','embed','case_study')),
  image_url text,
  video_url text,
  external_url text,
  thumbnail_url text,
  case_study_body text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_public_read_published"
  ON public.portfolio_items FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "portfolio_admin_insert"
  ON public.portfolio_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "portfolio_admin_update"
  ON public.portfolio_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "portfolio_admin_delete"
  ON public.portfolio_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX portfolio_items_status_sort_idx
  ON public.portfolio_items (status, sort_order);

-- Storage policies on existing brand-assets bucket for portfolio/ prefix
-- Admins can upload/modify; anyone can read (bucket is private; URLs will be signed).
CREATE POLICY "portfolio_media_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = 'portfolio'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "portfolio_media_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = 'portfolio'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "portfolio_media_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = 'portfolio'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "portfolio_media_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = 'portfolio'
  );


-- Helper: who can access a project today (admins). Built so contractor logins later require ONLY this function to change.
CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.venue_assignments WHERE user_id = auth.uid() AND venue_id = _project_id)
    OR EXISTS (SELECT 1 FROM public.user_venue_roles WHERE user_id = auth.uid() AND (venue_id = _project_id OR venue_id IS NULL))
$$;

-- Shared updated_at trigger fn already exists as public.handle_updated_at()

-- ============ brand_kits ============
CREATE TABLE public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
  brand_voice text,
  bio_short text,
  bio_long text,
  primary_font text,
  secondary_font text,
  do_notes text,
  dont_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kits_select" ON public.brand_kits FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE POLICY "brand_kits_insert" ON public.brand_kits FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_project(project_id) AND created_by = auth.uid());
CREATE POLICY "brand_kits_update" ON public.brand_kits FOR UPDATE TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE POLICY "brand_kits_delete" ON public.brand_kits FOR DELETE TO authenticated
  USING (public.user_can_access_project(project_id));
CREATE TRIGGER brand_kits_updated_at BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Reusable child-table policy generator via function
CREATE OR REPLACE FUNCTION public.user_can_access_kit(_kit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_kits k
    WHERE k.id = _kit_id AND public.user_can_access_project(k.project_id)
  )
$$;

-- ============ brand_kit_colors ============
CREATE TABLE public.brand_kit_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  label text,
  hex text NOT NULL,
  role text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Validate hex via trigger (avoid CHECK with regex edge cases; keep flexible)
CREATE OR REPLACE FUNCTION public.validate_brand_color_hex()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.hex !~* '^#?[0-9a-f]{6}([0-9a-f]{2})?$' THEN
    RAISE EXCEPTION 'Invalid hex color: %', NEW.hex;
  END IF;
  IF left(NEW.hex,1) <> '#' THEN NEW.hex := '#' || NEW.hex; END IF;
  NEW.hex := lower(NEW.hex);
  RETURN NEW;
END $$;
CREATE TRIGGER brand_kit_colors_validate BEFORE INSERT OR UPDATE ON public.brand_kit_colors
  FOR EACH ROW EXECUTE FUNCTION public.validate_brand_color_hex();
CREATE TRIGGER brand_kit_colors_updated_at BEFORE UPDATE ON public.brand_kit_colors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit_colors TO authenticated;
GRANT ALL ON public.brand_kit_colors TO service_role;
ALTER TABLE public.brand_kit_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_colors_all" ON public.brand_kit_colors FOR ALL TO authenticated
  USING (public.user_can_access_kit(kit_id))
  WITH CHECK (public.user_can_access_kit(kit_id));

-- ============ brand_kit_taglines ============
CREATE TABLE public.brand_kit_taglines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  text text NOT NULL,
  context text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER brand_kit_taglines_updated_at BEFORE UPDATE ON public.brand_kit_taglines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit_taglines TO authenticated;
GRANT ALL ON public.brand_kit_taglines TO service_role;
ALTER TABLE public.brand_kit_taglines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_taglines_all" ON public.brand_kit_taglines FOR ALL TO authenticated
  USING (public.user_can_access_kit(kit_id))
  WITH CHECK (public.user_can_access_kit(kit_id));

-- ============ brand_kit_hashtags ============
CREATE TABLE public.brand_kit_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  tag text NOT NULL,
  group_label text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.normalize_brand_hashtag()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tag := lower(regexp_replace(NEW.tag, '^#+', ''));
  IF NEW.tag = '' THEN RAISE EXCEPTION 'Hashtag cannot be empty'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER brand_kit_hashtags_normalize BEFORE INSERT OR UPDATE ON public.brand_kit_hashtags
  FOR EACH ROW EXECUTE FUNCTION public.normalize_brand_hashtag();
CREATE TRIGGER brand_kit_hashtags_updated_at BEFORE UPDATE ON public.brand_kit_hashtags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit_hashtags TO authenticated;
GRANT ALL ON public.brand_kit_hashtags TO service_role;
ALTER TABLE public.brand_kit_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_hashtags_all" ON public.brand_kit_hashtags FOR ALL TO authenticated
  USING (public.user_can_access_kit(kit_id))
  WITH CHECK (public.user_can_access_kit(kit_id));

-- ============ brand_kit_links ============
CREATE TABLE public.brand_kit_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  label text,
  url text NOT NULL,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER brand_kit_links_updated_at BEFORE UPDATE ON public.brand_kit_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit_links TO authenticated;
GRANT ALL ON public.brand_kit_links TO service_role;
ALTER TABLE public.brand_kit_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_links_all" ON public.brand_kit_links FOR ALL TO authenticated
  USING (public.user_can_access_kit(kit_id))
  WITH CHECK (public.user_can_access_kit(kit_id));

-- ============ brand_kit_assets ============
CREATE TABLE public.brand_kit_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  asset_type text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER brand_kit_assets_updated_at BEFORE UPDATE ON public.brand_kit_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kit_assets TO authenticated;
GRANT ALL ON public.brand_kit_assets TO service_role;
ALTER TABLE public.brand_kit_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_kit_assets_select" ON public.brand_kit_assets FOR SELECT TO authenticated
  USING (public.user_can_access_kit(kit_id));
CREATE POLICY "brand_kit_assets_insert" ON public.brand_kit_assets FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_kit(kit_id) AND uploaded_by = auth.uid());
CREATE POLICY "brand_kit_assets_update" ON public.brand_kit_assets FOR UPDATE TO authenticated
  USING (public.user_can_access_kit(kit_id))
  WITH CHECK (public.user_can_access_kit(kit_id));
CREATE POLICY "brand_kit_assets_delete" ON public.brand_kit_assets FOR DELETE TO authenticated
  USING (public.user_can_access_kit(kit_id));

CREATE INDEX brand_kit_colors_kit_idx ON public.brand_kit_colors(kit_id, sort_order);
CREATE INDEX brand_kit_taglines_kit_idx ON public.brand_kit_taglines(kit_id, sort_order);
CREATE INDEX brand_kit_hashtags_kit_idx ON public.brand_kit_hashtags(kit_id, sort_order);
CREATE INDEX brand_kit_links_kit_idx ON public.brand_kit_links(kit_id, sort_order);
CREATE INDEX brand_kit_assets_kit_idx ON public.brand_kit_assets(kit_id, uploaded_at DESC);

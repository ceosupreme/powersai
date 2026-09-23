-- 1. Content sources
CREATE TABLE public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'other' CHECK (source_type IN ('article','book_chapter','video','podcast','post','notes','other')),
  url TEXT,
  summary TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  parent_source_id UUID REFERENCES public.content_sources(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_sources TO authenticated;
GRANT ALL ON public.content_sources TO service_role;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content sources" ON public.content_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_content_sources_project ON public.content_sources(project_id);
CREATE TRIGGER trg_content_sources_updated_at BEFORE UPDATE ON public.content_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Content families
CREATE TABLE public.content_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.content_sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','producing','ready','placed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_families TO authenticated;
GRANT ALL ON public.content_families TO service_role;
ALTER TABLE public.content_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content families" ON public.content_families
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_content_families_project ON public.content_families(project_id);
CREATE INDEX idx_content_families_source ON public.content_families(source_id);
CREATE TRIGGER trg_content_families_updated_at BEFORE UPDATE ON public.content_families
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Extend content_items (additive only)
ALTER TABLE public.content_items
  ADD COLUMN family_id UUID REFERENCES public.content_families(id) ON DELETE SET NULL,
  ADD COLUMN purpose TEXT,
  ADD COLUMN recipe_version TEXT,
  ADD COLUMN approved_version INTEGER,
  ADD COLUMN founder_minutes INTEGER;
CREATE INDEX idx_content_items_family ON public.content_items(family_id);

-- 4. Content placements
CREATE TABLE public.content_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'other' CHECK (channel IN ('instagram','facebook','pinterest','tiktok','youtube','blog','email','x','linkedin','other')),
  account_label TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','accepted_schedule','scheduled','published','failed','withdrawn','needs_review')),
  scheduled_for TIMESTAMPTZ,
  live_url TEXT,
  platform_post_id TEXT,
  verified_at TIMESTAMPTZ,
  receipt JSONB,
  failure_reason TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_placements_published_needs_receipt
    CHECK (status <> 'published' OR (live_url IS NOT NULL AND verified_at IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_placements TO authenticated;
GRANT ALL ON public.content_placements TO service_role;
ALTER TABLE public.content_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content placements" ON public.content_placements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_content_placements_item ON public.content_placements(content_item_id);
CREATE INDEX idx_content_placements_project ON public.content_placements(project_id);
CREATE TRIGGER trg_content_placements_updated_at BEFORE UPDATE ON public.content_placements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Asset library extensions
ALTER TABLE public.brand_kit_assets
  ADD COLUMN source_id UUID REFERENCES public.content_sources(id) ON DELETE SET NULL,
  ADD COLUMN original_width INTEGER,
  ADD COLUMN original_height INTEGER,
  ADD COLUMN duration_seconds NUMERIC,
  ADD COLUMN content_hash TEXT,
  ADD COLUMN description TEXT,
  ADD COLUMN tags TEXT[],
  ADD COLUMN transcript TEXT,
  ADD COLUMN focal_region JSONB,
  ADD COLUMN provenance TEXT CHECK (provenance IS NULL OR provenance IN ('camera_original','owner_upload','ai_generated','licensed','screenshot')),
  ADD COLUMN permitted_project_ids UUID[],
  ADD COLUMN permitted_uses TEXT[],
  ADD COLUMN variants JSONB,
  ADD COLUMN generation_details JSONB,
  ADD COLUMN usage_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN is_clean_master BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN search_tsv tsvector;
CREATE UNIQUE INDEX idx_brand_kit_assets_content_hash
  ON public.brand_kit_assets(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_brand_kit_assets_search ON public.brand_kit_assets USING GIN (search_tsv);
CREATE INDEX idx_brand_kit_assets_source ON public.brand_kit_assets(source_id);

CREATE OR REPLACE FUNCTION public.brand_kit_assets_search_tsv()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(NEW.transcript, '')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_brand_kit_assets_search_tsv
  BEFORE INSERT OR UPDATE ON public.brand_kit_assets
  FOR EACH ROW EXECUTE FUNCTION public.brand_kit_assets_search_tsv();

-- 6. Content mode on brand kits
ALTER TABLE public.brand_kits
  ADD COLUMN content_mode TEXT NOT NULL DEFAULT 'baseline'
  CHECK (content_mode IN ('growth','baseline','parked'));

-- 7. Ownership on brand projects
ALTER TABLE public.venues
  ADD COLUMN ownership TEXT NOT NULL DEFAULT 'owned'
  CHECK (ownership IN ('owned','client','family','partner'));

-- 8. Correction trace
CREATE OR REPLACE FUNCTION public.trace_content_source(_source_id uuid)
RETURNS TABLE (
  entity_kind text,
  entity_id uuid,
  entity_label text,
  entity_status text,
  parent_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'family'::text, f.id, f.title, f.status, f.source_id
  FROM public.content_families f WHERE f.source_id = _source_id
  UNION ALL
  SELECT 'content_item'::text, ci.id, ci.title, ci.stage, ci.family_id
  FROM public.content_items ci
  JOIN public.content_families f2 ON f2.id = ci.family_id
  WHERE f2.source_id = _source_id
  UNION ALL
  SELECT 'placement'::text, p.id, coalesce(p.channel || ' - ' || coalesce(p.account_label,''), p.channel), p.status, p.content_item_id
  FROM public.content_placements p
  JOIN public.content_items ci2 ON ci2.id = p.content_item_id
  JOIN public.content_families f3 ON f3.id = ci2.family_id
  WHERE f3.source_id = _source_id
  UNION ALL
  SELECT 'asset'::text, a.id, a.file_name, a.asset_type, a.source_id
  FROM public.brand_kit_assets a WHERE a.source_id = _source_id
$$;
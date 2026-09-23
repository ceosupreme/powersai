ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS idea_score INTEGER CHECK (idea_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS idea_evidence JSONB,
  ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS quality_fails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_notes TEXT,
  ADD COLUMN IF NOT EXISTS brief JSONB,
  ADD COLUMN IF NOT EXISTS purpose_type TEXT CHECK (purpose_type IN ('teach','entertain','story','community','proof','offer')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID;

CREATE OR REPLACE FUNCTION public.enforce_content_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _type text;
BEGIN
  SELECT coalesce(project_type,'client') INTO _type FROM public.venues WHERE id = NEW.project_id;
  IF coalesce(_type,'client') = 'client' THEN RETURN NEW; END IF;

  IF NEW.approved_at IS NOT NULL AND (
       TG_OP = 'INSERT'
       OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
       OR OLD.quality_score IS DISTINCT FROM NEW.quality_score
       OR OLD.quality_fails IS DISTINCT FROM NEW.quality_fails) THEN
    IF coalesce(NEW.quality_score,0) < 80 OR coalesce(array_length(NEW.quality_fails,1),0) > 0 THEN
      RAISE EXCEPTION 'Cannot approve: needs a quality score of 80 or more and no hard fails';
    END IF;
  END IF;

  IF NEW.stage IN ('scheduled','published') AND NEW.approved_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    RAISE EXCEPTION 'Cannot move to % until the item is approved', NEW.stage;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_content_approval ON public.content_items;
CREATE TRIGGER trg_enforce_content_approval BEFORE INSERT OR UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_approval();

CREATE TABLE public.audience_pains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  pain_text TEXT NOT NULL,
  pillar TEXT,
  source_links TEXT[] NOT NULL DEFAULT '{}',
  source_count INTEGER NOT NULL DEFAULT 0,
  first_seen DATE,
  last_seen DATE,
  intensity INTEGER CHECK (intensity BETWEEN 0 AND 5),
  intensity_reasons TEXT[] NOT NULL DEFAULT '{}' CHECK (intensity_reasons <@ ARRAY['money','safety','time','embarrassment','frustration']::text[]),
  search_presence INTEGER CHECK (search_presence BETWEEN 0 AND 5),
  gap INTEGER CHECK (gap BETWEEN 0 AND 5),
  pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 25),
  status TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('unanswered','answered','refresh_due')),
  answered_by UUID[] NOT NULL DEFAULT '{}',
  product_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audience_pains TO authenticated;
GRANT ALL ON public.audience_pains TO service_role;
ALTER TABLE public.audience_pains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage audience pains" ON public.audience_pains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_audience_pains_project ON public.audience_pains(project_id, pain_score DESC);
CREATE TRIGGER trg_audience_pains_updated_at BEFORE UPDATE ON public.audience_pains
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS content_pillars TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mix_targets JSONB;
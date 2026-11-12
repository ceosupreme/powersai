-- Muse first-login UX audit: a high concept quality score cannot certify
-- unfinished printables, videos or title-only drafts as release-ready.
-- Applies to NEW final approvals and NEW moves to scheduled/published for
-- internal brands only. Historical approved concepts and published posts remain.
-- Restore: DROP TRIGGER trg_hq_content_delivery ON public.content_items;
--          DROP FUNCTION public.hq_guard_content_delivery();
BEGIN;

CREATE OR REPLACE FUNCTION public.hq_guard_content_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $body$
DECLARE
  _project_type text;
  _is_final_transition boolean := false;
  _fmt text;
  _assets jsonb := '[]'::jsonb;
  _has_production_file boolean := false;
  _has_written_content boolean := false;
  _ready_stage boolean := false;
  _cta text;
BEGIN
  IF (NEW.approved_at IS NOT NULL
      AND (TG_OP='INSERT' OR NEW.approved_at IS DISTINCT FROM OLD.approved_at))
     OR (NEW.stage IN ('scheduled', 'published')
         AND (TG_OP='INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage)) THEN
    _is_final_transition := true;
  END IF;
  IF NOT _is_final_transition THEN RETURN NEW; END IF;

  SELECT COALESCE(project_type, 'client') INTO _project_type
    FROM public.venues WHERE id=NEW.project_id;
  IF COALESCE(_project_type,'client')='client' THEN RETURN NEW; END IF;

  _fmt := COALESCE(NEW.format, 'short');
  IF _fmt IN ('article','email','community') THEN
    _ready_stage := NEW.stage IN ('script','scheduled','published');
    _has_written_content := length(btrim(COALESCE(
      NULLIF(NEW.brief->>'script',''),
      NULLIF(NEW.brief->>'body',''),
      NULLIF(NEW.brief->>'text',''),
      NULLIF(NEW.brief->>'content',''),
      NULLIF(NEW.brief->>'full_text',''),
      CASE WHEN _fmt='community' THEN NULLIF(NEW.brief->>'caption','') END,
      ''))) > 0;
    IF NOT _has_written_content THEN
      RAISE EXCEPTION 'Finish and save the written content before approving or publishing.';
    END IF;
  ELSE
    _ready_stage := CASE
      WHEN _fmt IN ('carousel','pin','post','story','printable')
        THEN NEW.stage IN ('design','scheduled','published')
      ELSE NEW.stage IN ('thumbnail','scheduled','published')
    END;
    IF jsonb_typeof(NEW.brief->'asset_urls')='array' THEN
      _assets := NEW.brief->'asset_urls';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(_assets) AS media(url)
      WHERE media.url ~* '^https?://'
    ) INTO _has_production_file;
    IF NOT _has_production_file THEN
      RAISE EXCEPTION 'Attach the finished production file before approving or publishing. Preview images and quality scores alone are not enough.';
    END IF;
  END IF;

  IF NOT _ready_stage THEN
    RAISE EXCEPTION 'Finish the production steps before final approval or publication.';
  END IF;

  _cta := COALESCE(NULLIF(btrim(NEW.cta),''),
     NULLIF(btrim(NEW.brief->>'cta'),''), '');
  IF NEW.purpose_type='offer' AND _cta='' THEN
    RAISE EXCEPTION 'Add the offer call to action before final approval or publication.';
  ELSIF _fmt IN ('reel','short','carousel','post','story','pin')
      AND _cta=''
      AND COALESCE(NEW.brief->>'cta_not_needed','false') <> 'true' THEN
    RAISE EXCEPTION 'Add a call to action or explicitly confirm that one is not needed before final approval or publication.';
  END IF;

  RETURN NEW;
END
$body$;

DROP TRIGGER IF EXISTS trg_hq_content_delivery ON public.content_items;
CREATE TRIGGER trg_hq_content_delivery
BEFORE INSERT OR UPDATE OF approved_at, stage
ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.hq_guard_content_delivery();

COMMIT;

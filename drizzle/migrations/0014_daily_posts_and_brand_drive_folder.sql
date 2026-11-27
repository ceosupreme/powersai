-- 1. Allow 'daily_post' in content_items.purpose_type
ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_purpose_type_check;
ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_purpose_type_check
  CHECK (purpose_type = ANY (ARRAY['teach'::text, 'entertain'::text, 'story'::text, 'community'::text, 'proof'::text, 'offer'::text, 'daily_post'::text]));

-- One daily post package per brand per post date
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_items_daily_post_unique
  ON public.content_items (project_id, due_date)
  WHERE purpose_type = 'daily_post' AND due_date IS NOT NULL;

-- 2. Allow 'google' channel and 'planned' status in content_placements
ALTER TABLE public.content_placements DROP CONSTRAINT IF EXISTS content_placements_channel_check;
ALTER TABLE public.content_placements
  ADD CONSTRAINT content_placements_channel_check
  CHECK (channel = ANY (ARRAY['instagram'::text, 'facebook'::text, 'pinterest'::text, 'tiktok'::text, 'youtube'::text, 'blog'::text, 'email'::text, 'x'::text, 'linkedin'::text, 'google'::text, 'other'::text]));

ALTER TABLE public.content_placements DROP CONSTRAINT IF EXISTS content_placements_status_check;
ALTER TABLE public.content_placements
  ADD CONSTRAINT content_placements_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'planned'::text, 'accepted_schedule'::text, 'scheduled'::text, 'published'::text, 'failed'::text, 'withdrawn'::text, 'needs_review'::text]));

-- 3. Exempt daily_post from per-post approval and delivery guards (Nov 22 owner rule)
CREATE OR REPLACE FUNCTION public.enforce_content_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _type text;
BEGIN
  IF NEW.purpose_type = 'daily_post' THEN RETURN NEW; END IF;
  SELECT coalesce(project_type,'client') INTO _type FROM public.venues WHERE id = NEW.project_id;
  IF coalesce(_type,'client') = 'client' THEN RETURN NEW; END IF;

  IF NEW.stage IN ('scheduled','published') AND NEW.approved_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    RAISE EXCEPTION 'Cannot move to % until the item is approved', NEW.stage;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.hq_guard_content_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  IF NEW.purpose_type = 'daily_post' THEN RETURN NEW; END IF;

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
    RAISE EXCEPTION 'Add a call to action or confirm it is intentionally not needed before final approval or publication.';
  END IF;

  RETURN NEW;
END
$function$;

-- 4. Allow brand-assigned helpers to view content placements for their brands
DROP POLICY IF EXISTS "Brand team can view content placements" ON public.content_placements;
CREATE POLICY "Brand team can view content placements"
  ON public.content_placements
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_project(project_id));

-- 5. Mark posted RPC for daily posts (admins and brand-assigned helpers)
CREATE OR REPLACE FUNCTION public.hq_mark_daily_post_posted(
  _placement_id uuid,
  _live_url text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pl public.content_placements%ROWTYPE;
  _ci public.content_items%ROWTYPE;
  _clean_url text := nullif(btrim(coalesce(_live_url, '')), '');
  _clean_note text := nullif(btrim(coalesce(_note, '')), '');
  _now timestamptz := now();
  _unposted_count int;
  _handoff_id_text text;
  _handoff_id uuid;
  _existing_pub jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  SELECT * INTO _pl FROM public.content_placements WHERE id = _placement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.user_can_access_project(_pl.project_id)) THEN
    RAISE EXCEPTION 'Not authorized for this brand';
  END IF;

  SELECT * INTO _ci FROM public.content_items WHERE id = _pl.content_item_id;
  IF NOT FOUND OR _ci.purpose_type IS DISTINCT FROM 'daily_post' THEN
    RAISE EXCEPTION 'Only daily post placements can use this action';
  END IF;

  IF _clean_url IS NOT NULL THEN
    IF _clean_url !~* '^https?://' THEN
      RAISE EXCEPTION 'Paste a full link starting with https://';
    END IF;

    UPDATE public.content_placements
       SET status = 'published',
           live_url = _clean_url,
           verified_at = _now,
           receipt = coalesce(receipt, '{}'::jsonb) || jsonb_build_object(
             'verified_by', 'person',
             'verified_by_user_id', auth.uid(),
             'verified_note', _clean_note
           )
     WHERE id = _placement_id;

    -- If every placement on this package is now published, mark the package posted
    SELECT count(*) INTO _unposted_count
      FROM public.content_placements
     WHERE content_item_id = _ci.id
       AND status <> 'published';

    IF _unposted_count = 0 THEN
      UPDATE public.content_items
         SET published_at = coalesce(published_at, _now),
             brief = jsonb_set(
               coalesce(brief, '{}'::jsonb),
               '{daily_post,post_status}',
               '"posted"'::jsonb,
               true
             )
       WHERE id = _ci.id;
    END IF;

    -- Sync linked Agent Desk social_post row if present
    _handoff_id_text := nullif(btrim(coalesce(_ci.brief->'daily_post'->>'handoff_id', '')), '');
    IF _handoff_id_text IS NOT NULL AND _handoff_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      _handoff_id := _handoff_id_text::uuid;
      SELECT coalesce(result->'published', '[]'::jsonb) INTO _existing_pub
        FROM public.agent_handoffs WHERE id = _handoff_id;
      IF FOUND THEN
        IF jsonb_typeof(_existing_pub) <> 'array' THEN _existing_pub := '[]'::jsonb; END IF;
        UPDATE public.agent_handoffs
           SET result = coalesce(result, '{}'::jsonb) || jsonb_build_object(
             'published',
             _existing_pub || jsonb_build_array(jsonb_build_object(
               'platform', _pl.channel,
               'url', _clean_url,
               'marked_at', _now,
               'marked_by', auth.uid()
             ))
           )
         WHERE id = _handoff_id;
      END IF;
    END IF;

    RETURN jsonb_build_object('status', 'published', 'live_url', _clean_url, 'verified_at', _now, 'all_posted', (_unposted_count = 0));
  ELSE
    -- Posted without a live link yet: keep status scheduled with a note
    UPDATE public.content_placements
       SET status = CASE WHEN status = 'published' THEN status ELSE 'scheduled' END,
           receipt = coalesce(receipt, '{}'::jsonb) || jsonb_build_object(
             'posted_no_link_at', _now,
             'posted_no_link_by', auth.uid(),
             'posted_no_link_note', coalesce(_clean_note, 'Posted by hand — link not pasted yet')
           )
     WHERE id = _placement_id;

    RETURN jsonb_build_object('status', 'scheduled', 'no_link_noted', true);
  END IF;
END
$function$;

GRANT EXECUTE ON FUNCTION public.hq_mark_daily_post_posted(uuid, text, text) TO authenticated;

-- 6. Optional pinned Drive folder override on brand_kits
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS drive_folder_id text;

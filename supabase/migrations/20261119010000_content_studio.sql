-- Content Studio is a view of existing content, pipelines and the agent mailbox.
-- Templates describe repeatable production; they never authorize publication.

CREATE TABLE IF NOT EXISTS public.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,99}$'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text NOT NULL DEFAULT '',
  project_id uuid REFERENCES public.venues(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','validated','retired')),
  default_tier text NOT NULL DEFAULT 'guided' CHECK (default_tier IN ('guided','one_tap','automated')),
  recipe jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(recipe) = 'object'),
  validation_evidence jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(validation_evidence) = 'object'),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

-- The mailbox was introduced in the live HQ before its schema reached git.
-- This definition makes new installs reproducible without altering existing rows.
CREATE TABLE IF NOT EXISTS public.agent_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  from_agent text NOT NULL CHECK (from_agent IN ('claude','muse','chatgpt','owner')),
  to_agent text NOT NULL CHECK (to_agent IN ('claude','muse','chatgpt','owner')),
  kind text NOT NULL DEFAULT 'task' CHECK (kind IN ('task','standing_task','reply','question','report')),
  title text NOT NULL, venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  spec jsonb NOT NULL DEFAULT '{}', schedule text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','claimed','done','failed','needs_owner','cancelled','active')),
  claimed_at timestamptz, completed_at timestamptz, last_run_at timestamptz,
  result jsonb, result_links jsonb NOT NULL DEFAULT '[]', due_at timestamptz,
  parent_id uuid REFERENCES public.agent_handoffs(id) ON DELETE SET NULL,
  attempts integer NOT NULL DEFAULT 0, notes text,
  action_item_id uuid REFERENCES public.action_items(id) ON DELETE SET NULL,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  fallback_agent text CHECK (fallback_agent IN ('claude','muse','chatgpt','owner'))
);
ALTER TABLE public.agent_handoffs ADD COLUMN IF NOT EXISTS studio_claim_token uuid;
ALTER TABLE public.agent_handoffs ADD COLUMN IF NOT EXISTS studio_claimed_by text;
ALTER TABLE public.agent_handoffs ADD COLUMN IF NOT EXISTS studio_lease_expires_at timestamptz;
ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS agent_handoffs_studio_request_key
  ON public.agent_handoffs(content_item_id, (spec->>'request_key'))
  WHERE spec->>'source' = 'content_studio';

CREATE OR REPLACE FUNCTION public.hq_studio_can_access(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.user_can_access_page(auth.uid(),'content_pipeline')
    AND public.user_can_access_project(p_project_id);
$$;
-- Supabase may grant EXECUTE to API roles through default privileges. Revoke
-- those direct grants as well as PUBLIC before granting each intended surface.
REVOKE ALL ON FUNCTION public.hq_studio_can_access(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_can_access(uuid) TO authenticated, service_role;

ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_templates_read ON public.content_templates;
CREATE POLICY content_templates_read ON public.content_templates FOR SELECT TO authenticated
  USING (public.hq_studio_can_access(project_id) OR (project_id IS NULL AND auth.uid() IS NOT NULL
    AND public.user_can_access_page(auth.uid(),'content_pipeline')
    AND EXISTS (SELECT 1 FROM public.venues v WHERE public.user_can_access_project(v.id))));
DROP POLICY IF EXISTS content_templates_insert ON public.content_templates;
CREATE POLICY content_templates_insert ON public.content_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_can_access_page(auth.uid(),'content_pipeline')
    AND (public.has_role(auth.uid(),'admin') OR (project_id IS NOT NULL AND public.user_can_manage_project(project_id))));
DROP POLICY IF EXISTS content_templates_update ON public.content_templates;
CREATE POLICY content_templates_update ON public.content_templates FOR UPDATE TO authenticated
  USING (public.user_can_access_page(auth.uid(),'content_pipeline')
    AND (public.has_role(auth.uid(),'admin') OR (project_id IS NOT NULL AND public.user_can_manage_project(project_id))))
  WITH CHECK (public.user_can_access_page(auth.uid(),'content_pipeline')
    AND (public.has_role(auth.uid(),'admin') OR (project_id IS NOT NULL AND public.user_can_manage_project(project_id))));
GRANT SELECT, INSERT, UPDATE ON public.content_templates TO authenticated;
GRANT ALL ON public.content_templates, public.agent_handoffs TO service_role;

CREATE OR REPLACE FUNCTION public.hq_studio_guard_template()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Template authorship cannot be changed';
    END IF;
    IF OLD.status <> 'draft' AND
      (ROW(NEW.slug,NEW.version,NEW.title,NEW.description,NEW.project_id,NEW.default_tier,NEW.recipe)
        IS DISTINCT FROM ROW(OLD.slug,OLD.version,OLD.title,OLD.description,OLD.project_id,OLD.default_tier,OLD.recipe)
       OR NEW.status = 'draft' OR (OLD.status = 'retired' AND NEW.status <> 'retired')) THEN
      RAISE EXCEPTION 'Released template versions are immutable; create a new version';
    END IF;
  END IF;
  IF NEW.status IN ('ready','validated') AND (
    nullif(btrim(NEW.recipe->>'format'),'') IS NULL
    OR nullif(btrim(NEW.recipe->>'product_type'),'') IS NULL
    OR jsonb_typeof(NEW.recipe->'fields') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.recipe->'steps') IS DISTINCT FROM 'array'
    OR (NEW.recipe ? 'defaults' AND jsonb_typeof(NEW.recipe->'defaults') IS DISTINCT FROM 'object')
    OR coalesce(jsonb_array_length(NEW.recipe->'steps'),0) = 0) THEN
    RAISE EXCEPTION 'A ready template needs a format, product_type, fields and production steps';
  END IF;
  IF NEW.status = 'validated' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'validated'
      OR NEW.validation_evidence IS DISTINCT FROM OLD.validation_evidence) THEN
    IF nullif(btrim(NEW.validation_evidence->>'summary'),'') IS NULL
       OR jsonb_typeof(NEW.validation_evidence->'post_result_ids') IS DISTINCT FROM 'array'
       OR coalesce(jsonb_array_length(NEW.validation_evidence->'post_result_ids'),0) = 0 THEN
      RAISE EXCEPTION 'Validation needs a review note and measured post results';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(NEW.validation_evidence->'post_result_ids') e(id)
      WHERE NOT EXISTS (SELECT 1 FROM public.post_results r JOIN public.content_items c ON c.id = r.content_item_id
        WHERE r.id::text = e.id AND c.brief->'studio'->'template_snapshot'->>'id' = NEW.id::text
          AND r.post_url ~ '^https?://' AND (r.views IS NOT NULL OR r.reach IS NOT NULL
            OR r.likes IS NOT NULL OR r.comments IS NOT NULL OR r.shares IS NOT NULL OR r.saves IS NOT NULL))) THEN
      RAISE EXCEPTION 'Validation evidence must refer to measured posts made with this template version';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_guard_template() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS content_templates_guard ON public.content_templates;
CREATE TRIGGER content_templates_guard BEFORE INSERT OR UPDATE ON public.content_templates
  FOR EACH ROW EXECUTE FUNCTION public.hq_studio_guard_template();

-- Revision/provenance protection also covers edits made by the older HQ editors.
-- Performance observations and navigation-only changes do not revoke approval.
CREATE OR REPLACE FUNCTION public.hq_studio_guard_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE old_studio jsonb; new_studio jsonb; expected_snapshot jsonb; t public.content_templates%ROWTYPE;
  changed boolean; creative_changed boolean; old_revision integer := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN old_studio := OLD.brief->'studio'; END IF;
  new_studio := NEW.brief->'studio';
  IF old_studio IS NULL AND new_studio IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(new_studio) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Studio provenance cannot be removed'; END IF;
  IF coalesce(new_studio->>'tier','') NOT IN ('guided','one_tap','automated')
    OR jsonb_typeof(new_studio->'picks') IS DISTINCT FROM 'object'
    OR jsonb_typeof(new_studio->'decisions') IS DISTINCT FROM 'object'
    OR jsonb_typeof(new_studio->'research') IS DISTINCT FROM 'object'
    OR jsonb_typeof(new_studio->'variants') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Malformed Studio state'; END IF;
  IF old_studio IS NOT NULL THEN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN RAISE EXCEPTION 'A Studio item keeps its original brand'; END IF;
    IF new_studio->'template_snapshot' IS DISTINCT FROM old_studio->'template_snapshot' THEN
      RAISE EXCEPTION 'A content item keeps its original template snapshot; start a new item to change templates';
    END IF;
    old_revision := coalesce((old_studio->>'revision')::integer,0);
  ELSE
    SELECT * INTO t FROM public.content_templates WHERE id::text = new_studio->'template_snapshot'->>'id';
    IF NOT FOUND OR t.status NOT IN ('ready','validated') OR (t.project_id IS NOT NULL AND t.project_id IS DISTINCT FROM NEW.project_id) THEN
      RAISE EXCEPTION 'Template is not ready for this brand';
    END IF;
    expected_snapshot := jsonb_build_object('id',t.id,'slug',t.slug,'version',t.version,'title',t.title,
      'description',t.description,'project_id',t.project_id,'default_tier',t.default_tier,'recipe',t.recipe);
    IF new_studio->'template_snapshot' IS DISTINCT FROM expected_snapshot THEN
      RAISE EXCEPTION 'Template snapshot must match its released version';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    creative_changed := ROW(NEW.title,NEW.hook,NEW.cta,NEW.format,NEW.brief->'script',NEW.brief->'caption',NEW.brief->'asset_urls',
      NEW.brief->'body',NEW.brief->'text',NEW.brief->'content',NEW.brief->'full_text',NEW.brief->'cta_not_needed')
      IS DISTINCT FROM ROW(OLD.title,OLD.hook,OLD.cta,OLD.format,OLD.brief->'script',OLD.brief->'caption',OLD.brief->'asset_urls',
      OLD.brief->'body',OLD.brief->'text',OLD.brief->'content',OLD.brief->'full_text',OLD.brief->'cta_not_needed')
      OR ROW(new_studio->'picks',new_studio->'decisions',new_studio->'research',new_studio->'variants')
        IS DISTINCT FROM ROW(old_studio->'picks',old_studio->'decisions',old_studio->'research',old_studio->'variants');
    IF creative_changed THEN
      IF OLD.stage = 'published' OR (OLD.stage = 'scheduled' AND NEW.stage IN ('scheduled','published')) THEN
        RAISE EXCEPTION 'Unschedule this draft before editing; create a new item for a published revision';
      END IF;
      NEW.approved_at := NULL; NEW.approved_by := NULL; NEW.approved_version := NULL;
    END IF;
  ELSE creative_changed := true;
  END IF;
  changed := old_studio IS NULL OR creative_changed OR
    (new_studio - ARRAY['revision','updated_at','updated_by','updated_via'])
      IS DISTINCT FROM (old_studio - ARRAY['revision','updated_at','updated_by','updated_via']);
  IF changed THEN
    new_studio := new_studio || jsonb_build_object('revision',old_revision+1,'updated_at',now(),
      'updated_by',auth.uid(),'updated_via',CASE WHEN current_user = 'service_role' THEN 'worker' ELSE 'hq' END);
    NEW.updated_at := now();
  ELSE new_studio := old_studio;
  END IF;
  NEW.brief := jsonb_set(coalesce(NEW.brief,'{}'),'{studio}',new_studio);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_guard_content() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS content_items_studio_guard ON public.content_items;
CREATE TRIGGER content_items_studio_guard BEFORE INSERT OR UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.hq_studio_guard_content();

CREATE OR REPLACE FUNCTION public.hq_studio_save(p_content_id uuid,p_expected_revision integer,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE c public.content_items%ROWTYPE; t public.content_templates%ROWTYPE; s jsonb; b jsonb; parsed_brief jsonb; creative jsonb;
  k text; v jsonb; actual integer;
BEGIN
  IF auth.uid() IS NULL AND current_user <> 'service_role' THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.content_items WHERE id=p_content_id FOR UPDATE;
  IF NOT FOUND OR (current_user <> 'service_role' AND NOT public.hq_studio_can_access(c.project_id)) THEN
    RAISE EXCEPTION 'Content not found or access denied';
  END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Studio patch must be an object'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) x(key) WHERE x.key NOT IN
      ('template_id','tier','picks','decisions','research','variants','step','creative')) THEN
    RAISE EXCEPTION 'Unsupported Studio field';
  END IF;
  b := coalesce(c.brief,'{}');
  -- Older imports sometimes stored the brief as JSON text, plain prose or an
  -- array. Preserve that material while giving Studio a real object to edit.
  IF jsonb_typeof(b) = 'string' THEN
    BEGIN parsed_brief := (b #>> '{}')::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN parsed_brief := NULL;
    END;
    IF jsonb_typeof(parsed_brief) = 'object' THEN b := parsed_brief || jsonb_build_object('legacy_brief',b);
    ELSE b := jsonb_build_object('summary',b #>> '{}','legacy_brief',b);
    END IF;
  ELSIF jsonb_typeof(b) IS DISTINCT FROM 'object' THEN b := jsonb_build_object('legacy_brief',b);
  END IF;
  s := b->'studio'; actual := coalesce((s->>'revision')::integer,0);
  IF p_expected_revision IS NULL OR p_expected_revision <> actual THEN
    RAISE EXCEPTION 'Studio revision conflict: expected %, current %; reload before saving',p_expected_revision,actual USING ERRCODE='40001';
  END IF;
  IF s IS NULL THEN
    SELECT * INTO t FROM public.content_templates WHERE id::text=p_patch->>'template_id';
    IF NOT FOUND OR t.status NOT IN ('ready','validated') OR (t.project_id IS NOT NULL AND t.project_id IS DISTINCT FROM c.project_id) THEN
      RAISE EXCEPTION 'Choose a ready template for this brand';
    END IF;
    s := jsonb_build_object('revision',0,'template_snapshot',jsonb_build_object('id',t.id,'slug',t.slug,'version',t.version,
      'title',t.title,'description',t.description,'project_id',t.project_id,'default_tier',t.default_tier,'recipe',t.recipe),
      'tier',t.default_tier,'picks',coalesce(t.recipe->'defaults','{}'),'decisions','{}'::jsonb,'research','{}'::jsonb,
      'variants','[]'::jsonb,'step','brief');
  ELSIF p_patch ? 'template_id' AND p_patch->>'template_id' IS DISTINCT FROM s->'template_snapshot'->>'id' THEN
    RAISE EXCEPTION 'A content item keeps its original template snapshot';
  END IF;
  FOR k,v IN SELECT * FROM jsonb_each(p_patch) LOOP
    IF k IN ('picks','decisions','research') THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION '% must be an object',k; END IF;
      s := jsonb_set(s,ARRAY[k],coalesce(s->k,'{}') || v);
    ELSIF k = 'variants' THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'variants must be an array'; END IF;
      s := jsonb_set(s,ARRAY[k],v);
    ELSIF k = 'tier' THEN
      IF v #>> '{}' NOT IN ('guided','one_tap','automated') OR jsonb_typeof(v) <> 'string' THEN RAISE EXCEPTION 'Unknown creation tier'; END IF;
      s := jsonb_set(s,ARRAY[k],v);
    ELSIF k = 'step' THEN
      IF jsonb_typeof(v) <> 'string' OR length(btrim(v #>> '{}')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invalid Studio step'; END IF;
      s := jsonb_set(s,ARRAY[k],v);
    END IF;
  END LOOP;
  creative := coalesce(p_patch->'creative','{}');
  IF jsonb_typeof(creative) IS DISTINCT FROM 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(creative) x(key)
      WHERE x.key NOT IN ('title','hook','cta','format','script','caption','asset_urls')) THEN RAISE EXCEPTION 'Unsupported creative field'; END IF;
  FOR k,v IN SELECT * FROM jsonb_each(creative) LOOP
    IF k = 'asset_urls' THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'asset_urls must be an array'; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v) x WHERE jsonb_typeof(x) <> 'string' OR x #>> '{}' !~ '^https?://[^[:space:]]+$') THEN
        RAISE EXCEPTION 'Assets need real http(s) URLs';
      END IF;
    ELSIF jsonb_typeof(v) NOT IN ('string','null') THEN RAISE EXCEPTION '% must be text or null',k;
    END IF;
    IF k IN ('script','caption','asset_urls') THEN b := jsonb_set(b,ARRAY[k],v); END IF;
  END LOOP;
  UPDATE public.content_items SET brief=jsonb_set(b,'{studio}',s),
    title=CASE WHEN creative ? 'title' THEN creative->>'title' ELSE c.title END,
    hook=CASE WHEN creative ? 'hook' THEN creative->>'hook' ELSE c.hook END,
    cta=CASE WHEN creative ? 'cta' THEN creative->>'cta' ELSE c.cta END,
    format=CASE WHEN creative ? 'format' THEN creative->>'format' ELSE c.format END
  WHERE id=p_content_id RETURNING * INTO c;
  RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_save(uuid,integer,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_save(uuid,integer,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.hq_studio_request(p_content_id uuid,p_expected_revision integer,p_task_type text,
  p_idempotency_key text,p_instructions text DEFAULT '',p_action_item_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.content_items%ROWTYPE; h public.agent_handoffs%ROWTYPE; j public.production_jobs%ROWTYPE; a public.action_items%ROWTYPE;
  actual integer; target_agent text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.content_items WHERE id=p_content_id FOR UPDATE;
  IF NOT FOUND OR NOT public.hq_studio_can_access(c.project_id) THEN RAISE EXCEPTION 'Content not found or access denied'; END IF;
  IF p_task_type NOT IN ('research','draft','production') OR p_task_type IS NULL THEN RAISE EXCEPTION 'Unknown Studio task type'; END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'A stable request key is required'; END IF;
  SELECT * INTO h FROM public.agent_handoffs WHERE content_item_id=p_content_id AND spec->>'source'='content_studio'
    AND spec->>'request_key'=p_idempotency_key;
  IF FOUND THEN
    IF h.spec->>'task_type' IS DISTINCT FROM p_task_type OR (h.spec->>'content_revision')::integer IS DISTINCT FROM p_expected_revision
       OR h.spec->>'instructions' IS DISTINCT FROM coalesce(p_instructions,'') OR h.action_item_id IS DISTINCT FROM p_action_item_id THEN
      RAISE EXCEPTION 'Request key already belongs to different work';
    END IF;
    h.studio_claim_token := NULL; RETURN to_jsonb(h);
  END IF;
  actual := coalesce((c.brief->'studio'->>'revision')::integer,0);
  IF actual=0 THEN RAISE EXCEPTION 'Save the template and brief before requesting work'; END IF;
  IF p_expected_revision IS NULL OR p_expected_revision <> actual THEN RAISE EXCEPTION 'Studio revision conflict; reload before requesting work' USING ERRCODE='40001'; END IF;
  IF c.stage IN ('scheduled','published') THEN RAISE EXCEPTION 'This item is already in delivery; create a new draft or unschedule it first'; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_handoffs WHERE content_item_id=p_content_id AND spec->>'source'='content_studio'
      AND spec->>'task_type'=p_task_type AND status IN ('new','claimed')) THEN
    RAISE EXCEPTION 'This Studio task is already queued; finish or cancel it before requesting another';
  END IF;
  IF p_action_item_id IS NOT NULL THEN
    SELECT * INTO a FROM public.action_items WHERE id=p_action_item_id;
    SELECT * INTO j FROM public.production_jobs WHERE id=a.job_id;
    IF a.id IS NULL OR a.owner_kind IS DISTINCT FROM 'claude' OR a.status='Done' OR j.id IS NULL OR j.status IS NULL OR j.status IN ('parked','finished')
       OR j.project_id IS DISTINCT FROM c.project_id OR j.target_type IS DISTINCT FROM 'content_items' OR j.target_id IS DISTINCT FROM c.id
       OR (a.depends_on IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.action_items dep WHERE dep.id=a.depends_on AND dep.status='Done')) THEN
      RAISE EXCEPTION 'Only an available worker step in this content pipeline may be linked';
    END IF;
  ELSE
    SELECT * INTO j FROM public.production_jobs WHERE target_type='content_items' AND target_id=c.id AND project_id=c.project_id
      AND status NOT IN ('parked','finished') ORDER BY created_at DESC LIMIT 1;
  END IF;
  target_agent := CASE WHEN p_task_type='research' THEN 'muse' ELSE 'claude' END;
  INSERT INTO public.agent_handoffs(from_agent,to_agent,kind,title,venue_id,content_item_id,action_item_id,fallback_agent,spec)
    VALUES('owner',target_agent,'task',initcap(p_task_type)||': '||c.title,c.project_id,c.id,p_action_item_id,'chatgpt',
      jsonb_build_object('source','content_studio','schema_version',1,'task_type',p_task_type,'request_key',p_idempotency_key,
        'requested_by',auth.uid(),'content_revision',actual,'instructions',coalesce(p_instructions,''),'job_id',j.id,
        'template_snapshot',c.brief->'studio'->'template_snapshot','studio',c.brief->'studio',
        'content',jsonb_build_object('id',c.id,'title',c.title,'format',c.format,'hook',c.hook,'cta',c.cta,'brief',c.brief,
          'purpose',c.purpose,'purpose_type',c.purpose_type,'idea_score',c.idea_score,'idea_evidence',c.idea_evidence),
        'publication_policy','owner_approval_required',
        'output_contract',CASE p_task_type
          WHEN 'research' THEN 'Return summary and patch.research.facts: text, kind=fact|scenario, source_url for every fact. Include at least one sourced fact. Separate researched facts from fictional assumptions.'
          WHEN 'draft' THEN 'Return summary, patch.decisions.hooks (at least three distinct text options with rationale), and patch.creative.script or caption. Keep the original research and cite factual claims.'
          ELSE 'Return summary, patch.creative.asset_urls with actual finished assets, and result_links with artifact URLs. Prompts, plans and pending jobs are not finished assets.' END))
    RETURNING * INTO h;
  RETURN to_jsonb(h);
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_request(uuid,integer,text,text,text,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_request(uuid,integer,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.hq_studio_tasks(p_content_id uuid)
RETURNS SETOF public.agent_handoffs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project uuid; h public.agent_handoffs%ROWTYPE;
BEGIN
  SELECT project_id INTO project FROM public.content_items WHERE id=p_content_id;
  IF auth.uid() IS NULL OR NOT public.hq_studio_can_access(project) THEN RAISE EXCEPTION 'Content not found or access denied'; END IF;
  FOR h IN SELECT * FROM public.agent_handoffs WHERE content_item_id=p_content_id AND spec->>'source'='content_studio' ORDER BY created_at DESC LOOP
    h.studio_claim_token := NULL; RETURN NEXT h;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_tasks(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_tasks(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.hq_studio_cancel(p_handoff_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h public.agent_handoffs%ROWTYPE;
BEGIN
  SELECT * INTO h FROM public.agent_handoffs WHERE id=p_handoff_id FOR UPDATE;
  IF auth.uid() IS NULL OR NOT FOUND OR h.spec->>'source' IS DISTINCT FROM 'content_studio'
    OR NOT public.hq_studio_can_access(h.venue_id) THEN RAISE EXCEPTION 'Task not found or access denied'; END IF;
  IF h.status IN ('new','claimed','failed','needs_owner') THEN
    UPDATE public.agent_handoffs SET status='cancelled',studio_claim_token=NULL,studio_lease_expires_at=NULL,
      updated_at=now(),notes=concat_ws(E'\n',notes,'Cancelled in Content Studio by '||auth.uid()::text)
      WHERE id=h.id RETURNING * INTO h;
  END IF;
  h.studio_claim_token := NULL; RETURN to_jsonb(h);
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_cancel(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_cancel(uuid) TO authenticated;

-- Only a server worker with the actual service_role can claim or return work.
-- No user ID or auth claims are accepted as an argument or synthesized here.
CREATE OR REPLACE FUNCTION public.hq_studio_claim(p_handoff_id uuid,p_worker text DEFAULT 'chatgpt')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE h public.agent_handoffs%ROWTYPE;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'A service worker is required'; END IF;
  IF p_worker NOT IN ('claude','muse','chatgpt') OR p_worker IS NULL THEN RAISE EXCEPTION 'Unknown worker'; END IF;
  SELECT * INTO h FROM public.agent_handoffs WHERE id=p_handoff_id FOR UPDATE;
  IF NOT FOUND OR h.spec->>'source' IS DISTINCT FROM 'content_studio' OR h.kind <> 'task' THEN RAISE EXCEPTION 'Studio task not found'; END IF;
  IF p_worker NOT IN (h.to_agent,h.fallback_agent) THEN RAISE EXCEPTION 'This task is routed to another worker'; END IF;
  IF h.status <> 'new' AND NOT (h.status='claimed' AND h.studio_lease_expires_at < now()) THEN
    RAISE EXCEPTION 'Task is not available to claim';
  END IF;
  UPDATE public.agent_handoffs SET status='claimed',claimed_at=now(),last_run_at=now(),updated_at=now(),attempts=attempts+1,
    studio_claim_token=gen_random_uuid(),studio_claimed_by=p_worker,studio_lease_expires_at=now()+interval '2 hours'
    WHERE id=h.id RETURNING * INTO h;
  RETURN to_jsonb(h);
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_claim(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_claim(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.hq_studio_complete(p_handoff_id uuid,p_claim_token uuid,p_expected_revision integer,
  p_result jsonb,p_result_links jsonb DEFAULT '[]',p_status text DEFAULT 'done')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE h public.agent_handoffs%ROWTYPE; c public.content_items%ROWTYPE; patch jsonb; facts jsonb; hooks jsonb;
  saved jsonb; a public.action_items%ROWTYPE; j public.production_jobs%ROWTYPE;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'A service worker is required'; END IF;
  -- Same lock order as request: content first, then its mailbox task.
  SELECT * INTO h FROM public.agent_handoffs WHERE id=p_handoff_id;
  IF NOT FOUND OR h.spec->>'source' IS DISTINCT FROM 'content_studio' THEN RAISE EXCEPTION 'Studio task not found'; END IF;
  SELECT * INTO c FROM public.content_items WHERE id=h.content_item_id FOR UPDATE;
  SELECT * INTO h FROM public.agent_handoffs WHERE id=p_handoff_id FOR UPDATE;
  IF p_claim_token IS NULL OR h.studio_claim_token IS DISTINCT FROM p_claim_token THEN RAISE EXCEPTION 'Worker lease does not match'; END IF;
  IF h.status='done' THEN
    IF h.result->'submission' IS DISTINCT FROM p_result OR h.result_links IS DISTINCT FROM p_result_links THEN
      RAISE EXCEPTION 'Completed work cannot be replaced';
    END IF;
    RETURN to_jsonb(h) - 'studio_claim_token';
  END IF;
  IF h.status <> 'claimed' OR h.studio_lease_expires_at < now() THEN RAISE EXCEPTION 'Worker lease expired or task is no longer claimed'; END IF;
  IF p_status NOT IN ('done','failed','needs_owner') OR p_status IS NULL THEN RAISE EXCEPTION 'Unknown completion status'; END IF;
  IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR nullif(btrim(p_result->>'summary'),'') IS NULL THEN
    RAISE EXCEPTION 'A result summary is required';
  END IF;
  IF jsonb_typeof(p_result_links) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Result links must be an array'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_result_links) x WHERE jsonb_typeof(x) <> 'object'
      OR coalesce(x->>'url','') !~ '^https?://[^[:space:]]+$') THEN RAISE EXCEPTION 'Result links need real http(s) URLs'; END IF;
  IF p_status='done' THEN
    IF c.id IS NULL OR p_expected_revision IS NULL OR p_expected_revision IS DISTINCT FROM (h.spec->>'content_revision')::integer
      OR p_expected_revision IS DISTINCT FROM (c.brief->'studio'->>'revision')::integer THEN
      RAISE EXCEPTION 'Studio changed while the worker was running; keep this result for review and request fresh work' USING ERRCODE='40001';
    END IF;
    patch := p_result->'patch';
    IF jsonb_typeof(patch) IS DISTINCT FROM 'object' OR patch='{}'::jsonb THEN RAISE EXCEPTION 'Completed work needs actual output'; END IF;
    IF h.spec->>'task_type'='research' THEN
      facts := patch->'research'->'facts';
      IF jsonb_typeof(facts) IS DISTINCT FROM 'array' OR coalesce(jsonb_array_length(facts),0)=0 THEN RAISE EXCEPTION 'Research needs sourced findings'; END IF;
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(facts) f WHERE f->>'kind'='fact') OR
         EXISTS (SELECT 1 FROM jsonb_array_elements(facts) f WHERE jsonb_typeof(f) <> 'object'
           OR nullif(btrim(f->>'text'),'') IS NULL OR coalesce(f->>'kind','') NOT IN ('fact','scenario')
           OR (f->>'kind'='fact' AND coalesce(f->>'source_url','') !~ '^https?://[^[:space:]]+$')) THEN
        RAISE EXCEPTION 'Label facts and scenarios separately and provide a source URL for every fact';
      END IF;
    ELSIF h.spec->>'task_type'='draft' THEN
      hooks := patch->'decisions'->'hooks';
      IF jsonb_typeof(hooks) IS DISTINCT FROM 'array' OR coalesce(jsonb_array_length(hooks),0)<3 THEN RAISE EXCEPTION 'Draft work needs three hook options'; END IF;
      IF (SELECT count(DISTINCT lower(btrim(x->>'text'))) FROM jsonb_array_elements(hooks) x WHERE nullif(btrim(x->>'text'),'') IS NOT NULL)<3
        OR coalesce(length(btrim(coalesce(nullif(btrim(patch->'creative'->>'script'),''),patch->'creative'->>'caption'))),0)<20 THEN
        RAISE EXCEPTION 'Draft work needs three distinct hooks and a usable script or caption';
      END IF;
    ELSIF h.spec->>'task_type'='production' THEN
      IF jsonb_typeof(patch->'creative'->'asset_urls') IS DISTINCT FROM 'array'
        OR coalesce(jsonb_array_length(patch->'creative'->'asset_urls'),0)=0 OR jsonb_array_length(p_result_links)=0 THEN
        RAISE EXCEPTION 'Production needs finished asset URLs and a delivery receipt; a plan is not a finished asset';
      END IF;
    ELSE RAISE EXCEPTION 'Unknown Studio task type';
    END IF;
    IF h.action_item_id IS NOT NULL THEN
      SELECT * INTO a FROM public.action_items WHERE id=h.action_item_id;
      -- Pipeline pause/resume locks the job before its steps; use the same order.
      SELECT * INTO j FROM public.production_jobs WHERE id=a.job_id FOR UPDATE;
      SELECT * INTO a FROM public.action_items WHERE id=h.action_item_id FOR UPDATE;
      IF a.id IS NULL OR a.owner_kind IS DISTINCT FROM 'claude' OR a.status='Done' OR j.id IS NULL OR j.status IS NULL OR j.status IN ('parked','finished')
        OR a.job_id IS DISTINCT FROM j.id OR j.project_id IS DISTINCT FROM c.project_id OR j.target_type IS DISTINCT FROM 'content_items' OR j.target_id IS DISTINCT FROM c.id
        OR (a.depends_on IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.action_items dep WHERE dep.id=a.depends_on AND dep.status='Done')) THEN
        RAISE EXCEPTION 'The linked worker step is no longer available';
      END IF;
    END IF;
    saved := public.hq_studio_save(c.id,p_expected_revision,patch);
    IF h.action_item_id IS NOT NULL THEN
      -- Do not depend on the legacy mailbox bridge, which catches step errors.
      -- A rejected/paused step rolls back its output and mailbox status together.
      UPDATE public.action_items SET status='Done',completed_at=now(),
        completion_notes=concat_ws(E'\n',nullif(completion_notes,''),'Done through Content Studio: '||(p_result->>'summary')),
        output_url=coalesce(p_result_links->0->>'url',output_url)
      WHERE id=h.action_item_id AND owner_kind='claude' AND status <> 'Done';
    END IF;
  END IF;
  UPDATE public.agent_handoffs SET status=p_status,completed_at=CASE WHEN p_status='done' THEN now() ELSE NULL END,
    updated_at=now(),last_run_at=now(),studio_lease_expires_at=NULL,
    result=jsonb_build_object('summary',p_result->>'summary','submission',p_result,'applied',p_status='done',
      'content_revision',saved->'brief'->'studio'->'revision','worker',h.studio_claimed_by),result_links=p_result_links
    WHERE id=h.id RETURNING * INTO h;
  RETURN to_jsonb(h) - 'studio_claim_token';
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_complete(uuid,uuid,integer,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_complete(uuid,uuid,integer,jsonb,jsonb,text) TO service_role;

-- Real observations use the existing results table, with frozen template attribution.
CREATE OR REPLACE FUNCTION public.hq_studio_record_result(p_content_id uuid,p_placement_id uuid,p_metrics jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.content_items%ROWTYPE; r public.post_results%ROWTYPE; placement public.content_placements%ROWTYPE;
  post_url_value text; platform_value text; captured date; k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.content_items WHERE id=p_content_id FOR UPDATE;
  IF NOT FOUND OR NOT public.hq_studio_can_access(c.project_id) OR NOT public.user_can_manage_project(c.project_id) THEN RAISE EXCEPTION 'Content not found or access denied'; END IF;
  IF jsonb_typeof(p_metrics) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Metrics must be an object'; END IF;
  IF p_placement_id IS NOT NULL THEN
    SELECT * INTO placement FROM public.content_placements WHERE id=p_placement_id;
    IF NOT FOUND OR placement.content_item_id IS DISTINCT FROM c.id OR placement.project_id IS DISTINCT FROM c.project_id THEN RAISE EXCEPTION 'Placement does not belong to this content'; END IF;
    IF p_metrics ? 'post_url' AND p_metrics->>'post_url' IS DISTINCT FROM placement.live_url THEN RAISE EXCEPTION 'Result URL must match its placement'; END IF;
  END IF;
  post_url_value := coalesce(placement.live_url,p_metrics->>'post_url'); platform_value := p_metrics->>'platform';
  captured := coalesce((p_metrics->>'captured_on')::date,current_date);
  IF post_url_value IS NULL OR post_url_value !~ '^https?://[^[:space:]]+$' OR platform_value IS NULL
    OR platform_value NOT IN ('facebook','instagram','tiktok','youtube','pinterest','threads','x','other') THEN RAISE EXCEPTION 'Results need a real post URL and platform'; END IF;
  IF captured>current_date THEN RAISE EXCEPTION 'An observation cannot be dated in the future'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_each(p_metrics) x WHERE x.key IN ('views','reach','likes','comments','shares','saves','follows_gained') AND jsonb_typeof(x.value)='number') THEN RAISE EXCEPTION 'Record at least one measured metric'; END IF;
  FOREACH k IN ARRAY ARRAY['views','reach','likes','comments','shares','saves','follows_gained','snapshot_day'] LOOP
    IF p_metrics ? k AND p_metrics->k <> 'null'::jsonb AND (jsonb_typeof(p_metrics->k)<>'number' OR p_metrics->>k !~ '^[0-9]+$') THEN RAISE EXCEPTION '% must be a nonnegative whole number',k; END IF;
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtextextended('studio-result:'||post_url_value||':'||captured::text,0));
  SELECT * INTO r FROM public.post_results WHERE post_url=post_url_value AND captured_on=captured FOR UPDATE;
  IF FOUND AND (r.content_item_id IS DISTINCT FROM c.id OR r.venue_id IS DISTINCT FROM c.project_id) THEN RAISE EXCEPTION 'This observation belongs to other content'; END IF;
  INSERT INTO public.post_results(venue_id,owner,platform,post_url,posted_at,format,hook_text,content_item_id,placement_id,source,captured_on,snapshot_day,
    views,reach,likes,comments,shares,saves,follows_gained,data,notes)
  VALUES(c.project_id,'ours',platform_value,post_url_value,coalesce((p_metrics->>'posted_at')::timestamptz,c.published_at),c.format,c.hook,c.id,p_placement_id,'manual',captured,(p_metrics->>'snapshot_day')::integer,
    (p_metrics->>'views')::integer,(p_metrics->>'reach')::integer,(p_metrics->>'likes')::integer,(p_metrics->>'comments')::integer,(p_metrics->>'shares')::integer,(p_metrics->>'saves')::integer,(p_metrics->>'follows_gained')::integer,
    jsonb_build_object('studio',jsonb_build_object('template_id',c.brief->'studio'->'template_snapshot'->'id','template_version',c.brief->'studio'->'template_snapshot'->'version',
      'revision',c.brief->'studio'->'revision','picks',c.brief->'studio'->'picks','selected_hook',c.brief->'studio'->'decisions'->'selected_hook'),'recorded_by',auth.uid()),p_metrics->>'notes')
  ON CONFLICT(post_url,captured_on) DO UPDATE SET
    views=CASE WHEN p_metrics ? 'views' THEN EXCLUDED.views ELSE post_results.views END,
    reach=CASE WHEN p_metrics ? 'reach' THEN EXCLUDED.reach ELSE post_results.reach END,
    likes=CASE WHEN p_metrics ? 'likes' THEN EXCLUDED.likes ELSE post_results.likes END,
    comments=CASE WHEN p_metrics ? 'comments' THEN EXCLUDED.comments ELSE post_results.comments END,
    shares=CASE WHEN p_metrics ? 'shares' THEN EXCLUDED.shares ELSE post_results.shares END,
    saves=CASE WHEN p_metrics ? 'saves' THEN EXCLUDED.saves ELSE post_results.saves END,
    follows_gained=CASE WHEN p_metrics ? 'follows_gained' THEN EXCLUDED.follows_gained ELSE post_results.follows_gained END,
    notes=CASE WHEN p_metrics ? 'notes' THEN EXCLUDED.notes ELSE post_results.notes END,
    snapshot_day=CASE WHEN p_metrics ? 'snapshot_day' THEN EXCLUDED.snapshot_day ELSE post_results.snapshot_day END
  RETURNING * INTO r;
  UPDATE public.content_items SET performance=coalesce(performance,'{}')||jsonb_build_object('latest_result_id',r.id,'last_observed_at',captured) WHERE id=c.id;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_record_result(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_record_result(uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.hq_studio_results(p_content_id uuid)
RETURNS SETOF public.post_results LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project uuid;
BEGIN
  SELECT project_id INTO project FROM public.content_items WHERE id=p_content_id;
  IF auth.uid() IS NULL OR NOT public.hq_studio_can_access(project) THEN RAISE EXCEPTION 'Content not found or access denied'; END IF;
  RETURN QUERY SELECT * FROM public.post_results WHERE content_item_id=p_content_id AND venue_id=project ORDER BY captured_on DESC;
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_results(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hq_studio_results(uuid) TO authenticated;

-- Extend the existing composer transaction, retaining its goal, dependency,
-- owner-assignment and retry behavior. No second job-creation API is introduced.
CREATE OR REPLACE FUNCTION public.hq_create_pipeline(p_job jsonb,p_steps jsonb,p_new_content jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE project uuid := (p_job->>'project_id')::uuid; job_id uuid; previous_id uuid; step_id uuid;
  v_target_id uuid := (p_job->>'target_id')::uuid; step jsonb; n integer := 0; existing_id uuid;
  v_target_type text := CASE WHEN p_new_content IS NOT NULL THEN 'content_items' ELSE p_job->>'target_type' END;
  v_target_key text := nullif(p_job->>'target_key',''); v_request_key text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=project) THEN RAISE EXCEPTION 'Project not found or access denied'; END IF;
  IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR jsonb_array_length(p_steps)=0 THEN RAISE EXCEPTION 'Pipeline needs steps'; END IF;
  IF v_target_type='content_items' AND v_target_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.content_items c WHERE c.id=v_target_id AND c.project_id=project) THEN
    RAISE EXCEPTION 'Content target does not belong to this project';
  END IF;
  IF v_target_id IS NULL AND v_target_key IS NULL AND p_new_content->>'request_key' IS NOT NULL THEN
    v_request_key := p_new_content->>'request_key';
    IF length(btrim(v_request_key)) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'A stable Studio request key is required'; END IF;
    v_target_key := 'studio:'||v_request_key;
  END IF;
  IF p_new_content ? 'studio' AND v_target_id IS NULL AND v_target_key IS NULL THEN
    RAISE EXCEPTION 'A stable Studio request key is required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(project::text||':'||(p_job->>'kind')||':'||coalesce(v_target_id::text,v_target_key,p_job->>'title'),0));
  SELECT id INTO existing_id FROM public.production_jobs WHERE project_id=project AND kind=p_job->>'kind'
    AND (status NOT IN ('finished','parked') OR v_request_key IS NOT NULL)
    AND ((v_target_id IS NOT NULL AND production_jobs.target_id=v_target_id) OR (v_target_key IS NOT NULL AND target_key=v_target_key)) ORDER BY created_at LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  IF p_new_content IS NOT NULL AND v_target_id IS NULL THEN
    -- Omit format when the caller omits it, preserving the database default.
    -- The inspected live schema currently has no format default (NULL).
    INSERT INTO public.content_items(project_id,title,stage,purpose_type,purpose,brief,created_by)
      VALUES(project,p_new_content->>'title','idea',coalesce(nullif(p_new_content->>'purpose_type',''),'teach'),
        CASE WHEN p_new_content ? 'studio' THEN 'From Content Studio' ELSE 'From Answer Bank' END,
        jsonb_build_object('summary',p_new_content->>'summary'),auth.uid()) RETURNING id INTO v_target_id;
    IF p_new_content ? 'format' THEN UPDATE public.content_items SET format=p_new_content->>'format' WHERE id=v_target_id; END IF;
    IF p_new_content ? 'studio' THEN PERFORM public.hq_studio_save(v_target_id,0,p_new_content->'studio'); END IF;
  END IF;
  INSERT INTO public.production_jobs(project_id,kind,title,target_type,target_id,target_key,recipe,level,money_destination,goal_text,goal_pillar_key,goal_kpi_key,status,current_step,created_by,result_links)
    VALUES(project,p_job->>'kind',p_job->>'title',v_target_type,v_target_id,v_target_key,p_job->'recipe',
      (p_job->>'level')::smallint,p_job->>'money_destination',nullif(p_job->>'goal_text',''),nullif(p_job->>'goal_pillar_key',''),nullif(p_job->>'goal_kpi_key',''),
      CASE WHEN p_steps->0->>'owner_kind'='owner' THEN 'ready' ELSE 'running' END,1,'owner','[]') RETURNING id INTO job_id;
  FOR step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    n := n+1;
    INSERT INTO public.action_items(bar_id,venue_id,job_id,step_order,method_id,owner_kind,title,detail,facts,status,approval_status,priority,assignee,assignee_id,source,is_manual,created_by_id,due_date,depends_on)
      VALUES(project,project,job_id,n,(step->>'method_id')::uuid,step->>'owner_kind',step->>'title',step->>'detail',step->>'facts','Open',
        CASE WHEN step->>'owner_kind'='claude' THEN 'Auto' WHEN n=1 THEN 'Approved' ELSE 'Blocked' END,
        step->>'priority',step->>'assignee',CASE WHEN step->>'owner_kind'='owner' THEN auth.uid() ELSE NULL END,'pipeline',true,auth.uid(),(step->>'due_date')::date,previous_id) RETURNING id INTO step_id;
    previous_id := step_id;
  END LOOP;
  RETURN job_id;
END $$;
-- Retain the existing service_role grant on this pre-existing composer RPC.
REVOKE ALL ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) TO authenticated;

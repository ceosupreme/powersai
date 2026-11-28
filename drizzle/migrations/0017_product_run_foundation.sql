ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS run_state jsonb;
COMMENT ON COLUMN public.production_jobs.run_state IS 'Frozen product_template {id,version,recipe} and stage_results/stage_steps keyed by stage key. recipe remains the playbook-version list.';

CREATE OR REPLACE FUNCTION public.hq_check_product_recipe(r jsonb) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE s jsonb; c jsonb; seen text[] := '{}'; k text;
BEGIN
 IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR nullif(btrim(r->>'key'),'') IS NULL OR nullif(btrim(r->>'title'),'') IS NULL OR nullif(btrim(r->>'version'),'') IS NULL THEN RAISE EXCEPTION 'Product recipe needs key, title and version'; END IF;
 IF jsonb_typeof(r->'upload_kit') IS DISTINCT FROM 'object' OR r->'upload_kit'='{}'::jsonb THEN RAISE EXCEPTION 'Product recipe needs upload_kit'; END IF;
 IF jsonb_typeof(r->'stages') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Product recipe needs stages'; END IF;
 IF jsonb_array_length(r->'stages')=0 THEN RAISE EXCEPTION 'Product recipe needs stages'; END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(r->'stages') LOOP
  k := nullif(btrim(s->>'key'),'');
  IF k IS NULL OR k=ANY(seen) THEN RAISE EXCEPTION 'Product stage keys must be present and unique'; END IF;
  seen := array_append(seen,k);
  IF s->>'owner' IS NULL OR s->>'owner' NOT IN ('claude','owner') THEN RAISE EXCEPTION 'Product stage owner must be claude or owner'; END IF;
  IF s->>'owner'='owner' AND (jsonb_typeof(s->'skip') IS DISTINCT FROM 'object' OR jsonb_typeof(s->'skip'->'can_skip') IS DISTINCT FROM 'boolean' OR nullif(btrim(s->'skip'->>'rule'),'') IS NULL) THEN RAISE EXCEPTION 'Every owner stage needs a skip rule'; END IF;
  IF jsonb_typeof(s->'choices') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Product stage choices must be a list'; END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(s->'choices') LOOP
   IF jsonb_typeof(c) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Product choice must be an object'; END IF;
   IF c ? 'options' AND jsonb_typeof(c->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Product options must be a list'; END IF;
   IF jsonb_typeof(c->'options')='array' AND jsonb_array_length(c->'options')>0 THEN
    IF (SELECT count(*) FROM jsonb_array_elements(c->'options') o WHERE o->'recommended'='true'::jsonb)<>1 THEN RAISE EXCEPTION 'Exactly one option must be recommended'; END IF;
   END IF;
  END LOOP;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.hq_check_product_recipe(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_check_product_recipe(jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.hq_studio_guard_template()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Template authorship cannot be changed'; END IF;
  IF OLD.status<>'draft' AND (ROW(NEW.slug,NEW.version,NEW.title,NEW.description,NEW.project_id,NEW.default_tier,NEW.recipe) IS DISTINCT FROM ROW(OLD.slug,OLD.version,OLD.title,OLD.description,OLD.project_id,OLD.default_tier,OLD.recipe) OR NEW.status='draft' OR (OLD.status='retired' AND NEW.status<>'retired')) THEN RAISE EXCEPTION 'Released template versions are immutable; create a new version'; END IF;
 END IF;
 IF NEW.recipe->>'kind'='product' THEN
  PERFORM public.hq_check_product_recipe(NEW.recipe);
  IF NEW.slug IS DISTINCT FROM NEW.recipe->>'key' OR NEW.title IS DISTINCT FROM NEW.recipe->>'title' OR NEW.project_id IS NOT NULL THEN RAISE EXCEPTION 'Product templates must match recipe identity and be global'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.knowledge_base WHERE id::text=NEW.recipe->>'kb_id' AND status IN ('active','draft') AND tags @> ARRAY['key:'||NEW.slug]) THEN RAISE EXCEPTION 'Product recipe needs its active or draft tagged playbook'; END IF;
 ELSIF NEW.status IN ('ready','validated') AND (nullif(btrim(NEW.recipe->>'format'),'') IS NULL OR nullif(btrim(NEW.recipe->>'product_type'),'') IS NULL OR jsonb_typeof(NEW.recipe->'fields') IS DISTINCT FROM 'array' OR jsonb_typeof(NEW.recipe->'steps') IS DISTINCT FROM 'array' OR (NEW.recipe ? 'defaults' AND jsonb_typeof(NEW.recipe->'defaults') IS DISTINCT FROM 'object') OR coalesce(jsonb_array_length(NEW.recipe->'steps'),0)=0) THEN
  RAISE EXCEPTION 'A ready template needs a format, product_type, fields and production steps';
 END IF;
 IF NEW.status='validated' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'validated' OR NEW.validation_evidence IS DISTINCT FROM OLD.validation_evidence) THEN
  IF nullif(btrim(NEW.validation_evidence->>'summary'),'') IS NULL OR jsonb_typeof(NEW.validation_evidence->'post_result_ids') IS DISTINCT FROM 'array' OR coalesce(jsonb_array_length(NEW.validation_evidence->'post_result_ids'),0)=0 THEN RAISE EXCEPTION 'Validation needs a review note and measured post results'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.validation_evidence->'post_result_ids') e(id) WHERE NOT EXISTS(SELECT 1 FROM public.post_results r JOIN public.content_items c ON c.id=r.content_item_id WHERE r.id::text=e.id AND c.brief->'studio'->'template_snapshot'->>'id'=NEW.id::text AND r.post_url ~ '^https?://' AND (r.views IS NOT NULL OR r.reach IS NOT NULL OR r.likes IS NOT NULL OR r.comments IS NOT NULL OR r.shares IS NOT NULL OR r.saves IS NOT NULL))) THEN RAISE EXCEPTION 'Validation evidence must refer to measured posts made with this template version'; END IF;
 END IF;
 NEW.updated_at := now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_studio_guard_template() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.hq_guard_product_run_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.run_state->'product_template' IS NOT NULL AND NEW.run_state->'product_template' IS DISTINCT FROM OLD.run_state->'product_template' THEN RAISE EXCEPTION 'A product run keeps its frozen recipe'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_guard_product_run_snapshot() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER production_jobs_product_snapshot BEFORE UPDATE OF run_state ON public.production_jobs FOR EACH ROW EXECUTE FUNCTION public.hq_guard_product_run_snapshot();

CREATE OR REPLACE FUNCTION public.hq_create_pipeline(p_job jsonb,p_steps jsonb,p_new_content jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE project uuid := (p_job->>'project_id')::uuid; job_id uuid; previous_id uuid; step_id uuid;
 v_target_id uuid := (p_job->>'target_id')::uuid; step jsonb; n integer := 0; existing_id uuid;
 v_target_type text := CASE WHEN p_new_content IS NOT NULL THEN 'content_items' ELSE p_job->>'target_type' END;
 v_target_key text := nullif(p_job->>'target_key',''); v_request_key text;
 t public.content_templates%ROWTYPE; frozen jsonb; stage_map jsonb := '{}'; stage_key text; product_run boolean := p_job->>'kind'='product' AND p_job ? 'product_template_id';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=project) THEN RAISE EXCEPTION 'Project not found or access denied'; END IF;
 IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR jsonb_array_length(p_steps)=0 THEN RAISE EXCEPTION 'Pipeline needs steps'; END IF;
 IF product_run THEN
  IF v_target_type IS DISTINCT FROM 'channel_products' OR p_new_content IS NOT NULL THEN RAISE EXCEPTION 'Product runs target channel_products'; END IF;
  SELECT * INTO t FROM public.content_templates WHERE id::text=p_job->>'product_template_id' AND recipe->>'kind'='product' AND status IN ('ready','validated') AND project_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a ready product template'; END IF;
  PERFORM public.hq_check_product_recipe(t.recipe);
  IF jsonb_typeof(p_job->'recipe') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'recipe remains a playbook-version list'; END IF;
  IF v_target_id IS NULL THEN
   v_request_key := p_job->'new_product'->>'request_key';
   IF length(btrim(coalesce(v_request_key,''))) NOT BETWEEN 8 AND 200 OR nullif(btrim(p_job->'new_product'->>'name'),'') IS NULL THEN RAISE EXCEPTION 'A product name and stable creation key are required'; END IF;
   v_target_key := 'product:'||v_request_key;
   PERFORM pg_advisory_xact_lock(hashtextextended(project::text||':'||v_target_key,0));
   SELECT id INTO existing_id FROM public.production_jobs WHERE project_id=project AND kind='product' AND target_key=v_target_key ORDER BY created_at LIMIT 1;
   IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
   INSERT INTO public.channel_products(name,status,created_by) VALUES(p_job->'new_product'->>'name','brief',auth.uid()) RETURNING id INTO v_target_id;
   INSERT INTO public.channel_product_channels(product_id,project_id) VALUES(v_target_id,project);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.channel_products p JOIN public.channel_product_channels l ON l.product_id=p.id WHERE p.id=v_target_id AND l.project_id=project) THEN RAISE EXCEPTION 'Product target does not belong to this brand'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('product-run:'||v_target_id::text,0));
  SELECT id INTO existing_id FROM public.production_jobs WHERE kind='product' AND target_type='channel_products' AND target_id=v_target_id AND (run_state IS NOT NULL OR status NOT IN ('finished','parked')) ORDER BY created_at LIMIT 1;
  IF existing_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.production_jobs WHERE id=existing_id AND run_state->'product_template' IS NOT NULL) THEN RAISE EXCEPTION 'Existing legacy product plan needs an explicit keyed-stage conversion; it was not replaced'; END IF;
   RETURN existing_id;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(t.recipe->'stages') s WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_steps) x WHERE (x->>'facts')::jsonb->>'stage_key'=s->>'key')) THEN RAISE EXCEPTION 'Every recipe stage needs its saved key'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_steps))<>(SELECT count(DISTINCT (x->>'facts')::jsonb->>'stage_key') FROM jsonb_array_elements(p_steps) x) THEN RAISE EXCEPTION 'Pipeline stage keys must be unique and present'; END IF;
  frozen := jsonb_build_object('product_template',jsonb_build_object('id',t.id,'version',t.version,'recipe',t.recipe),'stage_results','{}'::jsonb,'stage_steps','{}'::jsonb);
 END IF;
 IF v_target_type='content_items' AND v_target_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.content_items c WHERE c.id=v_target_id AND c.project_id=project) THEN RAISE EXCEPTION 'Content target does not belong to this project'; END IF;
 IF v_target_id IS NULL AND v_target_key IS NULL AND p_new_content->>'request_key' IS NOT NULL THEN
  v_request_key := p_new_content->>'request_key';
  IF length(btrim(v_request_key)) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'A stable Studio request key is required'; END IF;
  v_target_key := 'studio:'||v_request_key;
 END IF;
 IF p_new_content ? 'studio' AND v_target_id IS NULL AND v_target_key IS NULL THEN RAISE EXCEPTION 'A stable Studio request key is required'; END IF;
 IF NOT product_run THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(project::text||':'||(p_job->>'kind')||':'||coalesce(v_target_id::text,v_target_key,p_job->>'title'),0));
  SELECT id INTO existing_id FROM public.production_jobs WHERE project_id=project AND kind=p_job->>'kind' AND (status NOT IN ('finished','parked') OR v_request_key IS NOT NULL) AND ((v_target_id IS NOT NULL AND production_jobs.target_id=v_target_id) OR (v_target_key IS NOT NULL AND target_key=v_target_key)) ORDER BY created_at LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
 END IF;
 IF p_new_content IS NOT NULL AND v_target_id IS NULL THEN
  INSERT INTO public.content_items(project_id,title,stage,purpose_type,purpose,brief,created_by) VALUES(project,p_new_content->>'title','idea',coalesce(nullif(p_new_content->>'purpose_type',''),'teach'),CASE WHEN p_new_content ? 'studio' THEN 'From Content Studio' ELSE 'From Answer Bank' END,jsonb_build_object('summary',p_new_content->>'summary'),auth.uid()) RETURNING id INTO v_target_id;
  IF p_new_content ? 'format' THEN UPDATE public.content_items SET format=p_new_content->>'format' WHERE id=v_target_id; END IF;
  IF p_new_content ? 'studio' THEN PERFORM public.hq_studio_save(v_target_id,0,p_new_content->'studio'); END IF;
 END IF;
 INSERT INTO public.production_jobs(project_id,kind,title,target_type,target_id,target_key,recipe,run_state,level,money_destination,goal_text,goal_pillar_key,goal_kpi_key,status,current_step,created_by,result_links)
 VALUES(project,p_job->>'kind',p_job->>'title',v_target_type,v_target_id,v_target_key,p_job->'recipe',frozen,(p_job->>'level')::smallint,p_job->>'money_destination',nullif(p_job->>'goal_text',''),nullif(p_job->>'goal_pillar_key',''),nullif(p_job->>'goal_kpi_key',''),CASE WHEN p_steps->0->>'owner_kind'='owner' THEN 'ready' ELSE 'running' END,1,'owner','[]') RETURNING id INTO job_id;
 FOR step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
  n := n+1;
  INSERT INTO public.action_items(bar_id,venue_id,job_id,step_order,method_id,owner_kind,title,detail,facts,status,approval_status,priority,assignee,assignee_id,source,is_manual,created_by_id,due_date,depends_on)
  VALUES(project,project,job_id,n,(step->>'method_id')::uuid,step->>'owner_kind',step->>'title',step->>'detail',step->>'facts','Open',CASE WHEN step->>'owner_kind'='claude' THEN 'Auto' WHEN n=1 THEN 'Approved' ELSE 'Blocked' END,step->>'priority',step->>'assignee',CASE WHEN step->>'owner_kind'='owner' THEN auth.uid() ELSE NULL END,'pipeline',true,auth.uid(),(step->>'due_date')::date,previous_id) RETURNING id INTO step_id;
  previous_id := step_id;
  IF product_run THEN stage_key := (step->>'facts')::jsonb->>'stage_key'; stage_map := stage_map||jsonb_build_object(stage_key,step_id); END IF;
 END LOOP;
 IF product_run THEN UPDATE public.production_jobs SET run_state=jsonb_set(run_state,'{stage_steps}',stage_map) WHERE id=job_id; END IF;
 RETURN job_id;
END $$;
REVOKE ALL ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) TO authenticated,service_role;
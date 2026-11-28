CREATE OR REPLACE FUNCTION public.hq_product_run_outlets(r jsonb, state jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE s jsonb; result jsonb := '[]'; title text; k text; host text; opt jsonb; c jsonb;
BEGIN
 FOR s IN SELECT value FROM jsonb_array_elements(r->'stages') LOOP
  title := lower(s->>'title'); k := s->>'key';
  IF title !~ '^(publish|list it)' THEN CONTINUE; END IF;
  IF title LIKE '%paperback%' THEN result:=result||jsonb_build_array(jsonb_build_object('outlet','Paperback','stage',k,'primary',true,'twin',false)); END IF;
  IF title LIKE '%kindle%' THEN result:=result||jsonb_build_array(jsonb_build_object('outlet','Kindle','stage',k,'primary',false,'twin',false)); END IF;
  IF title LIKE '%etsy%' THEN result:=result||jsonb_build_array(jsonb_build_object('outlet','Etsy','stage',k,'primary',title LIKE '%twin%','twin',title LIKE '%twin%')); END IF;
  IF title LIKE '%payhip%' THEN result:=result||jsonb_build_array(jsonb_build_object('outlet','Payhip','stage',k,'primary',true,'twin',title LIKE '%twin%')); END IF;
  IF title LIKE '%brand site%' THEN result:=result||jsonb_build_array(jsonb_build_object('outlet','Brand site','stage',k,'primary',false,'twin',false)); END IF;
  IF title NOT LIKE '%paperback%' AND title NOT LIKE '%etsy%' AND title NOT LIKE '%payhip%' THEN
   host := 'Brand site';
   FOR c IN SELECT ch FROM jsonb_array_elements(r->'stages') st CROSS JOIN LATERAL jsonb_array_elements(st->'choices') ch WHERE ch->>'key'='host' LOOP
    FOR opt IN SELECT value FROM jsonb_array_elements(c->'options') LOOP
     IF opt->>'value'=coalesce((SELECT state->'stage_results'->(st->>'key')->'choices'->>'host' FROM jsonb_array_elements(r->'stages') st WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(st->'choices') cc WHERE cc->>'key'='host') LIMIT 1),(SELECT o->>'value' FROM jsonb_array_elements(c->'options') o WHERE o->>'recommended'='true' LIMIT 1)) THEN
      host:=CASE opt->>'value' WHEN 'own_engine' THEN 'Brand site' ELSE initcap(opt->>'value') END;
     END IF;
    END LOOP;
   END LOOP;
   result:=result||jsonb_build_array(jsonb_build_object('outlet',host,'stage',k,'primary',true,'twin',false),jsonb_build_object('outlet','Course access','stage',k,'primary',false,'twin',false));
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'upload_kit'->'fields') f WHERE lower(f->>'page') LIKE '%gumroad%') THEN
  SELECT st->>'key' INTO k FROM jsonb_array_elements(r->'stages') st WHERE lower(st->>'title') ~ '^(publish|list it)' LIMIT 1;
  result:=result||jsonb_build_array(jsonb_build_object('outlet','Gumroad','stage',k,'primary',false,'twin',false,'optional',true));
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.hq_product_run_outlets(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_product_run_outlets(jsonb,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.hq_product_run_event(p_job_id uuid,p_revision integer,p_stage_key text,p_action text,p_details jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE j public.production_jobs%ROWTYPE; a public.action_items%ROWTYPE; first_step uuid; r jsonb; s jsonb; state jsonb; old jsonb; res jsonb; choices jsonb; c jsonb; v jsonb; key text; complete boolean:=false; reopen boolean:=false; catalog jsonb; outlet jsonb; link text; listing uuid; output_text text; stage_id uuid; kit jsonb;
BEGIN
 SELECT * INTO j FROM public.production_jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR j.kind IS DISTINCT FROM 'product' OR j.target_type IS DISTINCT FROM 'channel_products' OR j.run_state->'product_template' IS NULL THEN RAISE EXCEPTION 'Product run not found'; END IF;
 IF NOT public.hq_studio_can_access(j.project_id) OR NOT (public.has_role(auth.uid(),'admin') OR public.user_can_manage_brand(j.project_id)) THEN RAISE EXCEPTION 'Only this brand manager or an admin can change this run'; END IF;
 state:=j.run_state; r:=state->'product_template'->'recipe';
 IF coalesce((state->>'revision')::integer,0) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'This run changed. Refresh before saving.'; END IF;
 stage_id:=(state->'stage_steps'->>p_stage_key)::uuid;
 SELECT * INTO a FROM public.action_items WHERE id=stage_id AND job_id=j.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown stage key'; END IF;
 SELECT value INTO s FROM jsonb_array_elements(r->'stages') WHERE value->>'key'=p_stage_key;
 IF s IS NULL THEN s:=jsonb_build_object('key',p_stage_key,'title',a.title,'owner',a.owner_kind,'choices','[]'::jsonb,'skip',jsonb_build_object('can_skip',false)); END IF;
 SELECT id INTO first_step FROM public.action_items WHERE job_id=j.id AND status<>'Done' ORDER BY step_order LIMIT 1;
 IF p_action NOT IN ('link','reopen') AND a.id IS DISTINCT FROM first_step THEN RAISE EXCEPTION 'Finish the current stage first'; END IF;
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>200000 THEN RAISE EXCEPTION 'Invalid stage details'; END IF;
 old:=coalesce(state->'stage_results'->p_stage_key,'{}'); res:=old;
 choices:=coalesce(old->'choices','{}');
 FOR c IN SELECT value FROM jsonb_array_elements(s->'choices') LOOP
  IF NOT choices ? (c->>'key') THEN
   SELECT value->'value' INTO v FROM jsonb_array_elements(coalesce(c->'options','[]')) WHERE value->>'recommended'='true' LIMIT 1;
   choices:=choices||jsonb_build_object(c->>'key',coalesce(v,'""'::jsonb));
  END IF;
 END LOOP;
 IF p_action='choose' THEN
  key:=p_details->>'choice'; v:=p_details->'value';
  SELECT value INTO c FROM jsonb_array_elements(s->'choices') WHERE value->>'key'=key;
  IF s->>'owner'<>'owner' OR c IS NULL OR v IS NULL THEN RAISE EXCEPTION 'Choose an available owner option'; END IF;
  IF jsonb_array_length(coalesce(c->'options','[]'))>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c->'options') o WHERE o->'value'=v) THEN RAISE EXCEPTION 'Invalid option'; END IF;
  choices:=choices||jsonb_build_object(key,v);
 ELSIF p_action='skip' THEN
  IF s->>'owner'<>'owner' OR s->'skip'->>'can_skip' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'This stage cannot be skipped'; END IF;
  res:=res||jsonb_build_object('status','skipped'); complete:=true;
 ELSIF p_action='approve' THEN
  IF s->>'owner'<>'owner' THEN RAISE EXCEPTION 'Record the agent output instead'; END IF;
  IF lower(s->>'title') ~ '^(publish|list it)' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.hq_product_run_outlets(r,state)) o JOIN public.product_listings l ON l.product_id=j.target_id AND l.outlet=o->>'outlet' WHERE o->>'stage'=p_stage_key AND o->>'primary'='true' AND l.status='listed' AND l.url ~ '^https?://[^/[:space:]]+') THEN RAISE EXCEPTION 'Save the primary live link first'; END IF;
  res:=res||jsonb_build_object('status','done'); complete:=true;
 ELSIF p_action='output' THEN
  IF s->>'owner'='owner' THEN RAISE EXCEPTION 'Owner stages need approval'; END IF;
  output_text:=nullif(btrim(p_details->>'output'),'');
  IF output_text IS NULL THEN RAISE EXCEPTION 'Add the output link or text'; END IF;
  res:=res||jsonb_build_object('output',output_text,'status','done'); complete:=true;
  kit:=p_details->'upload_kit';
  IF kit IS NOT NULL THEN
   IF jsonb_typeof(kit) IS DISTINCT FROM 'object' OR jsonb_typeof(kit->'fields') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Upload kit needs fields keyed by page::field'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_each(kit->'fields') f WHERE jsonb_typeof(f.value)<>'string' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'upload_kit'->'fields') ff WHERE (ff->>'page')||'::'||(ff->>'field')=f.key)) THEN RAISE EXCEPTION 'Unknown upload field or non-text value'; END IF;
   state:=jsonb_set(state,'{upload_kit}',kit);
  END IF;
 ELSIF p_action='reopen' THEN
  IF a.status<>'Done' THEN RAISE EXCEPTION 'Only finished stages can be reopened'; END IF;
  res:=res||jsonb_build_object('status','open'); reopen:=true;
 ELSIF p_action='link' THEN
  link:=btrim(p_details->>'url');
  IF link IS NULL OR length(link)>2000 OR link !~ '^https?://[^/@[:space:]]+(\.[^/@[:space:]]+|:[0-9]+)(/[^[:space:]]*)?$' THEN RAISE EXCEPTION 'Enter a full http or https URL'; END IF;
  catalog:=public.hq_product_run_outlets(r,state);
  SELECT value INTO outlet FROM jsonb_array_elements(catalog) WHERE value->>'outlet'=p_details->>'outlet' AND value->>'stage'=p_stage_key;
  IF outlet IS NULL THEN RAISE EXCEPTION 'This outlet is not in the frozen recipe'; END IF;
  SELECT id INTO listing FROM public.product_listings WHERE product_id=j.target_id AND product_listings.outlet=outlet->>'outlet' ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF listing IS NULL THEN
   INSERT INTO public.product_listings(product_id,outlet,status,url,listed_at,created_by) VALUES(j.target_id,outlet->>'outlet','listed',link,(now() AT TIME ZONE 'America/Los_Angeles')::date,auth.uid()) RETURNING id INTO listing;
  ELSE UPDATE public.product_listings SET url=link,status='listed',listed_at=(now() AT TIME ZONE 'America/Los_Angeles')::date WHERE id=listing; END IF;
  state:=jsonb_set(state,'{listings}',coalesce(state->'listings','{}')||jsonb_build_object(outlet->>'outlet',link));
  res:=res||jsonb_build_object('live_links',coalesce(res->'live_links','{}')||jsonb_build_object(outlet->>'outlet',link));
  IF outlet->>'primary'='true' AND coalesce(outlet->>'twin','false')<>'true' THEN UPDATE public.channel_products SET status='live',sales_page_url=link WHERE id=j.target_id AND status IS DISTINCT FROM 'twin_listed'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(catalog) o WHERE o->>'twin'='true') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(catalog) o WHERE o->>'twin'='true' AND NOT EXISTS(SELECT 1 FROM public.product_listings l WHERE l.product_id=j.target_id AND l.outlet=o->>'outlet' AND l.status='listed' AND l.url ~ '^https?://')) AND EXISTS(SELECT 1 FROM jsonb_array_elements(catalog) o JOIN public.product_listings l ON l.product_id=j.target_id AND l.outlet=o->>'outlet' WHERE o->>'primary'='true' AND o->>'twin'='false' AND l.status='listed' AND l.url ~ '^https?://') THEN UPDATE public.channel_products SET status='twin_listed' WHERE id=j.target_id; END IF;
  IF a.id=first_step AND outlet->>'primary'='true' THEN res:=res||jsonb_build_object('status','done'); complete:=true; END IF;
 ELSE RAISE EXCEPTION 'Unknown product run action'; END IF;
 res:=res||jsonb_build_object('choices',choices,'at',now(),'events',coalesce(old->'events','[]')||jsonb_build_array(jsonb_build_object('action',p_action,'details',p_details,'at',now(),'by',auth.uid())));
 state:=jsonb_set(state,'{stage_results}',coalesce(state->'stage_results','{}')||jsonb_build_object(p_stage_key,res));
 state:=jsonb_set(state,'{revision}',to_jsonb(p_revision+1));
 UPDATE public.production_jobs SET run_state=state,updated_at=now() WHERE id=j.id;
 IF complete THEN UPDATE public.action_items SET status='Done',output_url=CASE WHEN p_action='link' THEN link WHEN output_text ~ '^https?://' THEN output_text ELSE output_url END WHERE id=a.id; END IF;
 IF reopen THEN
  UPDATE public.action_items SET status='Open',approval_status=CASE WHEN owner_kind='claude' THEN 'Auto' ELSE 'Approved' END WHERE id=a.id;
  UPDATE public.production_jobs SET status=CASE WHEN a.owner_kind='claude' THEN 'running' ELSE 'ready' END,current_step=a.step_order WHERE id=j.id;
 END IF;
 RETURN state;
END $$;
REVOKE ALL ON FUNCTION public.hq_product_run_event(uuid,integer,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_product_run_event(uuid,integer,text,text,jsonb) TO authenticated;

DROP INDEX IF EXISTS public.idx_content_items_daily_post_unique;
CREATE UNIQUE INDEX idx_content_items_daily_post_unique ON public.content_items(project_id,due_date,(coalesce(nullif(brief->'daily_post'->>'piece',''),'main'))) WHERE purpose_type='daily_post' AND due_date IS NOT NULL;
ALTER TABLE public.content_placements DROP CONSTRAINT content_placements_channel_check;
ALTER TABLE public.content_placements ADD CONSTRAINT content_placements_channel_check CHECK(channel IN ('instagram','facebook','pinterest','tiktok','youtube','blog','email','x','linkedin','google','other','threads'));
CREATE OR REPLACE FUNCTION public.hq_daily_post_sync(_item_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.content_items%ROWTYPE; all_posted boolean; channels text[]; t timestamptz:=now();
BEGIN
 SELECT * INTO c FROM public.content_items WHERE id=_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
 SELECT count(*)>0 AND bool_and(status='published' OR nullif(receipt->>'posted_no_link_at','') IS NOT NULL),array_agg(channel) INTO all_posted,channels FROM public.content_placements WHERE content_item_id=c.id;
 IF all_posted THEN
  IF c.purpose_type='daily_post' THEN UPDATE public.content_items SET published_at=coalesce(published_at,t),brief=jsonb_set(coalesce(brief,'{}')||jsonb_build_object('daily_post',coalesce(brief->'daily_post','{}')),'{daily_post,post_status}','"posted"') WHERE id=c.id;
  ELSE UPDATE public.content_items SET published_at=coalesce(published_at,t) WHERE id=c.id; END IF;
 END IF;
 UPDATE public.agent_handoffs h SET content_item_id=coalesce(h.content_item_id,c.id),result=coalesce(h.result,'{}')||jsonb_build_object(
  'published',coalesce((SELECT jsonb_agg(e) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.result->'published')='array' THEN h.result->'published' ELSE '[]' END) e WHERE NOT (lower(coalesce(e->>'platform',''))=ANY(channels))),'[]')||coalesce((SELECT jsonb_agg(jsonb_build_object('platform',pl.channel,'url',pl.live_url,'posted_at',pl.verified_at,'by',pl.receipt->>'verified_by_user_id')) FROM public.content_placements pl WHERE pl.content_item_id=c.id AND pl.status='published' AND pl.live_url IS NOT NULL),'[]'),
  'posted_no_link',coalesce((SELECT jsonb_agg(e) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.result->'posted_no_link')='array' THEN h.result->'posted_no_link' ELSE '[]' END) e WHERE NOT (lower(coalesce(e->>'platform',''))=ANY(channels))),'[]')||coalesce((SELECT jsonb_agg(jsonb_build_object('platform',pl.channel,'posted_at',pl.receipt->>'posted_no_link_at','by',pl.receipt->>'posted_no_link_by')) FROM public.content_placements pl WHERE pl.content_item_id=c.id AND pl.status<>'published' AND nullif(pl.receipt->>'posted_no_link_at','') IS NOT NULL),'[]'))
 WHERE h.spec->>'type'='social_post' AND (h.content_item_id=c.id OR h.id::text=nullif(c.brief->'daily_post'->>'handoff_id','') OR (h.content_item_id IS NULL AND c.project_id=ANY(h.brand_ids) AND h.spec->>'post_date'=c.due_date::text AND coalesce(nullif(h.spec->>'piece',''),'main')=coalesce(nullif(c.brief->'daily_post'->>'piece',''),'main')));
 RETURN coalesce(all_posted,false);
END $$;
REVOKE ALL ON FUNCTION public.hq_daily_post_sync(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.hq_upsert_daily_post(_p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE brand uuid; day date; piece_key text; c public.content_items%ROWTYPE; p public.content_placements%ROWTYPE; item uuid; was_created boolean:=false; dp jsonb; br jsonb; entry jsonb; rec jsonb; k text; ch text; key_text text; next_status text; url text; results jsonb:='[]';
BEGIN
 IF coalesce(auth.role(),'') IN ('authenticated','anon') OR (current_user NOT IN ('postgres','supabase_admin') AND coalesce(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'Database owner or service role required'; END IF;
 IF jsonb_typeof(_p) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Payload must be an object'; END IF;
 brand:=(_p->>'brand_id')::uuid;
 IF brand IS NULL OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=brand) THEN RAISE EXCEPTION 'brand_id is required and must name a brand'; END IF;
 IF coalesce(_p->>'post_date','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'post_date must be YYYY-MM-DD'; END IF;
 day:=(_p->>'post_date')::date;
 IF nullif(btrim(_p->>'title'),'') IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;
 piece_key:=coalesce(nullif(btrim(_p->>'piece'),''),'main');
 IF length(piece_key)>80 THEN RAISE EXCEPTION 'piece must be a short key'; END IF;
 IF _p ? 'format' AND _p->>'format' IS NOT NULL AND _p->>'format' NOT IN ('carousel','post','short') THEN RAISE EXCEPTION 'Unsupported daily post format'; END IF;
 IF _p ? 'made_by' AND _p->>'made_by' IS NOT NULL AND _p->>'made_by' NOT IN ('claude','muse','chatgpt') THEN RAISE EXCEPTION 'Invalid made_by'; END IF;
 IF _p ? 'purpose' AND _p->>'purpose' IS NOT NULL AND _p->>'purpose' NOT IN ('teach','entertain','story','community','proof','offer') THEN RAISE EXCEPTION 'Invalid purpose'; END IF;
 IF _p ? 'post_status' AND _p->>'post_status' IS NOT NULL AND _p->>'post_status' NOT IN ('ready','almost_ready','waiting_on_owner','scheduled','posted') THEN RAISE EXCEPTION 'Invalid post_status'; END IF;
 FOREACH k IN ARRAY ARRAY['quality_fails','media','placements'] LOOP IF _p ? k AND _p->k<>'null' AND jsonb_typeof(_p->k)<>'array' THEN RAISE EXCEPTION '% must be an array',k; END IF; END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(brand::text||':'||day::text,0));
 SELECT * INTO c FROM public.content_items WHERE project_id=brand AND due_date=day AND purpose_type='daily_post' AND coalesce(nullif(brief->'daily_post'->>'piece',''),'main')=piece_key FOR UPDATE;
 item:=c.id; was_created:=item IS NULL;
 br:=coalesce(c.brief,'{}'); dp:=coalesce(br->'daily_post','{}')||jsonb_build_object('piece',piece_key);
 FOREACH k IN ARRAY ARRAY['made_by','purpose','post_status','waiting_reason','waiting_detail','almost_ready_detail','scored_by','drive_folder_url','post_this_doc_url','handoff_id','media'] LOOP IF _p ? k THEN dp:=dp||jsonb_build_object(k,_p->k); END IF; END LOOP;
 IF _p ? 'post_status' THEN dp:=dp||jsonb_build_object('waiting_reason',_p->'waiting_reason','waiting_detail',_p->'waiting_detail','almost_ready_detail',_p->'almost_ready_detail'); END IF;
 IF _p ? 'scored_by' THEN dp:=dp||jsonb_build_object('scored_at',CASE WHEN _p->>'scored_by' IS NULL THEN NULL ELSE to_jsonb(now()) END); END IF;
 br:=br||jsonb_build_object('daily_post',dp);
 IF was_created THEN
  INSERT INTO public.content_items(project_id,due_date,title,purpose_type,stage,format,brief,quality_score,quality_notes,quality_fails) VALUES(brand,day,btrim(_p->>'title'),'daily_post','ready',_p->>'format',br,(_p->>'quality_score')::numeric,_p->>'quality_notes',CASE WHEN jsonb_typeof(_p->'quality_fails')='array' THEN ARRAY(SELECT jsonb_array_elements_text(_p->'quality_fails')) ELSE NULL END) RETURNING id INTO item;
 ELSE
  UPDATE public.content_items SET title=btrim(_p->>'title'),brief=br,format=CASE WHEN _p ? 'format' THEN _p->>'format' ELSE format END,quality_score=CASE WHEN _p ? 'quality_score' THEN (_p->>'quality_score')::numeric ELSE quality_score END,quality_notes=CASE WHEN _p ? 'quality_notes' THEN _p->>'quality_notes' ELSE quality_notes END,quality_fails=CASE WHEN _p ? 'quality_fails' THEN CASE WHEN jsonb_typeof(_p->'quality_fails')='array' THEN ARRAY(SELECT jsonb_array_elements_text(_p->'quality_fails')) ELSE NULL END ELSE quality_fails END WHERE id=item;
 END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_p->'placements')='array' THEN _p->'placements' ELSE '[]' END) LOOP
  ch:=entry->>'channel';
  IF ch IS NULL OR ch NOT IN ('instagram','facebook','pinterest','tiktok','youtube','blog','email','x','linkedin','google','other','threads') THEN RAISE EXCEPTION 'Invalid placement channel'; END IF;
  SELECT * INTO p FROM public.content_placements WHERE content_item_id=item AND channel=ch ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF p.status='published' THEN results:=results||jsonb_build_array(jsonb_build_object('channel',ch,'id',p.id,'status',p.status)); CONTINUE; END IF;
  next_status:=CASE WHEN entry ? 'status' THEN entry->>'status' ELSE coalesce(p.status,'planned') END;
  IF next_status IS NULL OR next_status NOT IN ('planned','scheduled','published') THEN RAISE EXCEPTION 'Invalid placement status'; END IF;
  url:=CASE WHEN entry ? 'live_url' THEN nullif(btrim(entry->>'live_url'),'') ELSE p.live_url END;
  IF url IS NOT NULL AND url !~* '^https?://[^/[:space:]]+' THEN RAISE EXCEPTION 'live_url must be a full http or https URL'; END IF;
  IF next_status='published' AND url IS NULL THEN RAISE EXCEPTION 'Published needs live_url'; END IF;
  rec:=coalesce(p.receipt,'{}');
  FOREACH k IN ARRAY ARRAY['caption','hashtags','first_comment','notes'] LOOP IF entry ? k THEN rec:=rec||jsonb_build_object(k,entry->k); END IF; END LOOP;
  IF url IS NOT NULL AND (next_status='published' OR nullif(rec->>'posted_no_link_at','') IS NOT NULL) THEN next_status:='published'; rec:=rec||jsonb_build_object('verified_by','agent'); END IF;
  key_text:='daily:'||brand||':'||day||':'||CASE WHEN piece_key='main' THEN '' ELSE piece_key||':' END||ch;
  IF p.id IS NULL THEN
   INSERT INTO public.content_placements(content_item_id,project_id,channel,account_label,status,scheduled_for,live_url,verified_at,receipt,idempotency_key) VALUES(item,brand,ch,entry->>'account_label',next_status,(entry->>'scheduled_for')::timestamptz,url,CASE WHEN next_status='published' THEN now() END,rec,key_text) RETURNING * INTO p;
  ELSE
   UPDATE public.content_placements SET account_label=CASE WHEN entry ? 'account_label' THEN entry->>'account_label' ELSE account_label END,status=next_status,scheduled_for=CASE WHEN entry ? 'scheduled_for' THEN (entry->>'scheduled_for')::timestamptz ELSE scheduled_for END,live_url=url,verified_at=CASE WHEN next_status='published' THEN now() ELSE verified_at END,receipt=rec WHERE id=p.id RETURNING * INTO p;
  END IF;
  results:=results||jsonb_build_array(jsonb_build_object('channel',ch,'id',p.id,'status',p.status));
 END LOOP;
 IF _p->>'post_status'='posted' AND (NOT EXISTS(SELECT 1 FROM public.content_placements WHERE content_item_id=item) OR EXISTS(SELECT 1 FROM public.content_placements WHERE content_item_id=item AND status<>'published' AND nullif(receipt->>'posted_no_link_at','') IS NULL)) THEN RAISE EXCEPTION 'Every platform must be posted'; END IF;
 PERFORM public.hq_daily_post_sync(item);
 RETURN jsonb_build_object('content_item_id',item,'created',was_created,'placements',results);
END $$;
REVOKE ALL ON FUNCTION public.hq_upsert_daily_post(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hq_upsert_daily_post(jsonb) TO service_role;
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.hq_mark_drive_daily_post_posted(uuid,uuid,date,text,jsonb,text,text,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'''x'',''other''','''x'',''threads'',''other''');
 definition:=replace(definition,$old$purpose_type='daily_post'$old$,$new$purpose_type='daily_post' AND coalesce(nullif(brief->'daily_post'->>'piece',''),'main')='main'$new$);
 EXECUTE definition;
END $$;
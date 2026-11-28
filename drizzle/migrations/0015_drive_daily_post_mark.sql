CREATE OR REPLACE FUNCTION public.hq_mark_daily_post_posted(_placement_id uuid, _live_url text DEFAULT NULL, _note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.content_placements%ROWTYPE; c public.content_items%ROWTYPE; u text:=nullif(btrim(coalesce(_live_url,'')),''); n text:=nullif(btrim(coalesce(_note,'')),''); t timestamptz:=now(); remaining int;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO p FROM public.content_placements WHERE id=_placement_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Placement not found'; END IF;
 IF NOT (public.has_role(auth.uid(),'admin') OR public.user_can_access_project(p.project_id)) THEN RAISE EXCEPTION 'Not authorized for this brand'; END IF;
 SELECT * INTO c FROM public.content_items WHERE id=p.content_item_id;
 IF NOT FOUND OR c.purpose_type IS DISTINCT FROM 'daily_post' THEN RAISE EXCEPTION 'Only daily post placements can use this action'; END IF;
 IF u IS NULL THEN
 UPDATE public.content_placements SET status=CASE WHEN status='published' THEN status ELSE 'scheduled' END,receipt=coalesce(receipt,'{}')||jsonb_build_object('posted_no_link_at',t,'posted_no_link_by',auth.uid(),'posted_no_link_note',coalesce(n,'Posted by hand — link not pasted yet')) WHERE id=p.id;
 RETURN jsonb_build_object('status','scheduled','no_link_noted',true);
 END IF;
 IF u !~* '^https?://' THEN RAISE EXCEPTION 'Paste a full link starting with https://'; END IF;
 UPDATE public.content_placements SET status='published',live_url=u,verified_at=t,receipt=coalesce(receipt,'{}')||jsonb_build_object('verified_by','person','verified_by_user_id',auth.uid(),'verified_note',n) WHERE id=p.id;
 SELECT count(*) INTO remaining FROM public.content_placements WHERE content_item_id=c.id AND status<>'published';
 IF remaining=0 THEN UPDATE public.content_items SET published_at=coalesce(published_at,t),brief=jsonb_set(coalesce(brief,'{}'),'{daily_post,post_status}','"posted"',true) WHERE id=c.id; END IF;
 UPDATE public.agent_handoffs h SET content_item_id=coalesce(h.content_item_id,c.id),result=coalesce(h.result,'{}')||jsonb_build_object('published',coalesce((SELECT jsonb_agg(e) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.result->'published')='array' THEN h.result->'published' ELSE '[]'::jsonb END) e WHERE lower(coalesce(e->>'platform',''))<>lower(p.channel)),'[]'::jsonb)||jsonb_build_array(jsonb_build_object('platform',p.channel,'url',u,'marked_at',t,'marked_by',auth.uid())))
 WHERE h.spec->>'type'='social_post' AND c.project_id=ANY(h.brand_ids) AND h.spec->>'post_date'=c.due_date::text;
 RETURN jsonb_build_object('status','published','live_url',u,'verified_at',t,'all_posted',remaining=0);
END $$;
CREATE OR REPLACE FUNCTION public.hq_mark_drive_daily_post_posted(_actor_id uuid,_project_id uuid,_post_date date,_folder_id text,_snapshot jsonb,_channel text,_live_url text DEFAULT NULL,_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item_id uuid; placement_id uuid; brand_name text; result jsonb;
BEGIN
 -- Only the authenticated private file service may attest a checked folder snapshot.
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Private file service required'; END IF;
 IF _actor_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor_id) THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',_actor_id,'role','authenticated')::text,true);
 IF NOT public.user_can_access_project(_project_id) THEN RAISE EXCEPTION 'Not authorized for this brand'; END IF;
 IF _folder_id !~ '^[A-Za-z0-9_-]{5,200}$' OR _channel NOT IN ('instagram','facebook','tiktok','google','linkedin','youtube','pinterest','x','other') OR jsonb_typeof(_snapshot)<>'object' THEN RAISE EXCEPTION 'Invalid post folder'; END IF;
 -- Serialize with other phone actions; uniqueness also protects against agent inserts.
 PERFORM pg_advisory_xact_lock(hashtextextended(_project_id::text||':'||_post_date::text,0));
 SELECT id INTO item_id FROM public.content_items WHERE project_id=_project_id AND due_date=_post_date AND purpose_type='daily_post';
 IF item_id IS NULL THEN
 SELECT name INTO brand_name FROM public.venues WHERE id=_project_id;
 INSERT INTO public.content_items(project_id,title,purpose_type,stage,due_date,created_by,brief) VALUES(_project_id,brand_name||' — '||_post_date,'daily_post','ready',_post_date,_actor_id,jsonb_build_object('daily_post',jsonb_build_object('post_status','ready','drive_folder_url','https://drive.google.com/drive/folders/'||_folder_id,'post_this_doc_url',_snapshot->'post_this_doc_url','media',coalesce(_snapshot->'media','[]'),'source','drive')))
 ON CONFLICT DO NOTHING RETURNING id INTO item_id;
 IF item_id IS NULL THEN SELECT id INTO item_id FROM public.content_items WHERE project_id=_project_id AND due_date=_post_date AND purpose_type='daily_post'; END IF;
 END IF;
 SELECT id INTO placement_id FROM public.content_placements WHERE content_item_id=item_id AND channel=_channel ORDER BY created_at LIMIT 1;
 IF placement_id IS NULL THEN
 INSERT INTO public.content_placements(content_item_id,project_id,channel,status,receipt,idempotency_key) VALUES(item_id,_project_id,_channel,'planned',jsonb_build_object('caption',coalesce(_snapshot->>'caption','')),'daily:'||_project_id||':'||_post_date||':'||_channel)
 ON CONFLICT DO NOTHING RETURNING id INTO placement_id;
 IF placement_id IS NULL THEN SELECT id INTO placement_id FROM public.content_placements WHERE content_item_id=item_id AND channel=_channel ORDER BY created_at LIMIT 1; END IF;
 END IF;
 IF placement_id IS NULL THEN RAISE EXCEPTION 'Could not save the post'; END IF;
 result:=public.hq_mark_daily_post_posted(placement_id,_live_url,_note);
 RETURN result||jsonb_build_object('content_item_id',item_id,'placement_id',placement_id);
END $$;
REVOKE ALL ON FUNCTION public.hq_mark_drive_daily_post_posted(uuid,uuid,date,text,jsonb,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hq_mark_drive_daily_post_posted(uuid,uuid,date,text,jsonb,text,text,text) TO service_role;
COMMENT ON FUNCTION public.hq_mark_drive_daily_post_posted(uuid,uuid,date,text,jsonb,text,text,text) IS 'Server-only checked Drive folder snapshot; creates on Mark posted, then delegates to the shared person-verified posting action.';
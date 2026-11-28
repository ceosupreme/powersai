CREATE OR REPLACE FUNCTION public.hq_mark_daily_post_posted(_placement_id uuid,_live_url text DEFAULT NULL,_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.content_placements%ROWTYPE; c public.content_items%ROWTYPE; u text:=nullif(btrim(_live_url),''); t timestamptz:=now(); rec jsonb; all_posted boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO p FROM public.content_placements WHERE id=_placement_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Placement not found'; END IF;
 IF NOT (public.has_role(auth.uid(),'admin') OR public.user_can_manage_brand(p.project_id)) THEN RAISE EXCEPTION 'Not authorized to post for this brand'; END IF;
 SELECT * INTO c FROM public.content_items WHERE id=p.content_item_id FOR UPDATE;
 IF c.purpose_type IS DISTINCT FROM 'daily_post' THEN
  IF c.approved_at IS NULL THEN RAISE EXCEPTION 'Approve this finished Board piece first'; END IF;
  IF c.format IN ('article','email','community') THEN
   IF c.stage NOT IN ('script','scheduled','published') OR length(btrim(coalesce(nullif(c.brief->>'script',''),nullif(c.brief->>'body',''),nullif(c.brief->>'text',''),nullif(c.brief->>'content',''),nullif(c.brief->>'full_text',''),nullif(c.brief->>'caption',''),'')))=0 THEN RAISE EXCEPTION 'Finish this Board piece first'; END IF;
  ELSE
   IF c.stage NOT IN ('design','thumbnail','scheduled','published') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(c.brief->'asset_urls')='array' THEN c.brief->'asset_urls' ELSE '[]' END) a WHERE a ~ '^https?://') THEN RAISE EXCEPTION 'Finish this Board piece first'; END IF;
  END IF;
 END IF;
 IF p.status='published' THEN RETURN jsonb_build_object('status',p.status,'content_item_id',c.id,'placement_id',p.id,'live_url',p.live_url); END IF;
 rec:=coalesce(p.receipt,'{}');
 IF u IS NOT NULL THEN
  IF u !~* '^https?://[^/[:space:]]+' THEN RAISE EXCEPTION 'Paste a full live link'; END IF;
  UPDATE public.content_placements SET status='published',live_url=u,verified_at=t,receipt=rec||jsonb_build_object('verified_by','person','verified_by_user_id',auth.uid(),'verified_note',_note) WHERE id=p.id;
 ELSE
  IF nullif(rec->>'posted_no_link_at','') IS NULL THEN
   rec:=rec||jsonb_build_object('posting_undo',jsonb_build_object('status',p.status,'live_url',p.live_url,'verified_at',p.verified_at,'receipt',p.receipt,'published_at',c.published_at,'post_status',c.brief->'daily_post'->'post_status'),'posted_no_link_at',t,'posted_no_link_by',auth.uid(),'posted_no_link_note',coalesce(_note,'Posted by hand — link pending'));
   UPDATE public.content_placements SET receipt=rec WHERE id=p.id;
  END IF;
 END IF;
 all_posted:=public.hq_daily_post_sync(c.id);
 RETURN jsonb_build_object('status',CASE WHEN u IS NULL THEN p.status ELSE 'published' END,'posted',true,'no_link_noted',u IS NULL,'undo_at',CASE WHEN u IS NULL THEN rec->>'posted_no_link_at' END,'content_item_id',c.id,'placement_id',p.id,'all_posted',all_posted);
END $$;
REVOKE ALL ON FUNCTION public.hq_mark_daily_post_posted(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_mark_daily_post_posted(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.hq_undo_daily_post(_placement_id uuid,_posted_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.content_placements%ROWTYPE; c public.content_items%ROWTYPE; prev jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO p FROM public.content_placements WHERE id=_placement_id FOR UPDATE;
 IF NOT FOUND OR NOT (public.has_role(auth.uid(),'admin') OR public.user_can_manage_brand(p.project_id)) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p.status='published' OR p.receipt->>'posted_no_link_by' IS DISTINCT FROM auth.uid()::text OR (p.receipt->>'posted_no_link_at')::timestamptz IS DISTINCT FROM _posted_at OR p.receipt->'posting_undo' IS NULL THEN RAISE EXCEPTION 'This posting receipt changed; it cannot be undone'; END IF;
 prev:=p.receipt->'posting_undo';
 SELECT * INTO c FROM public.content_items WHERE id=p.content_item_id FOR UPDATE;
 UPDATE public.content_placements SET status=prev->>'status',live_url=prev->>'live_url',verified_at=(prev->>'verified_at')::timestamptz,receipt=prev->'receipt' WHERE id=p.id;
 IF c.purpose_type='daily_post' THEN UPDATE public.content_items SET published_at=(prev->>'published_at')::timestamptz,brief=jsonb_set(brief,'{daily_post,post_status}',coalesce(prev->'post_status','"ready"')) WHERE id=c.id;
 ELSE UPDATE public.content_items SET published_at=(prev->>'published_at')::timestamptz WHERE id=c.id; END IF;
 PERFORM public.hq_daily_post_sync(c.id);
 RETURN jsonb_build_object('undone',true,'content_item_id',c.id,'placement_id',p.id);
END $$;
REVOKE ALL ON FUNCTION public.hq_undo_daily_post(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_undo_daily_post(uuid,timestamptz) TO authenticated;
DO $migration$
DECLARE definition text; marker text := ' SELECT id INTO placement_id FROM public.content_placements WHERE content_item_id=item_id AND channel=_channel ORDER BY created_at LIMIT 1;'; addition text := $addition$
 -- Only platforms explicitly present in the checked Drive document are prepared.
 INSERT INTO public.content_placements(content_item_id,project_id,channel,status,receipt,idempotency_key)
 SELECT item_id,_project_id,entry->>'channel','planned',jsonb_build_object('caption',entry->>'caption'),'daily:'||_project_id||':'||_post_date||':'||(entry->>'channel')
 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_snapshot->'captions')='array' THEN _snapshot->'captions' ELSE '[]'::jsonb END) entry
 WHERE entry->>'channel' IN ('instagram','facebook','tiktok','google','linkedin','youtube','pinterest','x','other') AND nullif(btrim(entry->>'caption'),'') IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.content_placements existing WHERE existing.content_item_id=item_id AND existing.channel=entry->>'channel')
 ON CONFLICT DO NOTHING;
$addition$;
BEGIN
 SELECT pg_get_functiondef('public.hq_mark_drive_daily_post_posted(uuid,uuid,date,text,jsonb,text,text,text)'::regprocedure) INTO definition;
 IF position(marker IN definition)=0 THEN RAISE EXCEPTION 'Expected Mark posted definition not found'; END IF;
 EXECUTE replace(definition,marker,addition||marker);
END $migration$;
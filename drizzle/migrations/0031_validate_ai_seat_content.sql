CREATE FUNCTION public.ai_seat_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE k text; x jsonb;
BEGIN
 IF NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid category slug'; END IF;
 FOREACH k IN ARRAY ARRAY['answer_listings','market_facts','why_points','ninety_days','included','requirements','angles','faqs'] LOOP
  IF jsonb_typeof(to_jsonb(NEW)->k) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION '% must be an array',k; END IF;
 END LOOP;
 IF jsonb_typeof(NEW.labels) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'labels must be an object'; END IF;
 FOR x IN SELECT value FROM jsonb_each(NEW.labels) LOOP IF jsonb_typeof(x) <> 'string' THEN RAISE EXCEPTION 'labels values must be text'; END IF; END LOOP;
 FOREACH k IN ARRAY ARRAY['included','requirements'] LOOP
  FOR x IN SELECT value FROM jsonb_array_elements(to_jsonb(NEW)->k) LOOP IF jsonb_typeof(x) <> 'string' THEN RAISE EXCEPTION '% entries must be text',k; END IF; END LOOP;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['answer_listings','market_facts','why_points','ninety_days','angles','faqs'] LOOP
  FOR x IN SELECT value FROM jsonb_array_elements(to_jsonb(NEW)->k) LOOP
   IF jsonb_typeof(x) <> 'object' THEN RAISE EXCEPTION '% entries must be objects',k; END IF;
   IF k='answer_listings' AND (jsonb_typeof(x->'name') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'description') IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Listings need name and description'; END IF;
   IF k IN ('why_points','ninety_days','angles') AND (jsonb_typeof(x->'title') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'body') IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Points need title and body'; END IF;
   IF k='angles' AND (jsonb_typeof(x->'key') IS DISTINCT FROM 'string' OR nullif(x->>'key','') IS NULL) THEN RAISE EXCEPTION 'Angles need a key'; END IF;
   IF k='faqs' AND (jsonb_typeof(x->'question') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'answer') IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'FAQs need question and answer'; END IF;
   IF k='market_facts' AND (jsonb_typeof(x->'figure') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'label') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'source_name') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'source_url') IS DISTINCT FROM 'string' OR x->>'source_url' !~ '^https://') THEN RAISE EXCEPTION 'Facts need figure, label, source_name, and an HTTPS source_url'; END IF;
  END LOOP;
 END LOOP;
 IF NEW.status='published' THEN
  IF trim(NEW.headline)='' OR trim(NEW.meta_title)='' OR trim(NEW.meta_description)='' THEN RAISE EXCEPTION 'Published pages need headline, meta_title and meta_description'; END IF;
  IF jsonb_array_length(NEW.answer_listings) <> 3 THEN RAISE EXCEPTION 'Published pages need three generic answer listings'; END IF;
  FOREACH k IN ARRAY ARRAY['assistant','illustration','missing','goal','practice','before','after','cta','waitlist','submit','success','error'] LOOP
   IF coalesce(trim(NEW.labels->>k),'')='' THEN RAISE EXCEPTION 'Published pages need labels.%', k; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ai_seat_pages_validate BEFORE INSERT OR UPDATE ON public.ai_seat_pages FOR EACH ROW EXECUTE FUNCTION public.ai_seat_validate();
CREATE FUNCTION public.ai_seat_town_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE x jsonb; BEGIN
 IF NEW.town_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid town slug'; END IF;
 IF jsonb_typeof(NEW.procedures) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'procedures must be an array'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(NEW.procedures) LOOP IF jsonb_typeof(x) <> 'string' THEN RAISE EXCEPTION 'procedures entries must be text'; END IF; END LOOP;
 RETURN NEW; END $$;
CREATE TRIGGER ai_seat_availability_validate BEFORE INSERT OR UPDATE ON public.ai_seat_availability FOR EACH ROW EXECUTE FUNCTION public.ai_seat_town_validate();
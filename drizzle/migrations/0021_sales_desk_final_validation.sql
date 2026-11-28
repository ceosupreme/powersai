CREATE OR REPLACE FUNCTION public.hq_lead_time_sync() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.time_zone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.time_zone) THEN RAISE EXCEPTION 'A valid time zone is required'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.next_try_at IS NOT NULL THEN NEW.next_follow_up:=(NEW.next_try_at AT TIME ZONE 'America/Los_Angeles')::date;
  ELSIF NEW.next_follow_up IS NOT NULL THEN NEW.next_try_at:=(NEW.next_follow_up+time '09:00') AT TIME ZONE NEW.time_zone; END IF;
 ELSIF NEW.next_try_at IS DISTINCT FROM OLD.next_try_at THEN NEW.next_follow_up:=(NEW.next_try_at AT TIME ZONE 'America/Los_Angeles')::date;
 ELSIF NEW.next_follow_up IS DISTINCT FROM OLD.next_follow_up THEN NEW.next_try_at:=(NEW.next_follow_up+time '09:00') AT TIME ZONE NEW.time_zone; END IF;
 RETURN NEW;
END $$;
DO $repair$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_log_result(uuid,text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'IF p_result=''voicemail'' AND a<>(c->>''voicemail_try'')::int','IF p_result=''voicemail'' AND (p.preview_by IS NOT NULL OR a<>(c->>''voicemail_try'')::int)');
 body:=replace(body,'ELSIF a>=(c->>''max_tries'')::int THEN','ELSIF a>=(c->>''max_tries'')::int AND p.last_contacted_at IS NULL THEN');
 body:=replace(body,'greatest(1,(c->>''max_tries'')::int-1))::int-ceil','greatest(1,(c->>''max_tries'')::int-1))::int-ceil');
 body:=replace(body,'contact_name=p_details->>''owner_name'',text_ok=true','contact_name=p_details->>''owner_name'',phone=p_details->>''owner_cell'',text_ok=true');
 body:=replace(body,'nxt:=(p_details->>''promised_at'')::timestamptz;','IF public.hq_normalize_phone(p_details->>''owner_cell'') IS NULL OR p_details->>''photos'' NOT IN (''from Google'',''they will send'') OR p_details->>''google_link'' !~ ''^https://[^[:space:]]+$'' THEN RAISE EXCEPTION ''A valid owner cell, listing link and photo choice are required''; END IF; nxt:=(p_details->>''promised_at'')::timestamptz;');
 body:=replace(body,'UPDATE public.prospects SET intro_call=p_details,','IF public.hq_normalize_email(p_details->>''email'') IS NULL OR public.hq_normalize_phone(p_details->>''phone'') IS NULL THEN RAISE EXCEPTION ''A valid intro phone and email are required''; END IF; UPDATE public.prospects SET intro_call=p_details,');
 body:=replace(body,'IF p_details->>''reason'' NOT IN','IF p_details->>''reason'' IS NULL OR p_details->>''reason'' NOT IN');
 EXECUTE body;
END $repair$;
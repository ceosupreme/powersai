DO $repair$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_log_result(uuid,text,jsonb)'::regprocedure) INTO body;
 IF position('day_gap:=ceil((c->>''window_days'')::numeric/greatest(1,(c->>''max_tries'')::int-1))::int;' IN body)=0 THEN RAISE EXCEPTION 'Unexpected sales cadence definition'; END IF;
 body:=replace(body,'day_gap:=ceil((c->>''window_days'')::numeric/greatest(1,(c->>''max_tries'')::int-1))::int;','day_gap:=ceil((c->>''window_days'')::numeric*a/greatest(1,(c->>''max_tries'')::int-1))::int-ceil((c->>''window_days'')::numeric*(a-1)/greatest(1,(c->>''max_tries'')::int-1))::int;');
 body:=replace(body,'nxt:=(p_details->>''promised_at'')::timestamptz;','nxt:=(p_details->>''promised_at'')::timestamptz; IF nxt<=now() OR (nxt AT TIME ZONE p.time_zone)::time >= (c->>''quiet_start'')::time OR (nxt AT TIME ZONE p.time_zone)::time < (c->>''quiet_end'')::time THEN RAISE EXCEPTION ''Choose a future preview time outside quiet hours''; END IF;');
 EXECUTE body;
 SELECT pg_get_functiondef('public.hq_lead_stale_sweep()'::regprocedure) INTO body;
 body:=replace(body,'FROM public.prospects p WHERE p.preview_job_id=h.id AND p.preview_link IS NULL AND p.preview_promised_at-interval ''2 hours''<=now()','FROM public.prospects preview_lead WHERE preview_lead.preview_job_id=h.id AND preview_lead.preview_link IS NULL AND preview_lead.preview_promised_at-interval ''2 hours''<=now()');
 body:=replace(body,'''Preview link overdue: ''||p.business_name','''Preview link overdue: ''||preview_lead.business_name');
 EXECUTE body;
END $repair$;
CREATE OR REPLACE FUNCTION public.hq_lead_sales_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.working_by IS NOT NULL OR NEW.text_ok IS TRUE OR NEW.won_confirmed_at IS NOT NULL OR NEW.won_package_id IS NOT NULL OR NEW.pending_close IS NOT NULL OR NEW.pay_level IS NOT NULL OR NEW.status IN ('won','dead') OR NEW.preview_by IS NOT NULL OR NEW.closed_by IS NOT NULL THEN RAISE EXCEPTION 'Use the checked sales action'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.working_by,NEW.working_until,NEW.attempt_count,NEW.text_ok,NEW.text_ok_at,NEW.text_ok_by,NEW.preview_by,NEW.preview_job_id,NEW.preview_link,NEW.preview_answers,NEW.preview_promised_at,NEW.booked_by,NEW.intro_call,NEW.closed_by,NEW.pending_close,NEW.won_confirmed_at,NEW.won_confirmed_by,NEW.won_package_id,NEW.won_setup_amount,NEW.won_monthly_amount,NEW.pay_level,NEW.client_cancelled_at,NEW.refund_amount,NEW.refund_note)
 IS DISTINCT FROM ROW(OLD.working_by,OLD.working_until,OLD.attempt_count,OLD.text_ok,OLD.text_ok_at,OLD.text_ok_by,OLD.preview_by,OLD.preview_job_id,OLD.preview_link,OLD.preview_answers,OLD.preview_promised_at,OLD.booked_by,OLD.intro_call,OLD.closed_by,OLD.pending_close,OLD.won_confirmed_at,OLD.won_confirmed_by,OLD.won_package_id,OLD.won_setup_amount,OLD.won_monthly_amount,OLD.pay_level,OLD.client_cancelled_at,OLD.refund_amount,OLD.refund_note) THEN RAISE EXCEPTION 'Use the checked sales action'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND (NEW.status IN ('won','dead') OR public.hq_lead_stage_rank(NEW.status)<public.hq_lead_stage_rank(OLD.status) OR OLD.status IN ('won','dead')) THEN RAISE EXCEPTION 'Use the result sheet or owner confirmation; stages only move forward'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prospects_sales_insert_guard BEFORE INSERT ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.hq_lead_sales_guard();
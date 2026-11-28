ALTER TABLE public.prospects
 ADD COLUMN working_by uuid, ADD COLUMN working_until timestamptz, ADD COLUMN next_try_at timestamptz,
 ADD COLUMN attempt_count int DEFAULT 0, ADD COLUMN last_try_part_of_day text, ADD COLUMN out_of_tries_at timestamptz,
 ADD COLUMN time_zone text DEFAULT 'America/Los_Angeles', ADD COLUMN text_ok boolean DEFAULT false,
 ADD COLUMN text_ok_at timestamptz, ADD COLUMN text_ok_by uuid,
 ADD COLUMN brought_by uuid, ADD COLUMN preview_by uuid, ADD COLUMN booked_by uuid, ADD COLUMN closed_by uuid,
 ADD COLUMN preview_answers jsonb, ADD COLUMN preview_promised_at timestamptz, ADD COLUMN preview_link text,
 ADD COLUMN preview_job_id uuid REFERENCES public.agent_handoffs(id), ADD COLUMN intro_call jsonb, ADD COLUMN dead_reason text,
 ADD COLUMN won_package_id uuid REFERENCES public.starter_packages(id), ADD COLUMN won_setup_amount numeric,
 ADD COLUMN won_monthly_amount numeric, ADD COLUMN pay_level text CHECK(pay_level IN ('rep_alone','rep_with_owner','rep_handed_over','owner_deal')),
 ADD COLUMN won_confirmed_at timestamptz, ADD COLUMN won_confirmed_by uuid, ADD COLUMN pending_close jsonb,
 ADD COLUMN client_cancelled_at timestamptz, ADD COLUMN refund_amount numeric DEFAULT 0, ADD COLUMN refund_note text;
ALTER TABLE public.outreach_templates ADD COLUMN lead_type text,
 ADD COLUMN step text CHECK(step IN ('opener','voicemail','objection','offer_facts','text_after_yes','preview_call','email_first','follow_up'));
-- contact_points previously had no way to distinguish an incorrect number from an opt-out.
ALTER TABLE public.contact_points ADD COLUMN is_wrong boolean DEFAULT false;
CREATE TABLE public.sales_settings(key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now());
GRANT SELECT ON public.sales_settings TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.sales_settings TO authenticated;
GRANT ALL ON public.sales_settings TO service_role;
ALTER TABLE public.sales_settings ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.hq_sales_team() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role<>'client') AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='client')
$$;
REVOKE ALL ON FUNCTION public.hq_sales_team() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_sales_team() TO authenticated,service_role;
CREATE POLICY sales_team_read ON public.sales_settings FOR SELECT TO authenticated USING(public.hq_sales_team());
CREATE POLICY sales_admin_write ON public.sales_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
INSERT INTO public.sales_settings(key,value) VALUES
 ('cadence','{"max_tries":4,"window_days":14,"voicemail_try":2,"rest_days":60,"hold_minutes":30,"preview_retry_business_days":2,"stale_overdue_business_days":2,"stale_untouched_days":5,"quiet_start":"21:00","quiet_end":"08:00"}'),
 ('pay','{"rep_alone":35,"rep_with_owner":25,"rep_handed_over":15,"owner_deal":0,"months":12}'),('mailing_address','""');
CREATE OR REPLACE FUNCTION public.hq_sales_require(p_admin boolean DEFAULT false) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.hq_sales_team() OR (p_admin AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Team permission required' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.hq_sales_require(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_sales_require(boolean) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.hq_sales_business_add(p_day date,p_days int) RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE d date:=p_day; n int:=0;
BEGIN WHILE n<p_days LOOP d:=d+1; IF extract(isodow FROM d)<6 THEN n:=n+1; END IF; END LOOP; RETURN d; END $$;
CREATE OR REPLACE FUNCTION public.hq_sales_business_elapsed(p_from date,p_to date) RETURNS int LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT count(*)::int FROM generate_series(p_from+1,p_to,interval '1 day') d WHERE extract(isodow FROM d)<6
$$;
REVOKE ALL ON FUNCTION public.hq_sales_business_add(date,int),public.hq_sales_business_elapsed(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_sales_business_add(date,int),public.hq_sales_business_elapsed(date,date) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.hq_lead_time_sync() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.time_zone) THEN RAISE EXCEPTION 'A valid time zone is required'; END IF;
 IF TG_OP='INSERT' OR NEW.next_try_at IS DISTINCT FROM OLD.next_try_at THEN NEW.next_follow_up:=(NEW.next_try_at AT TIME ZONE 'America/Los_Angeles')::date;
 ELSIF NEW.next_follow_up IS DISTINCT FROM OLD.next_follow_up THEN NEW.next_try_at:=(NEW.next_follow_up+time '09:00') AT TIME ZONE NEW.time_zone; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_lead_time_sync() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prospects_sales_time_sync BEFORE INSERT OR UPDATE OF next_try_at,next_follow_up,time_zone ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.hq_lead_time_sync();
-- Existing dates remain authoritative until a precise callback is saved.
CREATE OR REPLACE FUNCTION public.hq_lead_claim(p_prospect_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.prospects%ROWTYPE; mins int;
BEGIN
 PERFORM public.hq_sales_require(); SELECT * INTO p FROM public.prospects WHERE id=p_prospect_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
 IF p.do_not_contact OR p.status IN ('dead','won') THEN RAISE EXCEPTION 'This lead cannot be contacted'; END IF;
 IF p.working_until>now() AND p.working_by IS DISTINCT FROM auth.uid() THEN RETURN jsonb_build_object('claimed',false,'working_by',p.working_by,'working_until',p.working_until); END IF;
 SELECT (value->>'hold_minutes')::int INTO mins FROM public.sales_settings WHERE key='cadence';
 UPDATE public.prospects SET working_by=auth.uid(),working_until=now()+make_interval(mins=>mins) WHERE id=p.id RETURNING * INTO p;
 RETURN jsonb_build_object('claimed',true,'working_by',p.working_by,'working_until',p.working_until);
END $$;
CREATE OR REPLACE FUNCTION public.hq_lead_release(p_prospect_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.hq_sales_require(); UPDATE public.prospects SET working_by=null,working_until=null WHERE id=p_prospect_id AND working_by=auth.uid(); END $$;
CREATE OR REPLACE FUNCTION public.hq_sales_owner_ask(p_id uuid,p_type text,p_title text,p_spec jsonb,p_due timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE h uuid;
BEGIN
 PERFORM public.hq_sales_require();
 INSERT INTO public.agent_handoffs(from_agent,to_agent,kind,status,title,owner_question,spec,due_at)
 VALUES('owner','owner','task','new',p_title,p_title,p_spec||jsonb_build_object('source','leads_sales_desk','type',p_type,'prospect_id',p_id,'lead_url','/prospects?lead='||p_id),p_due) RETURNING id INTO h;
 RETURN h;
END $$;
REVOKE ALL ON FUNCTION public.hq_sales_owner_ask(uuid,text,text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.hq_lead_log_result(p_prospect_id uuid,p_result text,p_details jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.prospects%ROWTYPE; c jsonb; a int; nxt timestamptz; local_day date; part text; at_time time; h uuid; note text; event text; failed boolean; talked boolean; slot int; day_gap int; email text;
BEGIN
 PERFORM public.hq_sales_require();
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>24000 THEN RAISE EXCEPTION 'Valid bounded result details are required'; END IF;
 SELECT * INTO p FROM public.prospects WHERE id=p_prospect_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
 IF p.working_until>now() AND p.working_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Someone else is on this lead'; END IF;
 IF p_result NOT IN ('no_answer','voicemail','owner_not_in','wrong_number','preview_yes','intro_booked','follow_up','not_interested','stop','pending_close','hand_to_sean') THEN RAISE EXCEPTION 'Unknown result'; END IF;
 IF p.do_not_contact AND p_result<>'stop' THEN RAISE EXCEPTION 'Do not contact this lead'; END IF;
 IF p.status IN ('won','dead') AND p_result<>'stop' THEN RAISE EXCEPTION 'Lead already closed'; END IF;
 IF p_details ? 'request_key' AND EXISTS(SELECT 1 FROM public.prospect_activity WHERE prospect_id=p.id AND summary LIKE '%[result:'||(p_details->>'request_key')||']%') THEN RETURN jsonb_build_object('saved',true,'duplicate',true); END IF;
 SELECT value INTO c FROM public.sales_settings WHERE key='cadence';
 local_day:=(now() AT TIME ZONE p.time_zone)::date; a:=coalesce(p.attempt_count,0)+1;
 part:=CASE WHEN extract(hour FROM now() AT TIME ZONE p.time_zone)<11 THEN 'morning' WHEN extract(hour FROM now() AT TIME ZONE p.time_zone)<15 THEN 'midday' ELSE 'late_afternoon' END;
 failed:=p_result IN ('no_answer','voicemail','owner_not_in','wrong_number');
 talked:=p_result IN ('preview_yes','intro_booked','follow_up','not_interested','stop','pending_close','hand_to_sean');
 IF p_result='voicemail' AND a<>(c->>'voicemail_try')::int THEN RAISE EXCEPTION 'Voicemail is only offered on try %',c->>'voicemail_try'; END IF;
 IF failed THEN
  IF p.preview_by IS NOT NULL THEN
   nxt:=(public.hq_sales_business_add(local_day,(c->>'preview_retry_business_days')::int)+time '09:00') AT TIME ZONE p.time_zone;
  ELSIF a>=(c->>'max_tries')::int THEN
   nxt:=(local_day+(c->>'rest_days')::int+time '09:00') AT TIME ZONE p.time_zone;
   UPDATE public.prospects SET out_of_tries_at=now() WHERE id=p.id; a:=0;
  ELSE
   day_gap:=ceil((c->>'window_days')::numeric/greatest(1,(c->>'max_tries')::int-1))::int;
   slot:=CASE part WHEN 'morning' THEN 1 WHEN 'midday' THEN 2 ELSE 0 END;
   at_time:=CASE slot WHEN 0 THEN time '09:00' WHEN 1 THEN time '12:00' ELSE time '16:00' END;
   nxt:=(local_day+day_gap+at_time) AT TIME ZONE p.time_zone;
  END IF;
  IF p_result='owner_not_in' THEN
   IF nullif(btrim(p_details->>'owner_name'),'') IS NULL OR nullif(p_details->>'next_try_at','') IS NULL THEN RAISE EXCEPTION 'Owner name and best day/time are required'; END IF;
   nxt:=(p_details->>'next_try_at')::timestamptz; UPDATE public.prospects SET contact_name=p_details->>'owner_name' WHERE id=p.id;
  END IF;
  IF p_result='wrong_number' THEN
   UPDATE public.contact_points SET is_wrong=true WHERE prospect_id=p.id AND kind='phone' AND value=public.hq_normalize_phone(p.phone);
   IF public.hq_normalize_email(p.email) IS NOT NULL THEN nxt:=(public.hq_sales_business_add(local_day,1)+time '09:00') AT TIME ZONE p.time_zone; ELSE nxt:=NULL; END IF;
  END IF;
 ELSE a:=0; END IF;
 IF p_result='follow_up' THEN
  IF nullif(p_details->>'next_try_at','') IS NULL OR nullif(btrim(p_details->>'note'),'') IS NULL THEN RAISE EXCEPTION 'Follow-up needs a day, time and note'; END IF;
  nxt:=(p_details->>'next_try_at')::timestamptz; event:='first_contact';
 ELSIF p_result='preview_yes' THEN
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['services','areas','photos','owner_name','owner_cell','google_link','promised_at']) k WHERE nullif(btrim(p_details->>k),'') IS NULL) OR p_details->'text_ok' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Complete the preview answers and confirm permission to text the link'; END IF;
  nxt:=(p_details->>'promised_at')::timestamptz;
  h:=public.hq_sales_owner_ask(p.id,'lead_preview','Preview: '||p.business_name,p_details||jsonb_build_object('business',p.business_name,'rep_id',auth.uid(),'block','PREVIEW'),nxt-interval '2 hours');
  UPDATE public.prospects SET preview_answers=p_details,preview_by=auth.uid(),preview_promised_at=nxt,preview_job_id=h,preview_link=null,contact_name=p_details->>'owner_name',text_ok=true,text_ok_at=now(),text_ok_by=auth.uid() WHERE id=p.id;
  nxt:=NULL; event:='reply';
 ELSIF p_result='intro_booked' THEN
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['contact_name','role','phone','email','their_words','fix','spending_approver','times']) k WHERE nullif(btrim(p_details->>k),'') IS NULL) THEN RAISE EXCEPTION 'Complete the intro call details and offered times'; END IF;
  UPDATE public.prospects SET intro_call=p_details,booked_by=auth.uid(),their_words=p_details->>'their_words' WHERE id=p.id;
  h:=public.hq_sales_owner_ask(p.id,'lead_intro','Pick an intro time: '||p.business_name,p_details||jsonb_build_object('business',p.business_name,'block','INTRO CALL'),now()); event:='booking';
 ELSIF p_result='not_interested' THEN
  IF p_details->'confirmed' IS DISTINCT FROM 'true'::jsonb OR p_details->>'reason' NOT IN ('has_someone','too_expensive','bad_timing','does_it_themselves','other') OR (p_details->>'reason'='other' AND nullif(btrim(p_details->>'note'),'') IS NULL) THEN RAISE EXCEPTION 'Confirm a reason before marking Dead'; END IF;
  UPDATE public.prospects SET status='dead',dead_reason=(p_details->>'reason')||coalesce(': '||(p_details->>'note'),'') WHERE id=p.id;
  PERFORM public.hq_halt_person_sequences(p.id,p.inbound_lead_id,'dead');
 ELSIF p_result='stop' THEN
  PERFORM public.hq_contact_opt_out('call',NULL,p.id,'Asked to stop',auth.uid()); UPDATE public.contact_points SET opted_out=true,opted_out_at=coalesce(opted_out_at,now()),opt_out_channel='call' WHERE prospect_id=p.id;
 ELSIF p_result='pending_close' THEN
  email:=public.hq_normalize_email(p_details->>'client_email');
  IF p.preview_by IS NULL OR email IS NULL OR NOT EXISTS(SELECT 1 FROM public.starter_packages WHERE id::text=p_details->>'package_id' AND (lower(name) IN ('local growth','startup') OR slug IN ('local-growth','startup'))) THEN RAISE EXCEPTION 'A preview call, client email and Local Growth or Startup package are required'; END IF;
  UPDATE public.prospects SET closed_by=auth.uid(),pending_close=p_details||jsonb_build_object('at',now(),'client_email',email,'closed_by',auth.uid()),pay_level='rep_alone' WHERE id=p.id;
  h:=public.hq_sales_owner_ask(p.id,'lead_close','Confirm close: '||p.business_name,p_details||jsonb_build_object('closed_by',auth.uid(),'pay_level','rep_alone','send_agreement',true),now());
 ELSIF p_result='hand_to_sean' THEN
  IF nullif(btrim(p_details->>'note'),'') IS NULL THEN RAISE EXCEPTION 'Add a hand-off note'; END IF;
  UPDATE public.prospects SET pay_level='rep_handed_over' WHERE id=p.id;
  h:=public.hq_sales_owner_ask(p.id,'lead_handoff','Take over: '||p.business_name,p_details||jsonb_build_object('rep_id',auth.uid(),'proposed_pay_level','rep_handed_over'),now());
 END IF;
 IF nxt IS NOT NULL AND nxt<=now() THEN RAISE EXCEPTION 'Choose a future day and time'; END IF;
 IF nxt IS NOT NULL AND p_result IN ('follow_up','owner_not_in') AND ((nxt AT TIME ZONE p.time_zone)::time >= (c->>'quiet_start')::time OR (nxt AT TIME ZONE p.time_zone)::time < (c->>'quiet_end')::time) THEN RAISE EXCEPTION 'Choose a time outside quiet hours'; END IF;
 IF event IS NOT NULL THEN PERFORM public.hq_lead_stage_event(p.id,event,'call',replace(p_result,'_',' '),auth.uid()); END IF;
 note:=replace(p_result,'_',' ')||coalesce(': '||nullif(p_details->>'note',''),'')||' [result:'||coalesce(p_details->>'request_key',gen_random_uuid()::text)||']';
 INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by) VALUES(p.id,CASE WHEN p_details->>'channel'='email' THEN 'email' ELSE 'call' END,note,auth.uid());
 UPDATE public.prospects SET attempt_count=a,last_try_part_of_day=CASE WHEN failed THEN part ELSE last_try_part_of_day END,next_try_at=nxt,
 last_contacted_at=CASE WHEN talked THEN now() ELSE last_contacted_at END,last_contact_channel=CASE WHEN talked THEN 'call' ELSE last_contact_channel END,
 working_by=null,working_until=null,out_of_tries_at=CASE WHEN NOT failed OR (p.out_of_tries_at IS NOT NULL AND p.next_try_at<=now()) THEN NULL ELSE out_of_tries_at END WHERE id=p.id;
 RETURN jsonb_build_object('saved',true,'next_try_at',nxt,'attempt_count',a,'owner_job_id',h);
END $$;
CREATE OR REPLACE FUNCTION public.hq_lead_set_preview_link(p_prospect_id uuid,p_link text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.prospects%ROWTYPE;
BEGIN
 PERFORM public.hq_sales_require(true); IF p_link !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'A valid HTTPS preview link is required'; END IF;
 SELECT * INTO p FROM public.prospects WHERE id=p_prospect_id FOR UPDATE; IF p.preview_job_id IS NULL THEN RAISE EXCEPTION 'No preview job exists'; END IF;
 UPDATE public.prospects SET preview_link=p_link,next_try_at=greatest(p.preview_promised_at,now()),assigned_to=p.preview_by WHERE id=p.id;
 INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by) VALUES(p.id,'note','Preview link ready',auth.uid());
 UPDATE public.agent_handoffs SET status='done',result=jsonb_build_object('summary','Preview ready','preview_link',p_link),result_links=jsonb_build_array(jsonb_build_object('url',p_link,'label','Preview')) WHERE id=p.preview_job_id AND status IN ('new','claimed','needs_owner');
END $$;
CREATE OR REPLACE FUNCTION public.hq_lead_preview_result() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE link text; p public.prospects%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.prospects WHERE preview_job_id=NEW.id; IF NOT FOUND THEN RETURN NEW; END IF;
 link:=coalesce(NEW.result->>'preview_link',NEW.result_links->0->>'url');
 IF link ~ '^https://[^[:space:]]+$' AND NEW.status='done' AND p.preview_link IS DISTINCT FROM link THEN
  UPDATE public.prospects SET preview_link=link,next_try_at=greatest(preview_promised_at,now()),assigned_to=preview_by WHERE id=p.id;
  INSERT INTO public.prospect_activity(prospect_id,kind,summary) VALUES(p.id,'note','Preview link returned by the assigned preview job');
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_lead_preview_result() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER agent_handoffs_sales_preview AFTER UPDATE OF result,result_links,status ON public.agent_handoffs FOR EACH ROW EXECUTE FUNCTION public.hq_lead_preview_result();
CREATE OR REPLACE FUNCTION public.hq_lead_confirm_won(p_prospect_id uuid,p_package_id uuid,p_setup numeric,p_monthly numeric,p_pay_level text,p_closed_by uuid,p_deal_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.prospects%ROWTYPE; deal uuid; pay jsonb;
BEGIN
 PERFORM public.hq_sales_require(true); SELECT * INTO p FROM public.prospects WHERE id=p_prospect_id FOR UPDATE;
 IF NOT FOUND OR p.do_not_contact OR p.status='dead' THEN RAISE EXCEPTION 'Lead cannot be confirmed won'; END IF;
 SELECT value INTO pay FROM public.sales_settings WHERE key='pay';
 IF NOT pay ? p_pay_level OR p_setup IS NULL OR p_monthly IS NULL OR p_setup<0 OR p_monthly<0 OR p_closed_by IS NULL OR NOT EXISTS(SELECT 1 FROM public.starter_packages WHERE id=p_package_id) THEN RAISE EXCEPTION 'Package, amounts, pay level and closer are required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_closed_by AND role<>'client') THEN RAISE EXCEPTION 'Closer must be a team member'; END IF;
 UPDATE public.prospects SET status='won',won_package_id=p_package_id,won_setup_amount=p_setup,won_monthly_amount=p_monthly,pay_level=p_pay_level,closed_by=p_closed_by,won_confirmed_at=coalesce(won_confirmed_at,now()),won_confirmed_by=auth.uid(),pending_close=null,next_try_at=null,working_by=null,working_until=null WHERE id=p.id;
 IF p_deal_id IS NOT NULL THEN
  SELECT id INTO deal FROM public.crm_deals WHERE id=p_deal_id AND company_id=p.promoted_company_id;
  IF deal IS NULL THEN RAISE EXCEPTION 'CRM deal does not belong to this lead'; END IF;
 ELSIF (SELECT count(*) FROM public.crm_deals WHERE company_id=p.promoted_company_id AND NOT archived AND stage<>'lost')=1 THEN
  SELECT id INTO deal FROM public.crm_deals WHERE company_id=p.promoted_company_id AND NOT archived AND stage<>'lost';
 END IF;
 IF deal IS NOT NULL THEN UPDATE public.crm_deals SET stage='won',package_id=p_package_id,value=p_setup+p_monthly*(pay->>'months')::int,won_at=now(),notes=coalesce(notes,'')||E'\nSales setup: '||p_setup||'; monthly: '||p_monthly||'; pay level: '||p_pay_level WHERE id=deal; END IF;
 PERFORM public.hq_halt_person_sequences(p.id,p.inbound_lead_id,'won');
 INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by) VALUES(p.id,'status','Won confirmed by owner',auth.uid());
 UPDATE public.agent_handoffs SET status='done',result=jsonb_build_object('summary','Close confirmed; owner sends written price and agreement') WHERE spec->>'source'='leads_sales_desk' AND spec->>'prospect_id'=p.id::text AND spec->>'type'='lead_close' AND status IN ('new','needs_owner');
END $$;
CREATE OR REPLACE FUNCTION public.hq_lead_mark_cancelled(p_prospect_id uuid,p_at timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.hq_sales_require(true); IF p_at IS NULL OR p_at>now() THEN RAISE EXCEPTION 'A cancellation date up to today is required'; END IF;
 UPDATE public.prospects SET client_cancelled_at=p_at WHERE id=p_prospect_id AND won_confirmed_at<=p_at; IF NOT FOUND THEN RAISE EXCEPTION 'Cancellation must follow a confirmed sale'; END IF;
 INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by) VALUES(p_prospect_id,'note','Client cancelled: '||p_at::text,auth.uid()); END $$;
CREATE OR REPLACE FUNCTION public.hq_lead_record_refund(p_prospect_id uuid,p_amount numeric,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.hq_sales_require(true); IF p_amount IS NULL OR p_amount<0 OR nullif(btrim(p_note),'') IS NULL THEN RAISE EXCEPTION 'Nonnegative refund amount and note are required'; END IF;
 UPDATE public.prospects SET refund_amount=coalesce(refund_amount,0)+p_amount,refund_note=p_note WHERE id=p_prospect_id AND won_confirmed_at IS NOT NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Confirm the sale first'; END IF;
 INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by) VALUES(p_prospect_id,'note','Refund '||p_amount||': '||p_note,auth.uid()); END $$;
-- Shared reads stay shared; sensitive changes cannot bypass the checked functions through the Data API.
CREATE OR REPLACE FUNCTION public.hq_lead_sales_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND ROW(NEW.working_by,NEW.working_until,NEW.attempt_count,NEW.text_ok,NEW.text_ok_at,NEW.text_ok_by,NEW.preview_by,NEW.preview_job_id,NEW.preview_link,NEW.preview_answers,NEW.booked_by,NEW.closed_by,NEW.pending_close,NEW.won_confirmed_at,NEW.won_confirmed_by,NEW.won_package_id,NEW.won_setup_amount,NEW.won_monthly_amount,NEW.pay_level,NEW.client_cancelled_at,NEW.refund_amount,NEW.refund_note)
 IS DISTINCT FROM ROW(OLD.working_by,OLD.working_until,OLD.attempt_count,OLD.text_ok,OLD.text_ok_at,OLD.text_ok_by,OLD.preview_by,OLD.preview_job_id,OLD.preview_link,OLD.preview_answers,OLD.booked_by,OLD.closed_by,OLD.pending_close,OLD.won_confirmed_at,OLD.won_confirmed_by,OLD.won_package_id,OLD.won_setup_amount,OLD.won_monthly_amount,OLD.pay_level,OLD.client_cancelled_at,OLD.refund_amount,OLD.refund_note) THEN RAISE EXCEPTION 'Use the checked sales action'; END IF;
 IF current_user IN ('authenticated','anon') AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('won','dead') THEN RAISE EXCEPTION 'Use the result sheet or owner confirmation'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_lead_sales_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prospects_sales_guard BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.hq_lead_sales_guard();
CREATE OR REPLACE FUNCTION public.hq_lead_stale_sweep() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.prospects%ROWTYPE; c jsonb; last_at timestamptz; why text; changed int:=0;
BEGIN
 IF session_user NOT IN ('postgres','supabase_admin') AND auth.role()<>'service_role' THEN PERFORM public.hq_sales_require(true); END IF;
 SELECT value INTO c FROM public.sales_settings WHERE key='cadence';
 FOR p IN SELECT * FROM public.prospects WHERE assigned_to IS NOT NULL AND status NOT IN ('won','dead') AND NOT do_not_contact AND (working_until IS NULL OR working_until<=now()) FOR UPDATE SKIP LOCKED LOOP
  SELECT max(created_at) INTO last_at FROM public.prospect_activity WHERE prospect_id=p.id;
  last_at:=greatest(coalesce(last_at,p.created_at),coalesce(p.last_contacted_at,p.created_at)); why:=NULL;
  IF p.next_try_at IS NOT NULL AND last_at<p.next_try_at AND public.hq_sales_business_elapsed((p.next_try_at AT TIME ZONE 'America/Los_Angeles')::date,(now() AT TIME ZONE 'America/Los_Angeles')::date)>(c->>'stale_overdue_business_days')::int THEN why:='Callback more than two business days overdue with nothing logged since';
  ELSIF p.next_try_at IS NULL AND now()-last_at>make_interval(days=>(c->>'stale_untouched_days')::int) THEN why:='No next try and untouched for five days'; END IF;
  IF why IS NOT NULL THEN
   UPDATE public.prospects SET assigned_to=null,working_by=null,working_until=null WHERE id=p.id;
   INSERT INTO public.prospect_activity(prospect_id,kind,summary) VALUES(p.id,'status','Stale assignment released: '||why||' [previous_assignee:'||p.assigned_to||']'); changed:=changed+1;
  END IF;
 END LOOP;
 -- Preview requests are already owner-addressed and due two hours before the promised delivery.
 UPDATE public.agent_handoffs h SET owner_question='Preview link overdue: '||p.business_name,status='needs_owner' FROM public.prospects p WHERE p.preview_job_id=h.id AND p.preview_link IS NULL AND p.preview_promised_at-interval '2 hours'<=now() AND h.status='new';
 RETURN jsonb_build_object('released',changed);
END $$;
REVOKE ALL ON FUNCTION public.hq_lead_claim(uuid),public.hq_lead_release(uuid),public.hq_lead_log_result(uuid,text,jsonb),public.hq_lead_set_preview_link(uuid,text),public.hq_lead_confirm_won(uuid,uuid,numeric,numeric,text,uuid,uuid),public.hq_lead_mark_cancelled(uuid,timestamptz),public.hq_lead_record_refund(uuid,numeric,text),public.hq_lead_stale_sweep() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_lead_claim(uuid),public.hq_lead_release(uuid),public.hq_lead_log_result(uuid,text,jsonb),public.hq_lead_set_preview_link(uuid,text),public.hq_lead_confirm_won(uuid,uuid,numeric,numeric,text,uuid,uuid),public.hq_lead_mark_cancelled(uuid,timestamptz),public.hq_lead_record_refund(uuid,numeric,text),public.hq_lead_stale_sweep() TO authenticated,service_role;
SELECT cron.schedule('hq-lead-stale-daily','0 13 * * *','SELECT public.hq_lead_stale_sweep();');
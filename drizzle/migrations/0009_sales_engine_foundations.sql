CREATE OR REPLACE FUNCTION public.hq_normalize_phone(p_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_raw IS NULL THEN NULL
    WHEN length(regexp_replace(p_raw,'\D','','g')) = 10 THEN '+1'||regexp_replace(p_raw,'\D','','g')
    WHEN length(regexp_replace(p_raw,'\D','','g')) = 11 AND left(regexp_replace(p_raw,'\D','','g'),1)='1' THEN '+'||regexp_replace(p_raw,'\D','','g')
    WHEN btrim(p_raw) LIKE '+%' AND length(regexp_replace(p_raw,'\D','','g')) BETWEEN 8 AND 15 THEN '+'||regexp_replace(p_raw,'\D','','g')
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.hq_normalize_email(p_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN lower(btrim(p_raw)) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN lower(btrim(p_raw)) END
$$;

CREATE TABLE public.contact_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('email','phone')),
  value text NOT NULL,
  opted_out boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  opt_out_channel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, kind, value)
);
CREATE INDEX contact_points_value_idx ON public.contact_points (kind, value);
GRANT SELECT ON public.contact_points TO authenticated;
GRANT ALL ON public.contact_points TO service_role;
ALTER TABLE public.contact_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can read contact points" ON public.contact_points FOR SELECT TO authenticated
USING ((SELECT has_role((SELECT auth.uid()), 'admin'::app_role)) OR EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role <> 'client'::app_role));
CREATE TRIGGER contact_points_updated_at BEFORE UPDATE ON public.contact_points
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.hq_sync_contact_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := public.hq_normalize_email(NEW.email);
        v_phone text := public.hq_normalize_phone(NEW.phone);
BEGIN
  DELETE FROM public.contact_points WHERE prospect_id = NEW.id AND NOT opted_out
    AND ((kind='email' AND value IS DISTINCT FROM v_email) OR (kind='phone' AND value IS DISTINCT FROM v_phone));
  IF v_email IS NOT NULL THEN
    INSERT INTO public.contact_points(prospect_id,kind,value,opted_out,opted_out_at,opt_out_channel)
    SELECT NEW.id,'email',v_email,o.opted_out_at IS NOT NULL,o.opted_out_at,o.opt_out_channel
    FROM (SELECT max(opted_out_at) opted_out_at, max(opt_out_channel) opt_out_channel FROM public.contact_points
          WHERE kind='email' AND value=v_email AND opted_out) o
    ON CONFLICT (prospect_id,kind,value) DO NOTHING;
  END IF;
  IF v_phone IS NOT NULL THEN
    INSERT INTO public.contact_points(prospect_id,kind,value,opted_out,opted_out_at,opt_out_channel)
    SELECT NEW.id,'phone',v_phone,o.opted_out_at IS NOT NULL,o.opted_out_at,o.opt_out_channel
    FROM (SELECT max(opted_out_at) opted_out_at, max(opt_out_channel) opt_out_channel FROM public.contact_points
          WHERE kind='phone' AND value=v_phone AND opted_out) o
    ON CONFLICT (prospect_id,kind,value) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.hq_sync_contact_points() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prospects_contact_points_sync_trg AFTER INSERT OR UPDATE OF email, phone ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.hq_sync_contact_points();

INSERT INTO public.contact_points(prospect_id,kind,value)
SELECT id,'email',public.hq_normalize_email(email) FROM public.prospects WHERE public.hq_normalize_email(email) IS NOT NULL
UNION ALL
SELECT id,'phone',public.hq_normalize_phone(phone) FROM public.prospects WHERE public.hq_normalize_phone(phone) IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.followup_sequence_runs
  ADD COLUMN subject_type text, ADD COLUMN subject_id uuid,
  ADD CONSTRAINT followup_runs_subject_type_chk CHECK (subject_type IN ('prospect','inbound_lead'));
UPDATE public.followup_sequence_runs SET subject_type='inbound_lead', subject_id=lead_id WHERE subject_type IS NULL;
ALTER TABLE public.followup_sequence_runs ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE public.followup_sequence_runs ALTER COLUMN subject_type SET NOT NULL, ALTER COLUMN subject_id SET NOT NULL;
CREATE UNIQUE INDEX followup_runs_subject_uniq ON public.followup_sequence_runs (subject_type, subject_id);
COMMENT ON COLUMN public.followup_sequence_runs.lead_id IS 'Inbound lead for inbound_lead subjects; null for prospect subjects. Prefer subject_type/subject_id.';

CREATE OR REPLACE FUNCTION public.hq_followup_run_subject()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prospect uuid; v_inbound uuid;
BEGIN
  IF NEW.subject_type IS NULL AND NEW.lead_id IS NOT NULL THEN
    NEW.subject_type := 'inbound_lead'; NEW.subject_id := NEW.lead_id;
  END IF;
  IF NEW.subject_type = 'inbound_lead' THEN
    NEW.lead_id := NEW.subject_id; v_inbound := NEW.subject_id;
    SELECT id INTO v_prospect FROM public.prospects WHERE inbound_lead_id = v_inbound;
  ELSIF NEW.subject_type = 'prospect' THEN
    NEW.lead_id := NULL; v_prospect := NEW.subject_id;
    SELECT inbound_lead_id INTO v_inbound FROM public.prospects WHERE id = v_prospect;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('followup_person:'||coalesce(v_prospect::text, v_inbound::text)));
  IF EXISTS (SELECT 1 FROM public.followup_sequence_runs r WHERE
      (v_prospect IS NOT NULL AND r.subject_type='prospect' AND r.subject_id=v_prospect) OR
      (v_inbound IS NOT NULL AND r.subject_type='inbound_lead' AND r.subject_id=v_inbound)) THEN
    RAISE EXCEPTION 'person already has a follow-up sequence' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hq_followup_run_subject() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER followup_runs_subject_trg BEFORE INSERT ON public.followup_sequence_runs
  FOR EACH ROW EXECUTE FUNCTION public.hq_followup_run_subject();

ALTER TABLE public.automation_message_queue
  ADD COLUMN subject_type text CHECK (subject_type IN ('prospect','inbound_lead')), ADD COLUMN subject_id uuid;
UPDATE public.automation_message_queue q SET subject_type=r.subject_type, subject_id=r.subject_id
  FROM public.followup_sequence_runs r WHERE q.source_run_id = r.id AND q.automation_key='followup_sequence' AND q.subject_id IS NULL;
CREATE INDEX automation_queue_subject_idx ON public.automation_message_queue (subject_type, subject_id) WHERE subject_id IS NOT NULL;

ALTER TABLE public.automation_send_log
  ADD COLUMN subject_type text CHECK (subject_type IN ('prospect','inbound_lead')), ADD COLUMN subject_id uuid;
UPDATE public.automation_send_log l SET subject_type=q.subject_type, subject_id=q.subject_id
  FROM public.automation_message_queue q WHERE l.queue_id=q.id AND q.subject_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.hq_subject_person(p_subject_type text, p_subject_id uuid,
  OUT prospect_id uuid, OUT inbound_lead_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_subject_type='prospect' THEN
    prospect_id := p_subject_id;
    SELECT p.inbound_lead_id INTO inbound_lead_id FROM public.prospects p WHERE p.id=p_subject_id;
  ELSIF p_subject_type='inbound_lead' THEN
    inbound_lead_id := p_subject_id;
    SELECT p.id INTO prospect_id FROM public.prospects p WHERE p.inbound_lead_id=p_subject_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.hq_subject_person(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_subject_person(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.hq_halt_person_sequences(p_prospect_id uuid, p_inbound_lead_id uuid, p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_runs uuid[]; v_cancelled integer := 0;
BEGIN
  SELECT array_agg(id) INTO v_runs FROM public.followup_sequence_runs
   WHERE ((p_prospect_id IS NOT NULL AND subject_type='prospect' AND subject_id=p_prospect_id)
       OR (p_inbound_lead_id IS NOT NULL AND subject_type='inbound_lead' AND subject_id=p_inbound_lead_id))
     AND status NOT IN ('halted','failed','completed');
  IF v_runs IS NULL THEN RETURN 0; END IF;
  UPDATE public.followup_sequence_runs SET status='halted', stop_reason=p_reason, ended_at=now() WHERE id = ANY(v_runs);
  UPDATE public.automation_message_queue SET status='canceled', delivery_status='cancelled'
   WHERE source_run_id = ANY(v_runs) AND status IN ('pending_review','approved');
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;
  RETURN v_cancelled;
END $$;
REVOKE ALL ON FUNCTION public.hq_halt_person_sequences(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_halt_person_sequences(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.hq_contact_gate(p_queue_id text, p_channel text, p_to text, p_project_id text,
  p_subject_type text DEFAULT NULL, p_subject_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q record; v_type text := p_subject_type; v_id uuid := p_subject_id; per record;
        v_value text; v_kind text; v_project uuid;
BEGIN
  IF p_queue_id ~* '^[0-9a-f-]{36}$' THEN
    SELECT subject_type, subject_id, project_id INTO q FROM public.automation_message_queue WHERE id = p_queue_id::uuid;
    IF FOUND THEN v_type := coalesce(q.subject_type, v_type); v_id := coalesce(q.subject_id, v_id); v_project := q.project_id; END IF;
  END IF;
  IF v_project IS NULL AND p_project_id ~* '^[0-9a-f-]{36}$' THEN v_project := p_project_id::uuid; END IF;
  IF v_type IS NOT NULL AND v_id IS NOT NULL THEN
    SELECT * INTO per FROM public.hq_subject_person(v_type, v_id);
    IF per.prospect_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.prospects WHERE id=per.prospect_id AND do_not_contact) THEN
      RETURN jsonb_build_object('allowed',false,'reason','do_not_contact','prospect_id',per.prospect_id);
    END IF;
    IF per.inbound_lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.inbound_leads WHERE id=per.inbound_lead_id AND opted_out_at IS NOT NULL) THEN
      RETURN jsonb_build_object('allowed',false,'reason','inbound_lead_opted_out','inbound_lead_id',per.inbound_lead_id);
    END IF;
  END IF;
  IF p_channel = 'email' THEN v_kind := 'email'; v_value := public.hq_normalize_email(p_to);
  ELSIF p_channel = 'sms' THEN v_kind := 'phone'; v_value := public.hq_normalize_phone(p_to); END IF;
  IF v_value IS NOT NULL AND EXISTS (SELECT 1 FROM public.contact_points WHERE kind=v_kind AND value=v_value AND opted_out) THEN
    RETURN jsonb_build_object('allowed',false,'reason','contact_point_opted_out');
  END IF;
  IF v_kind='email' AND v_value IS NOT NULL AND EXISTS (SELECT 1 FROM public.email_suppressions
      WHERE lower(email)=v_value AND (v_project IS NULL OR project_id=v_project)) THEN
    RETURN jsonb_build_object('allowed',false,'reason','email_suppressed');
  END IF;
  RETURN jsonb_build_object('allowed',true);
END $$;
REVOKE ALL ON FUNCTION public.hq_contact_gate(text,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_contact_gate(text,text,text,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.hq_lead_stage_rank(p_status text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_status WHEN 'new' THEN 0 WHEN 'checked' THEN 0 WHEN 'queued' THEN 0
    WHEN 'contacted' THEN 1 WHEN 'replied' THEN 2 WHEN 'meeting' THEN 3 WHEN 'promoted' THEN 3 ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.hq_lead_stage_event(p_prospect_id uuid, p_event text,
  p_channel text DEFAULT NULL, p_summary text DEFAULT NULL, p_actor uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_target text; v_label text; v_rank int; v_actor uuid := coalesce(p_actor, auth.uid());
BEGIN
  IF auth.role() <> 'service_role' AND NOT (has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role <> 'client')) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE='42501';
  END IF;
  v_target := CASE p_event WHEN 'first_contact' THEN 'contacted' WHEN 'reply' THEN 'replied' WHEN 'booking' THEN 'meeting' END;
  IF v_target IS NULL THEN RAISE EXCEPTION 'unknown event %', p_event USING ERRCODE='22023'; END IF;
  SELECT * INTO p FROM public.prospects WHERE id=p_prospect_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('moved',false,'reason','not_found'); END IF;
  IF p_event='first_contact' AND p_channel IS NOT NULL THEN
    UPDATE public.prospects SET last_contacted_at=now(), last_contact_channel=p_channel WHERE id=p.id;
  END IF;
  IF p_event IN ('reply','booking') THEN
    PERFORM public.hq_halt_person_sequences(p.id, p.inbound_lead_id, p_event);
  END IF;
  v_rank := public.hq_lead_stage_rank(p.status);
  IF v_rank IS NULL THEN RETURN jsonb_build_object('moved',false,'reason','closed','status',p.status); END IF;
  IF v_rank >= public.hq_lead_stage_rank(v_target) THEN
    RETURN jsonb_build_object('moved',false,'reason','not_forward','status',p.status);
  END IF;
  UPDATE public.prospects SET status=v_target WHERE id=p.id;
  v_label := CASE v_target WHEN 'contacted' THEN 'Contacted' WHEN 'replied' THEN 'Replied' ELSE 'Meeting booked' END;
  INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by)
  VALUES (p.id,'status','Moved to '||v_label||coalesce(' — '||nullif(btrim(p_summary),''),''),v_actor);
  RETURN jsonb_build_object('moved',true,'from',p.status,'status',v_target);
END $$;
REVOKE ALL ON FUNCTION public.hq_lead_stage_event(uuid,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hq_lead_stage_event(uuid,text,text,text,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.hq_contact_opt_out(p_channel text, p_value text DEFAULT NULL,
  p_prospect_id uuid DEFAULT NULL, p_summary text DEFAULT NULL, p_actor uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kind text; v_value text; v_ids uuid[]; v_id uuid; v_inbound uuid; v_actor uuid := coalesce(p_actor, auth.uid());
BEGIN
  IF auth.role() <> 'service_role' AND NOT (has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role <> 'client')) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE='42501';
  END IF;
  IF p_channel NOT IN ('email','sms','call') THEN RAISE EXCEPTION 'channel must be email, sms or call' USING ERRCODE='22023'; END IF;
  v_kind := CASE p_channel WHEN 'email' THEN 'email' ELSE 'phone' END;
  v_value := CASE v_kind WHEN 'email' THEN public.hq_normalize_email(p_value) ELSE public.hq_normalize_phone(p_value) END;
  IF v_value IS NULL AND p_prospect_id IS NULL THEN RAISE EXCEPTION 'need a valid value or prospect' USING ERRCODE='22023'; END IF;
  IF v_value IS NOT NULL THEN
    UPDATE public.contact_points SET opted_out=true, opted_out_at=coalesce(opted_out_at,now()), opt_out_channel=p_channel
     WHERE kind=v_kind AND value=v_value;
  ELSE
    UPDATE public.contact_points SET opted_out=true, opted_out_at=coalesce(opted_out_at,now()), opt_out_channel=p_channel
     WHERE prospect_id=p_prospect_id AND kind=v_kind;
  END IF;
  SELECT array_agg(DISTINCT id) INTO v_ids FROM (
    SELECT p_prospect_id id WHERE p_prospect_id IS NOT NULL
    UNION SELECT prospect_id FROM public.contact_points WHERE v_value IS NOT NULL AND kind=v_kind AND value=v_value) s;
  FOREACH v_id IN ARRAY coalesce(v_ids, ARRAY[]::uuid[]) LOOP
    UPDATE public.prospects SET do_not_contact=true, opt_out_channel=p_channel, outreach_mode='manual'
     WHERE id=v_id AND NOT do_not_contact RETURNING inbound_lead_id INTO v_inbound;
    IF FOUND THEN
      INSERT INTO public.prospect_activity(prospect_id,kind,summary,created_by)
      VALUES (v_id, CASE p_channel WHEN 'sms' THEN 'text' ELSE p_channel END,
        'Opted out ('||CASE p_channel WHEN 'sms' THEN 'text' ELSE p_channel END||')'||coalesce(' — '||nullif(btrim(p_summary),''),''), v_actor);
    ELSE
      SELECT inbound_lead_id INTO v_inbound FROM public.prospects WHERE id=v_id;
    END IF;
    IF v_inbound IS NOT NULL THEN
      UPDATE public.inbound_leads SET opted_out_at=coalesce(opted_out_at,now()) WHERE id=v_inbound;
    END IF;
    PERFORM public.hq_halt_person_sequences(v_id, v_inbound, 'opted_out');
  END LOOP;
  RETURN jsonb_build_object('ok',true,'prospects',coalesce(to_jsonb(v_ids),'[]'::jsonb),'value',v_value);
END $$;
REVOKE ALL ON FUNCTION public.hq_contact_opt_out(text,text,uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hq_contact_opt_out(text,text,uuid,text,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.hq_finish_automation_send(p_queue_id uuid, p_attempted_at timestamp with time zone, p_result jsonb, p_to text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE q public.automation_message_queue%ROWTYPE; state text; result jsonb := p_result; receipt record; per record;
BEGIN
  SELECT * INTO q FROM public.automation_message_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND OR q.send_attempted_at IS DISTINCT FROM p_attempted_at THEN RAISE EXCEPTION 'send claim changed'; END IF;
  IF q.status NOT IN ('sending','failed') THEN RETURN jsonb_build_object('already_recorded',true,'ok',q.delivery_status IN ('logged','provider_accepted','delivered'),'delivery_status',q.delivery_status); END IF;
  state := p_result->>'delivery_status';
  SELECT * INTO receipt FROM public.automation_delivery_events WHERE provider_message_id=p_result->>'provider_message_id'
    ORDER BY CASE delivery_status WHEN 'bounced' THEN 4 WHEN 'failed' THEN 3 WHEN 'delivered' THEN 2 ELSE 1 END DESC, occurred_at DESC LIMIT 1;
  IF FOUND THEN state := receipt.delivery_status; END IF;
  result := result || jsonb_build_object('delivery_status',state,'ok',state IN ('logged','provider_accepted','delivered'));
  INSERT INTO public.automation_send_log(project_id,queue_id,automation_key,channel,adapter,to_address,subject,body,ok,provider_message_id,error,raw,dedupe_key,subject_type,subject_id)
    VALUES(q.project_id,q.id,q.automation_key,q.channel,coalesce(p_result->>'provider','unknown'),p_to,q.subject,coalesce(q.edited_body,q.body),
      state IN ('logged','provider_accepted','delivered'),p_result->>'provider_message_id',p_result->>'error',result,q.id::text||':'||p_attempted_at::text,q.subject_type,q.subject_id)
    ON CONFLICT(dedupe_key) DO NOTHING;
  UPDATE public.automation_message_queue SET send_result=result,delivery_status=state,
    status=CASE WHEN state IN ('logged','provider_accepted','delivered') THEN 'sent'::public.automation_queue_status
      WHEN state='queued' THEN 'approved'::public.automation_queue_status
      WHEN state='cancelled' THEN 'canceled'::public.automation_queue_status ELSE 'failed'::public.automation_queue_status END WHERE id=q.id;
  IF p_result ? 'blocked_reason' THEN
    IF q.source_run_id IS NOT NULL AND q.automation_key='followup_sequence' THEN
      UPDATE public.followup_sequence_runs SET status='halted', stop_reason='blocked:'||(p_result->>'blocked_reason'), ended_at=now()
       WHERE id=q.source_run_id AND status NOT IN ('halted','failed','completed');
      UPDATE public.automation_message_queue SET status='canceled', delivery_status='cancelled'
       WHERE source_run_id=q.source_run_id AND id<>q.id AND status IN ('pending_review','approved');
    END IF;
    IF q.subject_type IS NOT NULL THEN
      SELECT * INTO per FROM public.hq_subject_person(q.subject_type, q.subject_id);
      IF per.prospect_id IS NOT NULL THEN
        INSERT INTO public.prospect_activity(prospect_id,kind,summary)
        VALUES (per.prospect_id,'auto','Automatic '||q.channel::text||' not sent: '||replace(p_result->>'blocked_reason','_',' '));
      END IF;
    END IF;
  END IF;
  IF receipt.event_id IS NOT NULL AND state='bounced' THEN
    PERFORM public.hq_record_delivery_event(receipt.event_id,receipt.provider_message_id,state,receipt.event_type,receipt.occurred_at);
  END IF;
  RETURN jsonb_build_object('ok',state IN ('logged','provider_accepted','delivered'),'delivery_status',state);
END $function$;
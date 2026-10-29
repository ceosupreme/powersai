-- Phase 2b: retain approval enums, add explicit delivery evidence and durable worker state.
-- Apply before deploying the Phase 2b workers. This migration does not send any messages.
ALTER TABLE public.automation_message_queue
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued','logged','provider_accepted','delivered','failed','bounced','cancelled','unconfirmed'));
ALTER TABLE public.automation_send_log ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS automation_send_log_dedupe ON public.automation_send_log(dedupe_key);
CREATE INDEX IF NOT EXISTS automation_queue_provider_message ON public.automation_message_queue((send_result->>'provider_message_id'));

UPDATE public.automation_message_queue SET delivery_status = CASE
  WHEN status = 'sent' AND send_result->>'provider' = 'manual_log' THEN 'logged'
  WHEN status = 'sent' AND send_result->>'provider' = 'resend' THEN 'provider_accepted'
  WHEN status = 'sent' THEN 'unconfirmed'
  WHEN status = 'failed' AND coalesce(send_result->>'error','') LIKE 'stranded%' THEN 'unconfirmed'
  WHEN status = 'failed' THEN 'failed'
  WHEN status IN ('canceled','rejected') THEN 'cancelled'
  ELSE 'queued' END
WHERE delivery_status = 'queued';

CREATE TABLE IF NOT EXISTS public.hq_worker_checkpoints (
  job_key text PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  lease_token uuid,
  leased_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hq_worker_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_worker_checkpoints FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.hq_worker_checkpoints TO service_role;

CREATE OR REPLACE FUNCTION public.hq_claim_worker(p_key text, p_lease_seconds integer DEFAULT 300)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.hq_worker_checkpoints%ROWTYPE;
BEGIN
  INSERT INTO public.hq_worker_checkpoints(job_key) VALUES (p_key) ON CONFLICT DO NOTHING;
  UPDATE public.hq_worker_checkpoints SET lease_token = gen_random_uuid(),
    leased_until = now() + make_interval(secs => least(greatest(p_lease_seconds,30),900)), updated_at = now()
    WHERE job_key = p_key AND (leased_until IS NULL OR leased_until < now()) RETURNING * INTO r;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.hq_save_worker(p_key text, p_token uuid, p_state jsonb, p_release boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.hq_worker_checkpoints SET state = p_state, updated_at = now(),
    leased_until = CASE WHEN p_release THEN NULL ELSE now() + interval '5 minutes' END,
    lease_token = CASE WHEN p_release THEN NULL ELSE lease_token END
    WHERE job_key = p_key AND lease_token = p_token AND leased_until > now();
  RETURN FOUND;
END $$;

-- Verified provider events are durable even when the webhook beats the send-result write.
CREATE TABLE IF NOT EXISTS public.automation_delivery_events (
  event_id text PRIMARY KEY,
  provider_message_id text NOT NULL,
  delivery_status text NOT NULL CHECK (delivery_status IN ('provider_accepted','delivered','bounced','failed')),
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS automation_delivery_events_message ON public.automation_delivery_events(provider_message_id, occurred_at DESC);
ALTER TABLE public.automation_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_delivery_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.automation_delivery_events TO service_role;

CREATE OR REPLACE FUNCTION public.hq_record_delivery_event(p_event_id text, p_message_id text, p_state text, p_type text, p_occurred_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE effective text; r record;
BEGIN
  INSERT INTO public.automation_delivery_events(event_id,provider_message_id,delivery_status,event_type,occurred_at)
    VALUES(p_event_id,p_message_id,p_state,p_type,p_occurred_at) ON CONFLICT DO NOTHING;
  SELECT delivery_status INTO effective FROM public.automation_delivery_events WHERE provider_message_id = p_message_id
    ORDER BY CASE delivery_status WHEN 'bounced' THEN 4 WHEN 'failed' THEN 3 WHEN 'delivered' THEN 2 ELSE 1 END DESC, occurred_at DESC LIMIT 1;
  UPDATE public.automation_message_queue SET delivery_status = effective,
    status = CASE WHEN effective IN ('failed','bounced') THEN 'failed'::public.automation_queue_status ELSE 'sent'::public.automation_queue_status END,
    send_result = coalesce(send_result,'{}'::jsonb) || jsonb_build_object('delivery_status',effective,'provider_event_at',p_occurred_at,
      'ok',effective NOT IN ('failed','bounced'))
    WHERE send_result->>'provider_message_id' = p_message_id;
  UPDATE public.automation_send_log SET ok=effective NOT IN ('failed','bounced'),
    raw=coalesce(raw,'{}'::jsonb) || jsonb_build_object('delivery_status',effective,'provider_event_at',p_occurred_at)
    WHERE provider_message_id=p_message_id;
  -- A bounce/complaint must also prevent a future enrollment sending to the same address.
  IF effective = 'bounced' THEN
    FOR r IN SELECT project_id, recipient_snapshot->>'email' AS email FROM public.automation_message_queue
      WHERE send_result->>'provider_message_id' = p_message_id LOOP
      IF nullif(trim(r.email),'') IS NOT NULL THEN
        INSERT INTO public.email_suppressions(project_id,email,reason)
          VALUES(r.project_id,lower(trim(r.email)),p_type) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;

-- The claim and all business gates share one transaction. Only trusted workers may call it.
CREATE OR REPLACE FUNCTION public.hq_is_email_suppressed(p_project_id uuid,p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.email_suppressions WHERE project_id=p_project_id AND lower(trim(email))=lower(trim(p_email)));
$$;

CREATE OR REPLACE FUNCTION public.hq_claim_automation_send(p_queue_id uuid, p_expected_attempted_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.automation_message_queue%ROWTYPE; e public.project_automation_enrollments%ROWTYPE;
  run_state text; lead_row public.inbound_leads%ROWTYPE; reason text; recipient_email text;
BEGIN
  SELECT * INTO q FROM public.automation_message_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND OR (p_expected_attempted_at IS NULL AND q.status <> 'approved')
    OR (p_expected_attempted_at IS NOT NULL AND (q.status <> 'sending' OR q.send_attempted_at IS DISTINCT FROM p_expected_attempted_at)) THEN
    RETURN jsonb_build_object('claimed',false,'reason','not_approved_or_already_claimed');
  END IF;
  IF q.delivery_status='unconfirmed' THEN RETURN jsonb_build_object('claimed',false,'reason','delivery_unconfirmed_verify_before_retry'); END IF;
  IF q.approved_at IS NULL OR q.approved_by IS NULL THEN RETURN jsonb_build_object('claimed',false,'reason','approval_required'); END IF;
  IF q.scheduled_for > now() THEN RETURN jsonb_build_object('claimed',false,'reason','scheduled_in_future'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=q.project_id AND is_active=true) THEN
    RETURN jsonb_build_object('claimed',false,'reason','project_inactive');
  END IF;
  SELECT * INTO e FROM public.project_automation_enrollments WHERE project_id=q.project_id AND automation_key=q.automation_key FOR SHARE;
  IF NOT FOUND OR NOT e.enabled OR e.config->>'paused'='true' THEN RETURN jsonb_build_object('claimed',false,'reason','enrollment_paused_or_missing'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=q.approved_by AND role='admin')
    AND NOT (e.approval_mode='client' AND EXISTS(SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id=q.approved_by AND ur.role='client')
      AND (EXISTS(SELECT 1 FROM public.venue_assignments WHERE user_id=q.approved_by AND venue_id=q.project_id)
        OR EXISTS(SELECT 1 FROM public.user_venue_roles WHERE user_id=q.approved_by AND venue_id=q.project_id)))
    AND NOT (e.approval_mode='operator'
      AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=q.approved_by AND role='client')
      AND (EXISTS(SELECT 1 FROM public.venue_assignments va WHERE va.user_id=q.approved_by AND va.venue_id=q.project_id)
        OR EXISTS(SELECT 1 FROM public.user_venue_roles uv WHERE uv.user_id=q.approved_by AND uv.venue_id=q.project_id))
      AND (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=q.approved_by AND role::text IN ('owner','gm','manager','lead','shift_lead'))
        OR EXISTS(SELECT 1 FROM public.venue_assignments WHERE user_id=q.approved_by AND venue_id=q.project_id AND role_at_venue::text IN ('owner','gm','manager','lead','shift_lead'))
        OR EXISTS(SELECT 1 FROM public.user_venue_roles WHERE user_id=q.approved_by AND venue_id=q.project_id AND role::text IN ('owner','gm','manager','lead','shift_lead')))) THEN
    RETURN jsonb_build_object('claimed',false,'reason','approver_access_revoked');
  END IF;

  IF q.automation_key='followup_sequence' THEN
    SELECT status INTO run_state FROM public.followup_sequence_runs WHERE id=q.source_run_id AND project_id=q.project_id FOR SHARE;
    IF NOT FOUND OR run_state <> 'active' THEN reason := 'followup_stopped';
    ELSE
      SELECT l.* INTO lead_row FROM public.inbound_leads l JOIN public.followup_sequence_runs r ON r.lead_id=l.id WHERE r.id=q.source_run_id;
      IF lead_row.id IS NULL OR lead_row.opted_out_at IS NOT NULL OR lead_row.automation_status IN ('replied','booked','opted_out','halted','paused') THEN reason := 'lead_stopped'; END IF;
    END IF;
  ELSIF q.automation_key='reactivation' THEN
    SELECT status INTO run_state FROM public.reactivation_campaign_runs WHERE id=q.source_run_id AND project_id=q.project_id;
    IF NOT FOUND OR run_state NOT IN ('review','sending') THEN reason := 'reactivation_stopped'; END IF;
  ELSIF q.automation_key='review_request' THEN
    SELECT status INTO run_state FROM public.review_request_runs WHERE id=q.source_run_id AND project_id=q.project_id;
    IF NOT FOUND OR run_state IN ('halted','failed','canceled','cancelled','paused','completed') THEN reason := 'review_request_stopped'; END IF;
  END IF;
  recipient_email := lower(trim(q.recipient_snapshot->>'email'));
  IF q.channel='email' AND EXISTS(SELECT 1 FROM public.email_suppressions WHERE project_id=q.project_id AND lower(trim(email))=recipient_email) THEN reason := 'suppressed'; END IF;
  IF reason IS NOT NULL THEN
    UPDATE public.automation_message_queue SET status='canceled', delivery_status='cancelled',
      send_result=jsonb_build_object('ok',false,'provider','none','error',reason,'delivery_status','cancelled') WHERE id=q.id;
    RETURN jsonb_build_object('claimed',false,'reason',reason);
  END IF;
  IF p_expected_attempted_at IS NULL THEN
    UPDATE public.automation_message_queue SET status='sending',send_attempted_at=clock_timestamp(),delivery_status='queued' WHERE id=q.id RETURNING * INTO q;
  END IF;
  RETURN jsonb_build_object('claimed',true,'queue',to_jsonb(q),'config',e.config);
END $$;

CREATE OR REPLACE FUNCTION public.hq_finish_automation_send(p_queue_id uuid, p_attempted_at timestamptz, p_result jsonb, p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.automation_message_queue%ROWTYPE; state text; result jsonb := p_result; receipt record;
BEGIN
  SELECT * INTO q FROM public.automation_message_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND OR q.send_attempted_at IS DISTINCT FROM p_attempted_at THEN RAISE EXCEPTION 'send claim changed'; END IF;
  IF q.status NOT IN ('sending','failed') THEN RETURN jsonb_build_object('already_recorded',true,'ok',q.delivery_status IN ('logged','provider_accepted','delivered'),'delivery_status',q.delivery_status); END IF;
  state := p_result->>'delivery_status';
  SELECT * INTO receipt FROM public.automation_delivery_events WHERE provider_message_id=p_result->>'provider_message_id'
    ORDER BY CASE delivery_status WHEN 'bounced' THEN 4 WHEN 'failed' THEN 3 WHEN 'delivered' THEN 2 ELSE 1 END DESC, occurred_at DESC LIMIT 1;
  IF FOUND THEN state := receipt.delivery_status; END IF;
  result := result || jsonb_build_object('delivery_status',state,'ok',state IN ('logged','provider_accepted','delivered'));
  INSERT INTO public.automation_send_log(project_id,queue_id,automation_key,channel,adapter,to_address,subject,body,ok,provider_message_id,error,raw,dedupe_key)
    VALUES(q.project_id,q.id,q.automation_key,q.channel,coalesce(p_result->>'provider','unknown'),p_to,q.subject,coalesce(q.edited_body,q.body),
      state IN ('logged','provider_accepted','delivered'),p_result->>'provider_message_id',p_result->>'error',result,q.id::text||':'||p_attempted_at::text)
    ON CONFLICT(dedupe_key) DO NOTHING;
  UPDATE public.automation_message_queue SET send_result=result,delivery_status=state,
    status=CASE WHEN state IN ('logged','provider_accepted','delivered') THEN 'sent'::public.automation_queue_status
      WHEN state='queued' THEN 'approved'::public.automation_queue_status
      WHEN state='cancelled' THEN 'canceled'::public.automation_queue_status ELSE 'failed'::public.automation_queue_status END WHERE id=q.id;
  -- Replay a received bounce through the same suppression logic after the message ID is attached.
  IF receipt.event_id IS NOT NULL AND state='bounced' THEN
    PERFORM public.hq_record_delivery_event(receipt.event_id,receipt.provider_message_id,state,receipt.event_type,receipt.occurred_at);
  END IF;
  RETURN jsonb_build_object('ok',state IN ('logged','provider_accepted','delivered'),'delivery_status',state);
END $$;

CREATE OR REPLACE FUNCTION public.hq_apply_inbound_reply(p_inbound_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; affected integer;
BEGIN
  SELECT l.id INTO v_lead_id FROM public.inbound_emails i JOIN public.inbound_leads l ON l.id=i.lead_id
    WHERE i.id=p_inbound_id AND lower(trim(i.from_email))=lower(trim(l.email));
  IF v_lead_id IS NULL THEN RETURN 0; END IF;
  UPDATE public.inbound_leads SET automation_status='replied'
    WHERE id=v_lead_id AND opted_out_at IS NULL AND coalesce(automation_status,'') NOT IN ('opted_out','booked','halted');
  UPDATE public.followup_sequence_runs SET status='halted',stop_reason='inbound_reply',ended_at=coalesce(ended_at,now())
    WHERE followup_sequence_runs.lead_id=v_lead_id AND status='active';
  UPDATE public.automation_message_queue SET status='canceled',delivery_status='cancelled',
    send_result=jsonb_build_object('ok',false,'provider','none','error','inbound_reply','delivery_status','cancelled')
    WHERE automation_key='followup_sequence' AND status IN ('pending_review','approved')
      AND source_run_id IN (SELECT id FROM public.followup_sequence_runs WHERE followup_sequence_runs.lead_id=v_lead_id);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

ALTER TABLE public.inbound_emails
  ADD COLUMN IF NOT EXISTS forward_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forward_first_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS forward_next_attempt_at timestamptz;
-- Historical unforwarded mail is not enqueued by this migration.
CREATE INDEX IF NOT EXISTS inbound_email_retry_due ON public.inbound_emails(forward_next_attempt_at) WHERE forwarded_at IS NULL;

CREATE OR REPLACE FUNCTION public.hq_save_recovery_draft(p_project_id uuid,p_start date,p_end date,p_metrics jsonb,p_dollars numeric,p_basis jsonb,p_narrative text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved uuid;
BEGIN
  INSERT INTO public.recovery_reports(project_id,period_start,period_end,metrics,estimated_dollars,estimate_basis,narrative,narrative_edited,status,generated_at)
    VALUES(p_project_id,p_start,p_end,p_metrics,p_dollars,p_basis,p_narrative,false,'draft',now())
    ON CONFLICT(project_id,period_start) DO UPDATE SET metrics=excluded.metrics,estimated_dollars=excluded.estimated_dollars,
      estimate_basis=excluded.estimate_basis,narrative=excluded.narrative,generated_at=excluded.generated_at
      WHERE recovery_reports.narrative_edited=false AND recovery_reports.status='draft'
        AND recovery_reports.reviewed_at IS NULL AND recovery_reports.sent_at IS NULL
    RETURNING id INTO saved;
  RETURN saved;
END $$;

REVOKE ALL ON FUNCTION public.hq_claim_worker(text,integer), public.hq_save_worker(text,uuid,jsonb,boolean),
  public.hq_claim_automation_send(uuid,timestamptz), public.hq_is_email_suppressed(uuid,text), public.hq_finish_automation_send(uuid,timestamptz,jsonb,text),
  public.hq_record_delivery_event(text,text,text,text,timestamptz), public.hq_apply_inbound_reply(uuid),
  public.hq_save_recovery_draft(uuid,date,date,jsonb,numeric,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hq_claim_worker(text,integer), public.hq_save_worker(text,uuid,jsonb,boolean),
  public.hq_claim_automation_send(uuid,timestamptz), public.hq_is_email_suppressed(uuid,text), public.hq_finish_automation_send(uuid,timestamptz,jsonb,text),
  public.hq_record_delivery_event(text,text,text,text,timestamptz), public.hq_apply_inbound_reply(uuid),
  public.hq_save_recovery_draft(uuid,date,date,jsonb,numeric,jsonb,text) TO service_role;

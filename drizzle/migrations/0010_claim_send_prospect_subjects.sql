CREATE OR REPLACE FUNCTION public.hq_claim_automation_send(p_queue_id uuid, p_expected_attempted_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      IF EXISTS(SELECT 1 FROM public.followup_sequence_runs r WHERE r.id=q.source_run_id AND r.subject_type='prospect') THEN
        NULL; -- prospect runs: the send-time contact gate decides
      ELSE
      SELECT l.* INTO lead_row FROM public.inbound_leads l JOIN public.followup_sequence_runs r ON r.lead_id=l.id WHERE r.id=q.source_run_id;
      IF lead_row.id IS NULL OR lead_row.opted_out_at IS NOT NULL OR lead_row.automation_status IN ('replied','booked','opted_out','halted','paused') THEN reason := 'lead_stopped'; END IF;
      END IF;
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
END $function$;
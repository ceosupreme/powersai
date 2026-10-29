-- Phase 2 prerequisites: compatible with existing handlers. No external sends.
-- Apply before the guarded handlers. See scripts/security/README.md for cutover.

-- Revoke the PUBLIC default as well as explicit API-role grants; cron/postgres
-- and service_role keep the operational capabilities they actually require.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('net_http_post','toast_submit_lock') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;

-- An invited_role string is caller-controlled at public signup. Only an actual
-- Auth admin invitation has invited_at set by Auth, so require that provenance.
-- Direct admin create-user assigns roles through its service-owned endpoint.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invited_role text;
BEGIN
  INSERT INTO public.profiles(id,email,full_name)
    VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'full_name','')) ON CONFLICT(id) DO NOTHING;
  invited_role := NEW.raw_user_meta_data->>'invited_role';
  IF NEW.invited_at IS NOT NULL
    AND invited_role IN ('admin','owner','gm','manager','shift_lead','staff','client') THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,invited_role::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Role helpers remain callable by RLS, but cannot enumerate another person's
-- permissions. An admin or the service role can still inspect team roles.
CREATE OR REPLACE FUNCTION public.hq_can_inspect_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    _user_id=auth.uid() OR auth.role()='service_role'
    OR (auth.uid() IS NULL AND current_setting('role',true) IN ('none','postgres','supabase_admin'))
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin')
  );
$$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.hq_can_inspect_user(_user_id)
    AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id=_user_id AND public.hq_can_inspect_user(_user_id)
    ORDER BY CASE role::text WHEN 'admin' THEN 1 WHEN 'client' THEN 2 WHEN 'owner' THEN 3
      WHEN 'gm' THEN 4 WHEN 'manager' THEN 5 WHEN 'shift_lead' THEN 6 ELSE 7 END LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.get_user_venue_role(_user_id uuid,_venue_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_venue_roles WHERE user_id=_user_id AND venue_id=_venue_id
    AND public.hq_can_inspect_user(_user_id)
    ORDER BY CASE role WHEN 'owner' THEN 1 WHEN 'gm' THEN 2 WHEN 'manager' THEN 3
      WHEN 'lead' THEN 4 WHEN 'shift_lead' THEN 5 WHEN 'foh' THEN 6 WHEN 'boh' THEN 7 ELSE 8 END LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role), public.get_user_role(uuid),
  public.get_user_venue_role(uuid,uuid),public.hq_can_inspect_user(uuid) TO anon,authenticated,service_role;

-- Broad project access is for actual team members. Client approval membership
-- is evaluated by a separate, narrower helper instead of the broad CRUD helper.
CREATE OR REPLACE FUNCTION public.user_can_access_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (
    NOT public.has_role(auth.uid(),'client')
    AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid())
    AND (EXISTS(SELECT 1 FROM public.venue_assignments WHERE user_id=auth.uid() AND venue_id=_project_id)
      OR EXISTS(SELECT 1 FROM public.user_venue_roles WHERE user_id=auth.uid() AND venue_id=_project_id))
  );
$$;
CREATE OR REPLACE FUNCTION public.user_can_manage_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (
    public.user_can_access_project(_project_id)
    AND (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()
        AND role::text IN ('owner','gm','manager','lead','shift_lead'))
      OR EXISTS(SELECT 1 FROM public.venue_assignments WHERE user_id=auth.uid() AND venue_id=_project_id
        AND role_at_venue::text IN ('owner','gm','manager','lead','shift_lead'))
      OR EXISTS(SELECT 1 FROM public.user_venue_roles WHERE user_id=auth.uid() AND venue_id=_project_id
        AND role::text IN ('owner','gm','manager','lead','shift_lead')))
  );
$$;
CREATE OR REPLACE FUNCTION public.user_can_approve_project_message(_project_id uuid,_automation_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'client')
    AND (EXISTS(SELECT 1 FROM public.venue_assignments WHERE user_id=auth.uid() AND venue_id=_project_id)
      OR EXISTS(SELECT 1 FROM public.user_venue_roles WHERE user_id=auth.uid() AND venue_id=_project_id))
    AND EXISTS(SELECT 1 FROM public.project_automation_enrollments WHERE project_id=_project_id
      AND automation_key::text=_automation_key AND approval_mode='client');
$$;
GRANT EXECUTE ON FUNCTION public.user_can_manage_project(uuid),
  public.user_can_approve_project_message(uuid,text) TO authenticated,service_role;

-- Remove every former queue policy so no permissive OR branch can re-open
-- client INSERT/DELETE or access to operator-approved enrollments.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='automation_message_queue' LOOP
    EXECUTE format('DROP POLICY %I ON public.automation_message_queue',p.policyname);
  END LOOP;
END $$;
CREATE POLICY amq_manage ON public.automation_message_queue FOR ALL TO authenticated
  USING(public.user_can_manage_project(project_id)) WITH CHECK(public.user_can_manage_project(project_id));
CREATE POLICY amq_delete_drafts ON public.automation_message_queue AS RESTRICTIVE FOR DELETE TO authenticated
  USING(public.has_role(auth.uid(),'admin') OR status IN ('pending_review','rejected'));
CREATE POLICY amq_client_select ON public.automation_message_queue FOR SELECT TO authenticated
  USING(public.user_can_approve_project_message(project_id,automation_key::text));
CREATE POLICY amq_client_update ON public.automation_message_queue FOR UPDATE TO authenticated
  USING(public.user_can_approve_project_message(project_id,automation_key::text))
  WITH CHECK(public.user_can_approve_project_message(project_id,automation_key::text)
    AND status IN ('pending_review','approved','rejected'));

CREATE OR REPLACE FUNCTION public.amq_client_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed text[] := ARRAY['status','edited_body','reject_reason','flagged_for_operator','approved_by','approved_at','updated_at'];
  retry_allowed boolean; old_state text;
BEGIN
  -- Workers own delivery state. Human approval provenance is always the caller,
  -- including administrators; a browser cannot attribute approval to somebody else.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF NOT public.has_role(auth.uid(),'admin') AND (
      NEW.status<>'pending_review' OR NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL
      OR coalesce(to_jsonb(NEW)->>'delivery_status','queued')<>'queued' OR NEW.send_result IS NOT NULL) THEN
      RAISE EXCEPTION 'Operators may insert only an unapproved draft' USING ERRCODE='42501';
    END IF;
    IF NEW.status IN ('approved','rejected') THEN NEW.approved_by:=auth.uid(); NEW.approved_at:=now(); END IF;
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(),'client') AND NOT public.has_role(auth.uid(),'admin') THEN
    IF OLD.status<>'pending_review' OR NEW.status NOT IN ('pending_review','approved','rejected')
      OR NOT public.user_can_approve_project_message(OLD.project_id,OLD.automation_key::text) THEN
      RAISE EXCEPTION 'Client may review only a pending message for a client-approved enrollment' USING ERRCODE='42501';
    END IF;
    -- An allowlist also protects delivery_status and any columns added later.
    IF (to_jsonb(NEW)-allowed) IS DISTINCT FROM (to_jsonb(OLD)-allowed) THEN
      RAISE EXCEPTION 'Client cannot modify message or delivery fields' USING ERRCODE='42501';
    END IF;
    IF NEW.status='pending_review' THEN
      NEW.approved_by := OLD.approved_by; NEW.approved_at := OLD.approved_at;
    END IF;
  ELSIF NOT public.has_role(auth.uid(),'admin') THEN
    -- Managers may review/reschedule their project queue, not forge receipts or
    -- erase unconfirmed delivery evidence to force an unsafe second send.
    old_state := coalesce(to_jsonb(OLD)->>'delivery_status',OLD.send_result->>'delivery_status','failed');
    retry_allowed := OLD.status='failed' AND NEW.status='approved'
      AND old_state NOT IN ('unconfirmed','bounced')
      AND coalesce(OLD.send_result->>'error','') NOT LIKE 'stranded%';
    allowed := allowed || ARRAY['scheduled_for'];
    IF retry_allowed THEN
      IF coalesce(to_jsonb(NEW)->>'delivery_status','queued')<>'queued' OR NEW.send_result IS NOT NULL THEN
        RAISE EXCEPTION 'Retry must reset only a confirmed failed delivery' USING ERRCODE='42501';
      END IF;
      allowed := allowed || ARRAY['delivery_status','send_result'];
    END IF;
    IF (to_jsonb(NEW)-allowed) IS DISTINCT FROM (to_jsonb(OLD)-allowed)
      OR (OLD.status<>'pending_review' AND NEW.edited_body IS DISTINCT FROM OLD.edited_body)
      OR (NEW.status IS DISTINCT FROM OLD.status AND NOT retry_allowed
        AND (OLD.status NOT IN ('pending_review','approved') OR NEW.status NOT IN ('approved','rejected'))) THEN
      RAISE EXCEPTION 'Operator cannot change protected message or delivery state' USING ERRCODE='42501';
    END IF;
  END IF;
  IF NEW.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.approved_by := auth.uid(); NEW.approved_at := now();
  ELSIF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    NEW.approved_by := OLD.approved_by; NEW.approved_at := OLD.approved_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS amq_client_guard ON public.automation_message_queue;
CREATE TRIGGER amq_client_guard BEFORE INSERT OR UPDATE ON public.automation_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.amq_client_guard();
INSERT INTO public.role_page_defaults(role,page_key,enabled) VALUES('client','client_approvals',true)
  ON CONFLICT(role,page_key) DO UPDATE SET enabled=true;

-- Restrictive write policies cannot be bypassed by an existing permissive ALL
-- child policy. Non-client project members retain their existing read access.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['brand_kits','brand_kit_colors','brand_kit_taglines','brand_kit_hashtags','brand_kit_links','brand_kit_assets'] LOOP
    EXECUTE format('CREATE POLICY hq_admin_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),''admin''))',t);
    EXECUTE format('CREATE POLICY hq_admin_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),''admin'')) WITH CHECK(public.has_role(auth.uid(),''admin''))',t);
    EXECUTE format('CREATE POLICY hq_admin_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.has_role(auth.uid(),''admin''))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['service_packages','project_type_leak_vectors','foundation_item_templates'] LOOP
    EXECUTE format('CREATE POLICY hq_team_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(public.has_role(auth.uid(),''admin'') OR (NOT public.has_role(auth.uid(),''client'') AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid())))',t);
  END LOOP;
END $$;
CREATE POLICY hq_brand_asset_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(bucket_id<>'brand-assets' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hq_brand_asset_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING(bucket_id<>'brand-assets' OR public.has_role(auth.uid(),'admin'))
  WITH CHECK(bucket_id<>'brand-assets' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hq_brand_asset_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING(bucket_id<>'brand-assets' OR public.has_role(auth.uid(),'admin'));

-- A durable fixed-window counter. Each key is HMAC-hashed at the edge; this
-- table contains no raw IP address/email. Atomic UPSERT serializes concurrent calls.
CREATE TABLE public.hq_public_rate_limits (
  scope text NOT NULL, bucket_key text NOT NULL, window_start timestamptz NOT NULL,
  hits integer NOT NULL, expires_at timestamptz NOT NULL,
  PRIMARY KEY(scope,bucket_key,window_start)
);
CREATE INDEX hq_public_rate_limits_expiry ON public.hq_public_rate_limits(expires_at);
ALTER TABLE public.hq_public_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_public_rate_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.hq_public_rate_limits TO service_role;
CREATE OR REPLACE FUNCTION public.consume_public_rate_limit(p_scope text,p_key text,p_limit integer,p_window_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bucket timestamptz; hits_now integer; expiry timestamptz;
BEGIN
  IF p_scope IS NULL OR length(p_scope)>120 OR p_key !~ '^[0-9a-f]{64}$'
    OR p_limit NOT BETWEEN 1 AND 100000 OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Invalid limiter parameters' USING ERRCODE='22023';
  END IF;
  bucket := to_timestamp(floor(extract(epoch FROM clock_timestamp())/p_window_seconds)*p_window_seconds);
  expiry := bucket+make_interval(secs=>p_window_seconds);
  INSERT INTO public.hq_public_rate_limits(scope,bucket_key,window_start,hits,expires_at)
    VALUES(p_scope,p_key,bucket,1,expiry)
    ON CONFLICT(scope,bucket_key,window_start) DO UPDATE SET hits=least(public.hq_public_rate_limits.hits+1,p_limit+1)
    RETURNING hits INTO hits_now;
  -- Bound retention and per-request cleanup work, even after idle periods.
  DELETE FROM public.hq_public_rate_limits WHERE ctid IN (
    SELECT ctid FROM public.hq_public_rate_limits WHERE expires_at<now()-interval '1 day' LIMIT 100);
  RETURN jsonb_build_object('allowed',hits_now<=p_limit,'retry_after',greatest(1,ceil(extract(epoch FROM expiry-clock_timestamp()))::integer));
END $$;
REVOKE ALL ON FUNCTION public.consume_public_rate_limit(text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_rate_limit(text,text,integer,integer) TO service_role;

-- One token -> one lead, even with concurrent requests. The lock, insert and
-- capture marker commit together; an insert failure leaves a retryable token.
CREATE OR REPLACE FUNCTION public.unlock_public_audit_once(p_token text,p_email text,p_name text,p_phone text,p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.public_audit_requests%ROWTYPE; lead_id uuid; redacted jsonb;
BEGIN
  SELECT * INTO r FROM public.public_audit_requests WHERE token=p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF r.status<>'complete' THEN RETURN jsonb_build_object('error','not_ready'); END IF;
  IF r.email_captured_at IS NOT NULL THEN
    RETURN jsonb_build_object('new_capture',false,'full_result',r.full_result);
  END IF;
  IF p_email IS NULL OR length(p_email)>255 OR length(coalesce(p_name,''))>200
    OR length(coalesce(p_phone,''))>40 OR length(coalesce(p_message,''))>20000 THEN
    RAISE EXCEPTION 'Invalid capture data' USING ERRCODE='22023';
  END IF;
  redacted := coalesce(r.redacted_result,'{}'::jsonb);
  INSERT INTO public.inbound_leads(name,business_name,email,phone,message,conversation_channel,route_to,is_ready,source,qualifier_data)
    VALUES(coalesce(nullif(p_name,''),split_part(p_email,'@',1)),r.business_name,p_email,p_phone,p_message,
      'form','self',true,'free-audit',jsonb_build_object('source','public_audit','token',p_token,
        'operation_footprint',r.operation_footprint,'redacted_summary',redacted,'leak_count',redacted->'leak_count',
        'top_leaks',coalesce(redacted->'top_leaks','[]'::jsonb),'project_type_resolution',redacted->'project_type_resolution',
        'place_id',r.place_id,'city',r.city)) RETURNING id INTO lead_id;
  UPDATE public.public_audit_requests SET email=p_email,email_captured_at=now() WHERE id=r.id;
  RETURN jsonb_build_object('new_capture',true,'lead_id',lead_id,'full_result',r.full_result);
END $$;
REVOKE ALL ON FUNCTION public.unlock_public_audit_once(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_public_audit_once(text,text,text,text,text) TO service_role;

-- Service-only verification. Tokens are created in the cutover migration and
-- never returned through a public RPC; a credential is valid for one handler.
CREATE TABLE public.hq_edge_job_tokens (
  function_name text PRIMARY KEY CHECK(function_name ~ '^[a-z][a-z0-9-]+$'),
  token_hash bytea NOT NULL,
  secret_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hq_edge_job_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_edge_job_tokens FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hq_edge_job_tokens TO service_role;
CREATE OR REPLACE FUNCTION public.hq_verify_job_token(p_function text,p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT length(p_token) BETWEEN 32 AND 512 AND EXISTS(SELECT 1 FROM public.hq_edge_job_tokens
    WHERE function_name=p_function AND token_hash=sha256(convert_to(p_token,'UTF8')));
$$;
REVOKE ALL ON FUNCTION public.hq_verify_job_token(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hq_verify_job_token(text,text) TO service_role;

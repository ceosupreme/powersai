
ALTER TABLE public.project_automation_enrollments
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'operator'
  CHECK (approval_mode IN ('operator','client'));

ALTER TABLE public.automation_message_queue
  ADD COLUMN IF NOT EXISTS flagged_for_operator boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS amq_flagged_idx
  ON public.automation_message_queue(project_id)
  WHERE flagged_for_operator;

CREATE POLICY amq_client_select ON public.automation_message_queue
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND public.user_can_access_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.project_automation_enrollments e
      WHERE e.project_id = automation_message_queue.project_id
        AND e.automation_key = automation_message_queue.automation_key
        AND e.approval_mode = 'client'
    )
  );

CREATE POLICY amq_client_update ON public.automation_message_queue
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND public.user_can_access_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.project_automation_enrollments e
      WHERE e.project_id = automation_message_queue.project_id
        AND e.automation_key = automation_message_queue.automation_key
        AND e.approval_mode = 'client'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'client')
    AND public.user_can_access_project(project_id)
    AND status IN ('pending_review','approved','rejected')
  );

CREATE OR REPLACE FUNCTION public.amq_client_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_client boolean;
  is_admin  boolean;
  is_operator boolean;
BEGIN
  is_client   := public.has_role(auth.uid(), 'client');
  is_admin    := public.has_role(auth.uid(), 'admin');
  is_operator := is_admin OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role <> 'client'
  );

  IF NOT is_client OR is_operator THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending_review' THEN
    RAISE EXCEPTION 'client cannot modify a % row (id=%)', OLD.status, OLD.id
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status NOT IN ('pending_review','approved','rejected') THEN
    RAISE EXCEPTION 'client may only set status to pending_review, approved, or rejected'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id                    IS DISTINCT FROM OLD.id
     OR NEW.project_id         IS DISTINCT FROM OLD.project_id
     OR NEW.automation_key     IS DISTINCT FROM OLD.automation_key
     OR NEW.source_run_id      IS DISTINCT FROM OLD.source_run_id
     OR NEW.recipient_contact_id IS DISTINCT FROM OLD.recipient_contact_id
     OR NEW.recipient_snapshot IS DISTINCT FROM OLD.recipient_snapshot
     OR NEW.channel            IS DISTINCT FROM OLD.channel
     OR NEW.subject            IS DISTINCT FROM OLD.subject
     OR NEW.body               IS DISTINCT FROM OLD.body
     OR NEW.model              IS DISTINCT FROM OLD.model
     OR NEW.scheduled_for      IS DISTINCT FROM OLD.scheduled_for
     OR NEW.send_attempted_at  IS DISTINCT FROM OLD.send_attempted_at
     OR NEW.send_result        IS DISTINCT FROM OLD.send_result
     OR NEW.dedupe_key         IS DISTINCT FROM OLD.dedupe_key
     OR NEW.metadata           IS DISTINCT FROM OLD.metadata
     OR NEW.created_by         IS DISTINCT FROM OLD.created_by
     OR NEW.created_at         IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'client cannot modify these columns' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS amq_client_guard ON public.automation_message_queue;
CREATE TRIGGER amq_client_guard
  BEFORE UPDATE ON public.automation_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.amq_client_guard();

INSERT INTO public.role_page_defaults (role, page_key, enabled) VALUES
  ('client', 'client_approvals', true),
  ('client', 'dashboard', false),
  ('client', 'weekly_review', false),
  ('client', 'insights', false),
  ('client', 'sales', false),
  ('client', 'labor', false),
  ('client', 'operations', false),
  ('client', 'guest_experience', false),
  ('client', 'marketing', false),
  ('client', 'social_media', false),
  ('client', 'employees', false),
  ('client', 'tasks', false),
  ('client', 'logs', false),
  ('client', 'chat', false),
  ('client', 'crm', false),
  ('client', 'brand_kit', false),
  ('client', 'marketing_hub', false),
  ('client', 'growth_audit', false),
  ('client', 'capture_inbox', false),
  ('client', 'content_pipeline', false),
  ('client', 'revenue', false),
  ('client', 'affiliate_programs', false),
  ('client', 'products', false),
  ('client', 'offers', false),
  ('client', 'automation_inbox', false),
  ('client', 'reactivation', false),
  ('client', 'recovery_reports', false),
  ('client', 'foundation_audit', false)
ON CONFLICT (role, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invited_role text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  invited_role := new.raw_user_meta_data ->> 'invited_role';

  IF invited_role = 'client' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'client')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'staff')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

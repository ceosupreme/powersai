
-- ============================================================
-- Build C — Tier 2 Fulfillment Automations
-- ============================================================

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE public.automation_key AS ENUM ('followup_sequence', 'reactivation', 'review_request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_queue_status AS ENUM (
    'pending_review', 'approved', 'sending', 'sent', 'rejected', 'failed', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_channel AS ENUM (
    'email', 'sms', 'linkedin_dm', 'instagram_dm', 'review_reply'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- per-project enrollment ----------
CREATE TABLE IF NOT EXISTS public.project_automation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  automation_key public.automation_key NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, automation_key)
);
CREATE INDEX IF NOT EXISTS pae_project_idx ON public.project_automation_enrollments(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_automation_enrollments TO authenticated;
GRANT ALL ON public.project_automation_enrollments TO service_role;
ALTER TABLE public.project_automation_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pae_access ON public.project_automation_enrollments
  FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_pae_updated_at BEFORE UPDATE ON public.project_automation_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------- run tables ----------
CREATE TABLE IF NOT EXISTS public.followup_sequence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.inbound_leads(id) ON DELETE CASCADE,
  enrollment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',  -- active|halted|completed|failed
  stop_reason text,
  queued_message_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  fired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);
CREATE INDEX IF NOT EXISTS fsr_project_idx ON public.followup_sequence_runs(project_id);
CREATE INDEX IF NOT EXISTS fsr_status_idx ON public.followup_sequence_runs(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followup_sequence_runs TO authenticated;
GRANT ALL ON public.followup_sequence_runs TO service_role;
ALTER TABLE public.followup_sequence_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY fsr_access ON public.followup_sequence_runs FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_fsr_updated_at BEFORE UPDATE ON public.followup_sequence_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.reactivation_campaign_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  list_id uuid,
  name text,
  segment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  queued_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'drafting',  -- drafting|review|sending|completed|halted|failed
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rcr_project_idx ON public.reactivation_campaign_runs(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactivation_campaign_runs TO authenticated;
GRANT ALL ON public.reactivation_campaign_runs TO service_role;
ALTER TABLE public.reactivation_campaign_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY rcr_access ON public.reactivation_campaign_runs FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_rcr_updated_at BEFORE UPDATE ON public.reactivation_campaign_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.review_request_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  trigger_source text NOT NULL,         -- 'manual'|'event'
  trigger_ref text,                     -- e.g. visit id, job id, free text
  queued_message_id uuid,
  status text NOT NULL DEFAULT 'queued',
  fired_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, trigger_ref)
);
CREATE INDEX IF NOT EXISTS rrr_project_idx ON public.review_request_runs(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_request_runs TO authenticated;
GRANT ALL ON public.review_request_runs TO service_role;
ALTER TABLE public.review_request_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY rrr_access ON public.review_request_runs FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_rrr_updated_at BEFORE UPDATE ON public.review_request_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------- the approval queue ----------
CREATE TABLE IF NOT EXISTS public.automation_message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  automation_key public.automation_key NOT NULL,
  source_run_id uuid,
  recipient_contact_id uuid,
  recipient_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  channel public.automation_channel NOT NULL,
  subject text,
  body text NOT NULL,
  edited_body text,
  model text,
  status public.automation_queue_status NOT NULL DEFAULT 'pending_review',
  scheduled_for timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  send_attempted_at timestamptz,
  send_result jsonb,
  dedupe_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS amq_project_status_idx ON public.automation_message_queue(project_id, status);
CREATE INDEX IF NOT EXISTS amq_run_idx ON public.automation_message_queue(source_run_id);
CREATE INDEX IF NOT EXISTS amq_scheduled_idx ON public.automation_message_queue(scheduled_for) WHERE status = 'approved';
CREATE UNIQUE INDEX IF NOT EXISTS amq_dedupe_uidx
  ON public.automation_message_queue(project_id, automation_key, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_message_queue TO authenticated;
GRANT ALL ON public.automation_message_queue TO service_role;
ALTER TABLE public.automation_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY amq_access ON public.automation_message_queue FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_amq_updated_at BEFORE UPDATE ON public.automation_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------- send log ----------
CREATE TABLE IF NOT EXISTS public.automation_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  queue_id uuid REFERENCES public.automation_message_queue(id) ON DELETE SET NULL,
  automation_key public.automation_key NOT NULL,
  channel public.automation_channel NOT NULL,
  adapter text NOT NULL,
  to_address text,
  subject text,
  body text,
  ok boolean NOT NULL,
  provider_message_id text,
  error text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asl_project_idx ON public.automation_send_log(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS asl_queue_idx ON public.automation_send_log(queue_id);
GRANT SELECT ON public.automation_send_log TO authenticated;
GRANT ALL ON public.automation_send_log TO service_role;
ALTER TABLE public.automation_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY asl_read ON public.automation_send_log FOR SELECT TO authenticated
  USING (public.user_can_access_project(project_id));

-- ---------- customer lists (reactivation) ----------
CREATE TABLE IF NOT EXISTS public.project_customer_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text,         -- 'csv'|'manual'|'integration'
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pcl_project_idx ON public.project_customer_lists(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_customer_lists TO authenticated;
GRANT ALL ON public.project_customer_lists TO service_role;
ALTER TABLE public.project_customer_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY pcl_access ON public.project_customer_lists FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));
CREATE TRIGGER trg_pcl_updated_at BEFORE UPDATE ON public.project_customer_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.project_customer_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.project_customer_lists(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  last_visit_at timestamptz,
  segment text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pclm_list_idx ON public.project_customer_list_members(list_id);
CREATE INDEX IF NOT EXISTS pclm_project_idx ON public.project_customer_list_members(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_customer_list_members TO authenticated;
GRANT ALL ON public.project_customer_list_members TO service_role;
ALTER TABLE public.project_customer_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY pclm_access ON public.project_customer_list_members FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

-- ---------- inbound_leads extensions ----------
ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS automation_status text,  -- 'enrolled'|'replied'|'booked'|'opted_out'|'halted'
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz;

-- ---------- pg_cron sweepers ----------
DO $$ BEGIN
  PERFORM cron.unschedule('automation-queue-sweeper');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('automation-followup-cadence');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('automation-stop-condition');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'automation-queue-sweeper',
  '*/5 * * * *',
  $$ SELECT public.net_http_post(
       'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/automation-queue-sweeper',
       '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYW5lemNjdXNzanR6enJicnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDc4NTYsImV4cCI6MjA5Njg4Mzg1Nn0.9aDadI8cUbJtNzvB-s5klHFCixnMWo6NHxTvPCqAyxI"}',
       '{"trigger":"cron"}'
     ); $$
);

SELECT cron.schedule(
  'automation-followup-cadence',
  '0 * * * *',
  $$ SELECT public.net_http_post(
       'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/followup-cadence-tick',
       '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYW5lemNjdXNzanR6enJicnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDc4NTYsImV4cCI6MjA5Njg4Mzg1Nn0.9aDadI8cUbJtNzvB-s5klHFCixnMWo6NHxTvPCqAyxI"}',
       '{"trigger":"cron"}'
     ); $$
);

SELECT cron.schedule(
  'automation-stop-condition',
  '0 13 * * *',
  $$ SELECT public.net_http_post(
       'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/automation-stop-condition-sweep',
       '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYW5lemNjdXNzanR6enJicnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDc4NTYsImV4cCI6MjA5Njg4Mzg1Nn0.9aDadI8cUbJtNzvB-s5klHFCixnMWo6NHxTvPCqAyxI"}',
       '{"trigger":"cron"}'
     ); $$
);

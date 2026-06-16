
-- 1. Fire-once flag on content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS automation_fired_at timestamptz NULL;

-- 2. Automation run log
CREATE TABLE IF NOT EXISTS public.content_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  rule_key text NOT NULL DEFAULT 'long_form_published_v1',
  task_ids uuid[] NOT NULL DEFAULT '{}',
  tasks_created int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error text NULL,
  triggered_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_content_automation_runs_item_created
  ON public.content_automation_runs(content_item_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_automation_runs TO authenticated;
GRANT ALL ON public.content_automation_runs TO service_role;

ALTER TABLE public.content_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view automation runs"
  ON public.content_automation_runs FOR SELECT
  TO authenticated
  USING (public.user_can_access_project(project_id));

CREATE POLICY "Project members can insert automation runs"
  ON public.content_automation_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "Project members can update automation runs"
  ON public.content_automation_runs FOR UPDATE
  TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE POLICY "Project members can delete automation runs"
  ON public.content_automation_runs FOR DELETE
  TO authenticated
  USING (public.user_can_access_project(project_id));

-- 3. Trigger function — dispatches to edge function via pg_net.
--    Modeled on existing pg_net dispatch in migration 20260315094951 + public.net_http_post helper.
CREATE OR REPLACE FUNCTION public.fn_content_long_form_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'published'
     AND (OLD.stage IS DISTINCT FROM 'published')
     AND NEW.format = 'long_form'
     AND NEW.automation_fired_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/content-publish-automation',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYW5lemNjdXNzanR6enJicnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDc4NTYsImV4cCI6MjA5Njg4Mzg1Nn0.9aDadI8cUbJtNzvB-s5klHFCixnMWo6NHxTvPCqAyxI"}'::jsonb,
      body := jsonb_build_object('content_item_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_items_long_form_published ON public.content_items;
CREATE TRIGGER content_items_long_form_published
AFTER UPDATE OF stage ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_content_long_form_published();

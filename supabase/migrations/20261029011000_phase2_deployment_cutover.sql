-- CUTOVER ONLY: deploy guarded functions and the matching frontend first.
-- Unlike the prerequisite migration, this changes old-worker contracts.
-- No external HTTP request is made by applying this migration.

-- Abort rather than discard data if these formerly empty fields changed since
-- preflight. The deployed workers now read credentials from server secrets.
DO $$
DECLARE populated boolean;
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='venues' AND column_name='toast_client_secret') THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.venues WHERE nullif(trim(toast_client_secret),'''') IS NOT NULL)' INTO populated;
    IF populated THEN RAISE EXCEPTION 'Move venue Toast secrets to server secrets before dropping the column'; END IF;
    ALTER TABLE public.venues DROP COLUMN toast_client_secret;
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='venue_profiles' AND column_name='safe_combo') THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.venue_profiles WHERE nullif(trim(safe_combo),'''') IS NOT NULL)' INTO populated;
    IF populated THEN RAISE EXCEPTION 'Move venue safe combinations to a private store before dropping the column'; END IF;
    ALTER TABLE public.venue_profiles DROP COLUMN safe_combo;
  END IF;
END $$;

-- Random, function-scoped tokens are encrypted in Supabase Vault. Only a hash
-- is used for verification; neither tokens nor decrypted Vault rows are granted
-- to API users. Reapplying never rotates a working credential unexpectedly.
DO $$
DECLARE fn text; token text; sid uuid;
BEGIN
  FOREACH fn IN ARRAY ARRAY['automation-queue-sweeper','automation-stop-condition-sweep',
    'generate-recovery-report','reconcile-checkouts','content-publish-automation','sync-asana-logs'] LOOP
    IF NOT EXISTS(SELECT 1 FROM public.hq_edge_job_tokens WHERE function_name=fn) THEN
      token := gen_random_uuid()::text || gen_random_uuid()::text;
      SELECT vault.create_secret(token,'hq-edge-job:'||fn,'Function-scoped HQ job credential') INTO sid;
      INSERT INTO public.hq_edge_job_tokens(function_name,token_hash,secret_id)
        VALUES(fn,sha256(convert_to(token,'UTF8')),sid);
    END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.hq_dispatch_edge_function(p_function text,p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE token text; request_id bigint;
BEGIN
  SELECT s.decrypted_secret INTO token FROM public.hq_edge_job_tokens j
    JOIN vault.decrypted_secrets s ON s.id=j.secret_id WHERE j.function_name=p_function;
  IF token IS NULL THEN RAISE EXCEPTION 'Unknown or unconfigured job handler' USING ERRCODE='42501'; END IF;
  SELECT net.http_post(
    url := 'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/'||p_function,
    headers := jsonb_build_object('Content-Type','application/json','x-job-token',token),
    body := coalesce(p_body,'{}'::jsonb)
  ) INTO request_id;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.hq_dispatch_edge_function(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hq_dispatch_edge_function(text,jsonb) TO service_role;

-- Preserve schedule/active status; do not recreate intentionally disabled or
-- deleted jobs. The legacy checkout credential remains accepted by its handler.
DO $$ DECLARE j record; fn text; BEGIN
  FOR j IN SELECT jobid,jobname FROM cron.job WHERE jobname IN
    ('automation-queue-sweeper','automation-stop-condition','recovery-report-weekly','reconcile-checkouts-hourly') LOOP
    fn := CASE j.jobname WHEN 'automation-stop-condition' THEN 'automation-stop-condition-sweep'
      WHEN 'recovery-report-weekly' THEN 'generate-recovery-report'
      WHEN 'reconcile-checkouts-hourly' THEN 'reconcile-checkouts' ELSE j.jobname END;
    PERFORM cron.alter_job(j.jobid,command=>format('SELECT public.hq_dispatch_edge_function(%L,''{}''::jsonb);',fn));
  END LOOP;
END $$;

-- Database-triggered workers must use the same scoped credentials as cron.
CREATE OR REPLACE FUNCTION public.fn_content_long_form_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage='published' AND OLD.stage IS DISTINCT FROM 'published'
    AND NEW.format='long_form' AND NEW.automation_fired_at IS NULL THEN
    PERFORM public.hq_dispatch_edge_function('content-publish-automation',jsonb_build_object('content_item_id',NEW.id));
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.fn_backfill_new_asana_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    PERFORM public.hq_dispatch_edge_function('sync-asana-logs',jsonb_build_object('venue_id',NEW.venue_id,
      'backfill_since',to_char((now() AT TIME ZONE 'America/Los_Angeles')::date-interval '14 days','YYYY-MM-DD')));
  END IF;
  RETURN NEW;
END $$;

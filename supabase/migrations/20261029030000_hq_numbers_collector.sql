-- Phase 3: internal measurements with provenance. No provider calls, target
-- changes, revenue writes or schedule activation occur in this migration.

CREATE TABLE IF NOT EXISTS public.hq_number_collector_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL UNIQUE,
  collector_version text NOT NULL DEFAULT 'internal-v1',
  week_start date NOT NULL,
  observed_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  period_complete boolean NOT NULL,
  reporting_timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  status text NOT NULL CHECK (status IN ('running','completed','partial','failed')),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  triggered_by uuid,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (window_end >= window_start)
);

CREATE TABLE IF NOT EXISTS public.hq_number_collector_checks (
  run_id uuid NOT NULL REFERENCES public.hq_number_collector_runs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  pillar_key text NOT NULL,
  kpi_key text NOT NULL,
  value_week_start date,
  status text NOT NULL CHECK (status IN ('collected','manual_preserved','blocked','source_unavailable')),
  actual numeric,
  measurement_kind text CHECK (measurement_kind IN ('flow','snapshot')),
  source_provider text,
  source_ref text,
  reason text,
  coverage jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id,project_id,pillar_key,kpi_key)
);
CREATE INDEX IF NOT EXISTS hq_number_collector_checks_project
  ON public.hq_number_collector_checks(project_id,run_id);

ALTER TABLE public.hq_number_collector_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_number_collector_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_number_collector_runs,public.hq_number_collector_checks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hq_number_collector_runs,public.hq_number_collector_checks TO authenticated;
GRANT ALL ON public.hq_number_collector_runs,public.hq_number_collector_checks TO service_role;
CREATE POLICY hq_number_runs_admin_read ON public.hq_number_collector_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY hq_number_checks_admin_read ON public.hq_number_collector_checks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.project_kpi_values
  ADD COLUMN IF NOT EXISTS source_provider text,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS window_start timestamptz,
  ADD COLUMN IF NOT EXISTS window_end timestamptz,
  ADD COLUMN IF NOT EXISTS measurement_kind text,
  ADD COLUMN IF NOT EXISTS collector_run_id uuid REFERENCES public.hq_number_collector_runs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_kpi_values.observed_at IS 'When the source was read; window_start/window_end identify the event interval. A snapshot is not historical flow.';
COMMENT ON COLUMN public.project_kpi_values.source_provider IS 'NULL is legacy/manual. hq is reserved for the internal collector. Ordinary edits become manual.';

-- A human edit takes ownership of the value. API callers cannot make a manual
-- value look collector-owned by setting metadata or updated_by to NULL.
CREATE OR REPLACE FUNCTION public.hq_kpi_manual_provenance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog,public AS $$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin','service_role')
     OR coalesce(current_setting('hq.numbers_collector',true),'') <> 'internal-v1' THEN
    NEW.source_provider := 'manual';
    NEW.source_ref := 'manual entry';
    NEW.observed_at := clock_timestamp();
    NEW.window_start := NULL;
    NEW.window_end := NULL;
    NEW.measurement_kind := 'manual';
    NEW.collector_run_id := NULL;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.hq_kpi_manual_provenance() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS hq_kpi_manual_provenance ON public.project_kpi_values;
CREATE TRIGGER hq_kpi_manual_provenance BEFORE INSERT OR UPDATE ON public.project_kpi_values
  FOR EACH ROW EXECUTE FUNCTION public.hq_kpi_manual_provenance();

-- Date boundaries are calculated in Pacific local time, including DST. An
-- explicit current week is allowed for Sunday-night collection; never read
-- through a future Monday or claim that a partial period is complete.
CREATE OR REPLACE FUNCTION public.hq_numbers_reporting_window(
  p_week_start date DEFAULT NULL,
  p_observed_at timestamptz DEFAULT clock_timestamp()
)
RETURNS TABLE(week_start date,current_week_start date,window_start timestamptz,window_end timestamptz,period_complete boolean)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog,public AS $$
DECLARE v_current date; v_week date; v_start timestamptz; v_end timestamptz;
BEGIN
  IF p_observed_at IS NULL THEN RAISE EXCEPTION 'observed_at is required' USING ERRCODE='22023'; END IF;
  v_current := date_trunc('week',p_observed_at AT TIME ZONE 'America/Los_Angeles')::date;
  v_week := coalesce(p_week_start,v_current-7);
  IF extract(isodow FROM v_week) <> 1 OR v_week > v_current THEN
    RAISE EXCEPTION 'week_start must be a Monday no later than the current Pacific week' USING ERRCODE='22023';
  END IF;
  v_start := v_week::timestamp AT TIME ZONE 'America/Los_Angeles';
  v_end := (v_week+7)::timestamp AT TIME ZONE 'America/Los_Angeles';
  RETURN QUERY SELECT v_week,v_current,v_start,least(v_end,p_observed_at),v_end<=p_observed_at;
END;
$$;
REVOKE ALL ON FUNCTION public.hq_numbers_reporting_window(date,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_numbers_reporting_window(date,timestamptz) TO authenticated,service_role;

-- Only explicit fixture markers and reserved mail domains are excluded. A
-- legitimate lead is not rejected merely because a name contains "test".
CREATE OR REPLACE FUNCTION public.hq_numbers_fixture_lead(p_email text,p_source text,p_data jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT lower(coalesce(p_data->>'is_test','')) IN ('true','1')
    OR lower(coalesce(p_data->>'test_mode','')) IN ('true','1')
    OR lower(coalesce(p_data->>'is_internal','')) IN ('true','1')
    OR coalesce(p_source,'') ~* '(^|[:_ -])(test|fixture|smoke)([:_ -]|$)'
    OR lower(split_part(coalesce(p_email,''),'@',2)) IN ('example.com','example.org','example.net','localhost')
    OR lower(split_part(coalesce(p_email,''),'@',2)) ~ '\.(test|invalid|example)$';
$$;
REVOKE ALL ON FUNCTION public.hq_numbers_fixture_lead(text,text,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.collect_hq_numbers(
  p_week_start date DEFAULT NULL,
  p_run_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE
  v_observed timestamptz := clock_timestamp();
  v_window record;
  v_run public.hq_number_collector_runs%ROWTYPE;
  v_key text;
  v_prior_marker text := current_setting('hq.numbers_collector',true);
  k record;
  v_actual numeric;
  v_kind text;
  v_source text;
  v_reason text;
  v_status text;
  v_formats text[];
  v_week date;
  v_start timestamptz;
  v_end timestamptz;
  v_score numeric;
  v_value_id uuid;
  v_coverage jsonb;
  v_summary jsonb;
  v_period_coverage jsonb;
  v_unverified integer;
  v_missing_sessions integer;
  v_unattributed integer;
  v_collected integer := 0;
  v_preserved integer := 0;
  v_blocked integer := 0;
  v_failed integer := 0;
  v_without_target integer := 0;
  v_count integer := 0;
  v_stm constant uuid := '34cb1836-6ead-4478-915c-0a9dc552a554';
BEGIN
  -- current_user inside SECURITY DEFINER is its owner, never the caller.
  -- The explicit database-session path is for the SQL connector/cron only.
  IF NOT (
    coalesce(auth.role(),'')='service_role'
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin')
    OR (session_user IN ('postgres','supabase_admin')
        AND coalesce(current_setting('role',true),'none') IN ('none','postgres','supabase_admin'))
  ) THEN RAISE EXCEPTION 'Admin or service role required' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_window FROM public.hq_numbers_reporting_window(p_week_start,v_observed);
  v_key := coalesce(p_run_key,'hq-internal-v1:'||v_window.week_start::text||':'||(v_observed AT TIME ZONE 'America/Los_Angeles')::date::text);
  IF length(trim(v_key))=0 OR length(v_key)>200 THEN
    RAISE EXCEPTION 'run_key must contain 1 to 200 characters' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('hq-number-collector:'||v_key,0));
  SELECT * INTO v_run FROM public.hq_number_collector_runs WHERE run_key=v_key;
  IF FOUND THEN
    IF v_run.week_start<>v_window.week_start THEN
      RAISE EXCEPTION 'run_key already belongs to a different reporting week' USING ERRCODE='22023';
    END IF;
    RETURN v_run.summary || jsonb_build_object('run_id',v_run.id,'status',v_run.status,'replayed',true);
  END IF;

  INSERT INTO public.hq_number_collector_runs(run_key,week_start,observed_at,window_start,window_end,period_complete,status,triggered_by)
    VALUES(v_key,v_window.week_start,v_observed,v_window.window_start,v_window.window_end,v_window.period_complete,'running',auth.uid())
    RETURNING * INTO v_run;

  BEGIN
    PERFORM set_config('hq.numbers_collector','internal-v1',true);
    FOR k IN SELECT d.project_id,d.pillar_key,d.kpi_key,d.target,d.direction,d.unit
      FROM public.project_kpis d JOIN public.venues v ON v.id=d.project_id
      WHERE d.is_active AND v.is_active IS DISTINCT FROM false
        AND NOT v.is_prospect_shell AND v.project_type<>'client'
      ORDER BY d.project_id,d.pillar_key,d.sort_order,d.kpi_key
    LOOP
      v_count := v_count+1;
      v_actual := NULL; v_kind := NULL; v_source := NULL; v_formats := NULL;
      v_reason := 'No verified source mapping for this KPI; no value was invented.';
      v_status := 'blocked'; v_value_id := NULL; v_unverified := 0; v_missing_sessions := 0; v_unattributed := 0;
      v_week := NULL; v_start := v_window.window_start; v_end := v_window.window_end;
      v_coverage := jsonb_build_object('scope','HQ records only','external_reconciled',false);

      BEGIN
        -- Flow: one content item counts once despite multiple placements. Both
        -- a publication timestamp and a verified live placement are required.
        IF k.kpi_key IN ('daily_short','short_videos','videos_reels','content_posts','repurposed_pieces') THEN
          v_kind := 'flow'; v_week := v_window.week_start;
          v_formats := CASE k.kpi_key
            WHEN 'daily_short' THEN ARRAY['short','reel']
            WHEN 'short_videos' THEN ARRAY['short','reel']
            WHEN 'videos_reels' THEN ARRAY['long_form','short','reel']
            WHEN 'content_posts' THEN ARRAY['post','carousel','pin','story','short','reel','long_form','community']
            ELSE NULL END;
          v_source := 'hq:content_items+verified_content_placements:v1';
          SELECT count(*) FILTER (WHERE EXISTS(
              SELECT 1 FROM public.content_placements p WHERE p.content_item_id=c.id AND p.project_id=k.project_id
                AND p.status='published' AND p.verified_at IS NOT NULL AND p.verified_at<=v_observed
                AND (nullif(trim(p.live_url),'') IS NOT NULL OR nullif(trim(p.platform_post_id),'') IS NOT NULL)
            )), count(*) FILTER (WHERE NOT EXISTS(
              SELECT 1 FROM public.content_placements p WHERE p.content_item_id=c.id AND p.project_id=k.project_id
                AND p.status='published' AND p.verified_at IS NOT NULL AND p.verified_at<=v_observed
                AND (nullif(trim(p.live_url),'') IS NOT NULL OR nullif(trim(p.platform_post_id),'') IS NOT NULL)
            )) INTO v_actual,v_unverified
            FROM public.content_items c WHERE c.project_id=k.project_id AND c.stage='published'
              AND c.published_at>=v_start AND c.published_at<v_end
              AND (v_formats IS NULL OR c.format=ANY(v_formats))
              AND (k.kpi_key<>'repurposed_pieces' OR c.is_repurposed);
          v_coverage := v_coverage||jsonb_build_object('formats',v_formats,'unverified_publications_excluded',v_unverified,'unit','distinct verified content items');
          IF v_actual=0 AND v_unverified>0 THEN
            v_actual := NULL;
            v_reason := 'Publication records exist but lack verified live receipts; zero cannot be asserted.';
          END IF;

        -- Stock: read now, record in the observed current week. This never
        -- claims that today's catalog or approvals state existed last Sunday.
        ELSIF k.kpi_key IN ('products_live','listings_live','kdp_titles','books_live','oldest_waiting_days') THEN
          v_kind := 'snapshot'; v_week := v_window.current_week_start; v_start := v_observed; v_end := v_observed;
          IF k.kpi_key='oldest_waiting_days' THEN
            v_source := 'hq:open_owner_decisions:v1';
            SELECT coalesce(greatest(0,floor(extract(epoch FROM (v_observed-min(a.created_at)))/86400)),0)
              INTO v_actual FROM public.action_items a
              WHERE (a.bar_id=k.project_id OR a.venue_id=k.project_id)
                AND a.status IS DISTINCT FROM 'Done'
                AND (a.approval_status IS NULL OR a.approval_status IN ('Proposed','Unreviewed','Pending'))
                AND (a.snoozed_until IS NULL OR a.snoozed_until<=v_observed) AND a.created_at<=v_observed;
            v_coverage := v_coverage||jsonb_build_object('unit','elapsed whole days','excludes','done, approved, rejected and future snoozes');
          ELSE
            v_source := 'hq:product_listings+channel_product_channels:v1';
            SELECT CASE WHEN k.kpi_key='listings_live' THEN count(DISTINCT l.id) ELSE count(DISTINCT l.product_id) END
              INTO v_actual FROM public.product_listings l
              JOIN public.channel_product_channels c ON c.product_id=l.product_id AND c.project_id=k.project_id
              WHERE l.status='listed' AND (k.kpi_key NOT IN ('kdp_titles','books_live') OR l.outlet IN ('Amazon KDP','Kindle'));
            v_coverage := v_coverage||jsonb_build_object('unit',CASE WHEN k.kpi_key='listings_live' THEN 'listing records' ELSE 'distinct linked products' END,
              'outlets',CASE WHEN k.kpi_key IN ('kdp_titles','books_live') THEN 'Amazon KDP and Kindle; other book classifications unavailable' ELSE 'all recorded outlets' END,
              'marketplace_verification','HQ listed status; no external marketplace check');
          END IF;

        ELSIF k.project_id=v_stm AND k.kpi_key='audit_requests' THEN
          v_kind := 'flow'; v_week := v_window.week_start;
          v_source := 'hq:site_events.audit_start:trade_attributed_sessions:v1';
          WITH audit_events AS (
            SELECT nullif(trim(e.session_id),'') AS session_id,
              coalesce((e.vertical ~ '^[a-z0-9-]{2,40}$' AND e.src='for-'||e.vertical)
                OR e.path ~ '^/for/[a-z0-9-]{2,40}/?$',false) AS trade_attributed
              FROM public.site_events e WHERE e.event_type='audit_start' AND NOT e.is_internal
                AND e.created_at>=v_start AND e.created_at<v_end
                AND coalesce(e.src,'') !~* '(^|[:_ -])(test|fixture|smoke)([:_ -]|$)'
          ) SELECT count(DISTINCT session_id) FILTER (WHERE trade_attributed),
              count(*) FILTER (WHERE trade_attributed AND session_id IS NULL),
              count(*) FILTER (WHERE NOT trade_attributed)
            INTO v_actual,v_missing_sessions,v_unattributed FROM audit_events;
          v_coverage := v_coverage||jsonb_build_object('unit','distinct identified audit-start sessions','events_without_session',v_missing_sessions,
            'non_trade_or_unknown_attribution_excluded',v_unattributed,
            'attribution','src=for-{vertical} with matching safe vertical, or a /for/{vertical} path; not proof of completed audits');
          IF v_actual=0 AND v_missing_sessions>0 THEN
            v_actual:=NULL; v_reason:='Audit-start events lack session IDs; unique requests cannot be counted as zero.';
          END IF;

        ELSIF k.kpi_key='inbound_leads' THEN
          v_kind := 'flow'; v_week := v_window.week_start;
          v_source := 'hq:inbound_leads:scoped+fixture_filtered:v1';
          SELECT count(*) INTO v_actual FROM public.inbound_leads l
            WHERE (l.captured_for_project_id=k.project_id OR (k.project_id=v_stm AND l.captured_for_project_id IS NULL))
              AND l.created_at>=v_start AND l.created_at<v_end
              AND NOT public.hq_numbers_fixture_lead(l.email,l.source,l.qualifier_data);
          v_coverage := v_coverage||jsonb_build_object('unit','lead records','project_scope','captured_for_project_id; unassigned only belongs to STM',
            'fixture_filters',ARRAY['is_test','test_mode','is_internal','test/fixture/smoke source marker','reserved email domains']);
        ELSIF k.pillar_key IN ('cash','revenue','monetization') THEN
          v_reason := 'This internal collector has no ingested external receipts; revenue was not populated.';
          v_coverage := v_coverage||jsonb_build_object('required','verified Stripe, Shopify or other revenue-provider account and receipts');
        ELSIF k.kpi_key ~ '(followers|reach|subscribers|streams|visitors|signups|sales|royalties|income)' THEN
          v_reason := 'External source observations have not been ingested by this run; missing is not zero.';
          v_coverage := v_coverage||jsonb_build_object('required','verified analytics, audience, email or commerce source mapping');
        END IF;

        IF v_actual IS NOT NULL THEN
          v_score := CASE WHEN k.target IS NULL THEN NULL
            WHEN k.direction='checklist' THEN least(greatest(v_actual,0),100)
            WHEN k.direction='lower' AND v_actual=0 THEN 100
            WHEN k.direction='lower' AND k.target=0 THEN 0
            WHEN k.direction='lower' THEN greatest(0,least(k.target/v_actual,1)*100)
            WHEN k.target=0 THEN 0 ELSE greatest(0,least(v_actual/k.target,1)*100) END;
          INSERT INTO public.project_kpi_values(project_id,week_start,pillar_key,kpi_key,actual,score,note,updated_by,
            source_provider,source_ref,observed_at,window_start,window_end,measurement_kind,collector_run_id)
          VALUES(k.project_id,v_week,k.pillar_key,k.kpi_key,v_actual,v_score,
            CASE WHEN v_kind='snapshot' THEN 'Snapshot observed '||v_observed::text||'; not a historical end-of-week balance.'
              ELSE 'HQ source records in ['||v_start::text||', '||v_end::text||'); provider reconciliation unavailable.' END,NULL,
            'hq',v_source,v_observed,v_start,v_end,v_kind,v_run.id)
          ON CONFLICT(project_id,week_start,pillar_key,kpi_key) DO UPDATE SET
            actual=EXCLUDED.actual,score=EXCLUDED.score,note=EXCLUDED.note,updated_by=NULL,
            source_provider=EXCLUDED.source_provider,source_ref=EXCLUDED.source_ref,observed_at=EXCLUDED.observed_at,
            window_start=EXCLUDED.window_start,window_end=EXCLUDED.window_end,measurement_kind=EXCLUDED.measurement_kind,
            collector_run_id=EXCLUDED.collector_run_id,updated_at=v_observed
          WHERE project_kpi_values.source_provider='hq' AND project_kpi_values.updated_by IS NULL
          RETURNING id INTO v_value_id;
          IF v_value_id IS NULL THEN
            v_status:='manual_preserved'; v_reason:='Existing manual or other-provider observation preserved; collector did not overwrite it.';
          ELSE
            v_status:='collected'; v_reason:=NULL;
            UPDATE public.project_kpis SET source='auto' WHERE project_id=k.project_id AND pillar_key=k.pillar_key AND kpi_key=k.kpi_key AND source<>'auto';
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_status:='source_unavailable'; v_actual:=NULL;
        v_reason:='Source check failed ('||SQLSTATE||'); existing measurements were preserved.';
      END;

      IF v_status='collected' THEN
        v_collected:=v_collected+1;
        IF k.target IS NULL THEN v_without_target:=v_without_target+1; END IF;
      ELSIF v_status='manual_preserved' THEN
        v_preserved:=v_preserved+1;
        v_coverage:=v_coverage||jsonb_build_object('candidate_actual',v_actual);
        v_actual:=NULL;
      ELSIF v_status='source_unavailable' THEN v_failed:=v_failed+1;
      ELSE v_blocked:=v_blocked+1;
      END IF;

      INSERT INTO public.hq_number_collector_checks(run_id,project_id,pillar_key,kpi_key,value_week_start,status,actual,
        measurement_kind,source_provider,source_ref,reason,coverage)
      VALUES(v_run.id,k.project_id,k.pillar_key,k.kpi_key,v_week,v_status,v_actual,v_kind,
        CASE WHEN v_source IS NULL THEN NULL ELSE 'hq' END,v_source,v_reason,v_coverage);
    END LOOP;

    SELECT coalesce(jsonb_agg(jsonb_build_object('value_week_start',c.value_week_start,'measurement_kind',c.measurement_kind,
      'mapped_checks',c.checked,'collected',c.collected,'preserved',c.preserved,'unavailable',c.unavailable)
      ORDER BY c.value_week_start,c.measurement_kind),'[]'::jsonb) INTO v_period_coverage
    FROM (SELECT value_week_start,measurement_kind,count(*) AS checked,
      count(*) FILTER(WHERE status='collected') AS collected,
      count(*) FILTER(WHERE status='manual_preserved') AS preserved,
      count(*) FILTER(WHERE status IN ('blocked','source_unavailable')) AS unavailable
      FROM public.hq_number_collector_checks WHERE run_id=v_run.id AND value_week_start IS NOT NULL
      GROUP BY value_week_start,measurement_kind) c;

    v_summary:=jsonb_build_object('run_id',v_run.id,'run_key',v_key,'replayed',false,'reporting_timezone','America/Los_Angeles',
      'flow_week_start',v_window.week_start,'snapshot_week_start',v_window.current_week_start,
      'observed_at',v_observed,'window_start',v_window.window_start,'window_end',v_window.window_end,'period_complete',v_window.period_complete,
      'definitions_checked',v_count,'collected',v_collected,'manual_preserved',v_preserved,'blocked',v_blocked,'source_unavailable',v_failed,
      'collected_without_target',v_without_target,'targets_changed',0,'revenue_rows_written',0,
      'coverage_by_period',v_period_coverage,'unmapped_definitions',(SELECT count(*) FROM public.hq_number_collector_checks WHERE run_id=v_run.id AND source_ref IS NULL),
      'external_sources',jsonb_build_object('status','not ingested by this internal run','verified_mapping_and_receipts_required',true));
    v_status:=CASE WHEN v_blocked+v_failed>0 THEN 'partial' ELSE 'completed' END;
    UPDATE public.hq_number_collector_runs SET status=v_status,finished_at=clock_timestamp(),summary=v_summary||jsonb_build_object('status',v_status) WHERE id=v_run.id;
    PERFORM set_config('hq.numbers_collector',coalesce(v_prior_marker,''),true);
    RETURN v_summary||jsonb_build_object('status',v_status);
  EXCEPTION WHEN OTHERS THEN
    -- This inner block rolls back all measurements on an unexpected fatal
    -- error, while preserving the outer run row and an actionable failure.
    v_summary:=jsonb_build_object('run_id',v_run.id,'run_key',v_key,'status','failed','replayed',false,
      'error_code',SQLSTATE,'reason','Collector transaction failed; no measurements from this run were retained.');
    UPDATE public.hq_number_collector_runs SET status='failed',finished_at=clock_timestamp(),summary=v_summary WHERE id=v_run.id;
    PERFORM set_config('hq.numbers_collector',coalesce(v_prior_marker,''),true);
    RETURN v_summary;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.collect_hq_numbers(date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.collect_hq_numbers(date,text) TO authenticated,service_role;
COMMENT ON FUNCTION public.collect_hq_numbers(date,text) IS
  'Admin/service only. NULL week collects last completed Pacific week flows and current-week observed snapshots. Reuse run_key for an idempotent retry. No external calls, targets or revenue writes.';

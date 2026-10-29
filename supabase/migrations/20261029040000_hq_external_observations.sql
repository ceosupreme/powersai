-- Optional Phase 3 ingress for observations already verified through a real
-- provider read. This performs no external calls and writes no revenue ledger.

CREATE TABLE IF NOT EXISTS public.hq_external_metric_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  pillar_key text NOT NULL,
  kpi_key text NOT NULL,
  provider text NOT NULL CHECK(provider IN ('shopify','stripe','metricool','lovable')),
  account_ref text NOT NULL,
  source_ref text NOT NULL,
  measurement_kind text NOT NULL CHECK(measurement_kind IN ('flow','snapshot')),
  window_basis text NOT NULL CHECK(window_basis IN ('week','month_to_date','snapshot')),
  currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  mapping_version integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  verification_ref text NOT NULL,
  verified_at timestamptz NOT NULL,
  verified_by uuid,
  verified_actor text NOT NULL,
  UNIQUE(project_id,pillar_key,kpi_key),
  CHECK((measurement_kind='snapshot')=(window_basis='snapshot'))
);

CREATE TABLE IF NOT EXISTS public.hq_external_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL REFERENCES public.hq_external_metric_mappings(id) ON DELETE CASCADE,
  mapping_version integer NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  receipt_ref text NOT NULL,
  week_start date NOT NULL,
  actual numeric NOT NULL,
  observed_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  request_payload jsonb NOT NULL,
  evidence jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('received','collected','manual_preserved')),
  accepted_by uuid,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(mapping_id,mapping_version,receipt_ref)
);

ALTER TABLE public.hq_external_metric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_external_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_external_metric_mappings,public.hq_external_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.hq_external_metric_mappings,public.hq_external_observations TO authenticated;
GRANT ALL ON public.hq_external_metric_mappings,public.hq_external_observations TO service_role;
CREATE POLICY hq_external_mappings_admin_read ON public.hq_external_metric_mappings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY hq_external_observations_admin_read ON public.hq_external_observations FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.project_kpi_values ADD COLUMN IF NOT EXISTS external_observation_id uuid REFERENCES public.hq_external_observations(id) ON DELETE SET NULL;

-- Reuse the manual ownership boundary for both privileged ingestion paths.
CREATE OR REPLACE FUNCTION public.hq_kpi_manual_provenance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog,public AS $$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin','service_role')
     OR coalesce(current_setting('hq.numbers_collector',true),'') NOT IN ('internal-v1','external-v1') THEN
    NEW.source_provider := 'manual'; NEW.source_ref := 'manual entry'; NEW.observed_at := clock_timestamp();
    NEW.window_start := NULL; NEW.window_end := NULL; NEW.measurement_kind := 'manual';
    NEW.collector_run_id := NULL; NEW.external_observation_id := NULL; NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_hq_external_metric_mapping(
  p_project_id uuid,p_pillar_key text,p_kpi_key text,p_provider text,p_account_ref text,p_source_ref text,
  p_measurement_kind text,p_window_basis text,p_verification_ref text,p_currency text DEFAULT NULL,p_enabled boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE v_map public.hq_external_metric_mappings%ROWTYPE; v_unit text;
BEGIN
  IF NOT (coalesce(auth.role(),'')='service_role'
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin')
    OR (session_user IN ('postgres','supabase_admin') AND coalesce(current_setting('role',true),'none') IN ('none','postgres','supabase_admin')))
  THEN RAISE EXCEPTION 'Admin or service role required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.project_kpis d JOIN public.venues v ON v.id=d.project_id
      WHERE d.project_id=p_project_id AND d.pillar_key=p_pillar_key AND d.kpi_key=p_kpi_key AND d.is_active
        AND v.is_active IS DISTINCT FROM false AND NOT v.is_prospect_shell AND v.project_type<>'client') THEN
    RAISE EXCEPTION 'Mapping requires an existing active own-brand KPI' USING ERRCODE='22023';
  END IF;
  IF p_provider NOT IN ('shopify','stripe','metricool','lovable') OR p_provider IS NULL
    OR p_measurement_kind NOT IN ('flow','snapshot') OR p_measurement_kind IS NULL
    OR p_window_basis NOT IN ('week','month_to_date','snapshot') OR p_window_basis IS NULL
    OR (p_measurement_kind='snapshot') IS DISTINCT FROM (p_window_basis='snapshot')
    OR nullif(trim(p_account_ref),'') IS NULL OR length(p_account_ref)>512
    OR nullif(trim(p_source_ref),'') IS NULL OR length(p_source_ref)>2048
    OR nullif(trim(p_verification_ref),'') IS NULL OR length(p_verification_ref)>4096
    OR (p_currency IS NOT NULL AND p_currency !~ '^[A-Z]{3}$') OR p_enabled IS NULL THEN
    RAISE EXCEPTION 'Valid provider, account, source, period and verification reference are required' USING ERRCODE='22023';
  END IF;
  SELECT unit INTO v_unit FROM public.project_kpis WHERE project_id=p_project_id AND pillar_key=p_pillar_key AND kpi_key=p_kpi_key;
  IF upper(coalesce(v_unit,'')) IN ('USD','EUR','GBP','CAD','AUD') AND p_currency IS DISTINCT FROM upper(v_unit) THEN
    RAISE EXCEPTION 'Mapping currency must match the KPI currency unit' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.hq_external_metric_mappings(project_id,pillar_key,kpi_key,provider,account_ref,source_ref,
    measurement_kind,window_basis,currency,enabled,verification_ref,verified_at,verified_by,verified_actor)
  VALUES(p_project_id,p_pillar_key,p_kpi_key,p_provider,trim(p_account_ref),trim(p_source_ref),p_measurement_kind,p_window_basis,
    p_currency,p_enabled,p_verification_ref,clock_timestamp(),auth.uid(),session_user)
  ON CONFLICT(project_id,pillar_key,kpi_key) DO UPDATE SET
    provider=EXCLUDED.provider,account_ref=EXCLUDED.account_ref,source_ref=EXCLUDED.source_ref,
    measurement_kind=EXCLUDED.measurement_kind,window_basis=EXCLUDED.window_basis,currency=EXCLUDED.currency,
    enabled=EXCLUDED.enabled,verification_ref=EXCLUDED.verification_ref,verified_at=EXCLUDED.verified_at,
    verified_by=EXCLUDED.verified_by,verified_actor=EXCLUDED.verified_actor,
    mapping_version=hq_external_metric_mappings.mapping_version+1
  RETURNING * INTO v_map;
  RETURN to_jsonb(v_map);
END;
$$;

CREATE OR REPLACE FUNCTION public.ingest_hq_external_observation(
  p_mapping_id uuid,p_week_start date,p_actual numeric,p_observed_at timestamptz,
  p_window_start timestamptz,p_window_end timestamptz,p_receipt_ref text,p_evidence jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE
  v_map public.hq_external_metric_mappings%ROWTYPE;
  v_existing public.hq_external_observations%ROWTYPE;
  v_id uuid;
  v_key text;
  v_payload jsonb;
  v_result jsonb;
  v_period record;
  v_current_week date;
  v_month_start timestamptz;
  v_target numeric;
  v_direction text;
  v_score numeric;
  v_value_id uuid;
  v_marker text := current_setting('hq.numbers_collector',true);
  v_status text;
BEGIN
  IF NOT (coalesce(auth.role(),'')='service_role'
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin')
    OR (session_user IN ('postgres','supabase_admin') AND coalesce(current_setting('role',true),'none') IN ('none','postgres','supabase_admin')))
  THEN RAISE EXCEPTION 'Admin or service role required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_map FROM public.hq_external_metric_mappings WHERE id=p_mapping_id FOR SHARE;
  IF NOT FOUND OR NOT v_map.enabled OR v_map.verified_at IS NULL THEN
    RAISE EXCEPTION 'An enabled verified provider/account/KPI mapping is required' USING ERRCODE='22023';
  END IF;
  SELECT k.target,k.direction INTO v_target,v_direction FROM public.project_kpis k JOIN public.venues v ON v.id=k.project_id
    WHERE k.project_id=v_map.project_id AND k.pillar_key=v_map.pillar_key AND k.kpi_key=v_map.kpi_key AND k.is_active
      AND v.is_active IS DISTINCT FROM false AND NOT v.is_prospect_shell AND v.project_type<>'client';
  IF NOT FOUND THEN RAISE EXCEPTION 'Mapped KPI is no longer active' USING ERRCODE='22023'; END IF;
  IF p_actual IS NULL OR p_actual::text IN ('NaN','Infinity','-Infinity')
    OR p_observed_at IS NULL OR p_observed_at>clock_timestamp()+interval '1 minute'
    OR p_week_start IS NULL OR extract(isodow FROM p_week_start)<>1
    OR p_window_start IS NULL OR p_window_end IS NULL OR p_window_end<p_window_start OR p_window_end>p_observed_at
    OR nullif(trim(p_receipt_ref),'') IS NULL OR length(p_receipt_ref)>2048
    OR jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' OR octet_length(p_evidence::text)>65536
    OR p_evidence->'query_complete' IS DISTINCT FROM 'true'::jsonb
    OR coalesce(p_evidence->>'source_status','') NOT IN ('active','trial','development','unknown') THEN
    RAISE EXCEPTION 'Finite observation, dated window, completed query receipt and source status are required' USING ERRCODE='22023';
  END IF;
  IF v_map.currency IS NOT NULL AND p_evidence->>'currency' IS DISTINCT FROM v_map.currency THEN
    RAISE EXCEPTION 'Observation currency must match the verified metric mapping' USING ERRCODE='22023';
  END IF;
  v_current_week := date_trunc('week',p_observed_at AT TIME ZONE 'America/Los_Angeles')::date;
  IF v_map.window_basis='snapshot' THEN
    IF p_window_start<>p_observed_at OR p_window_end<>p_observed_at OR p_week_start<>v_current_week THEN
      RAISE EXCEPTION 'Snapshots belong to their observed week and instant, not a historical flow window' USING ERRCODE='22023';
    END IF;
  ELSIF v_map.window_basis='week' THEN
    SELECT * INTO v_period FROM public.hq_numbers_reporting_window(p_week_start,p_observed_at);
    IF p_window_start<>v_period.window_start OR p_window_end<>v_period.window_end OR p_window_end=p_window_start THEN
      RAISE EXCEPTION 'Weekly observations must cover the exact Pacific week capped at observation' USING ERRCODE='22023';
    END IF;
  ELSE
    v_month_start:=date_trunc('month',p_observed_at AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Los_Angeles';
    IF p_week_start<>v_current_week OR p_window_start<>v_month_start OR p_window_end<>p_observed_at THEN
      RAISE EXCEPTION 'Month-to-date observations belong to the observed week with the exact current Pacific month window' USING ERRCODE='22023';
    END IF;
  END IF;

  v_key:=coalesce(p_idempotency_key,'hq-external:'||p_mapping_id::text||':'||v_map.mapping_version::text||':'||md5(p_receipt_ref));
  IF length(trim(v_key))=0 OR length(v_key)>300 THEN RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE='22023'; END IF;
  v_payload:=jsonb_build_object('mapping_id',p_mapping_id,'mapping_version',v_map.mapping_version,'provider',v_map.provider,
    'account_ref',v_map.account_ref,'source_ref',v_map.source_ref,'week_start',p_week_start,'actual',p_actual,'observed_at',p_observed_at,
    'window_start',p_window_start,'window_end',p_window_end,'receipt_ref',trim(p_receipt_ref),'evidence',p_evidence);
  PERFORM pg_advisory_xact_lock(hashtextextended('hq-external-key:'||v_key,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('hq-external-receipt:'||p_mapping_id::text||':'||v_map.mapping_version::text||':'||trim(p_receipt_ref),0));
  SELECT * INTO v_existing FROM public.hq_external_observations WHERE idempotency_key=v_key;
  IF NOT FOUND THEN
    SELECT * INTO v_existing FROM public.hq_external_observations
      WHERE mapping_id=p_mapping_id AND mapping_version=v_map.mapping_version AND receipt_ref=trim(p_receipt_ref);
  END IF;
  IF FOUND THEN
    IF v_existing.request_payload IS DISTINCT FROM v_payload THEN
      RAISE EXCEPTION 'Receipt or idempotency key already represents a different observation' USING ERRCODE='22023';
    END IF;
    RETURN v_existing.result||jsonb_build_object('replayed',true);
  END IF;

  INSERT INTO public.hq_external_observations(mapping_id,mapping_version,idempotency_key,receipt_ref,week_start,actual,
    observed_at,window_start,window_end,request_payload,evidence,status,accepted_by)
  VALUES(p_mapping_id,v_map.mapping_version,v_key,trim(p_receipt_ref),p_week_start,p_actual,p_observed_at,p_window_start,p_window_end,
    v_payload,p_evidence,'received',auth.uid()) RETURNING id INTO v_id;
  v_score:=CASE WHEN v_target IS NULL THEN NULL WHEN v_direction='checklist' THEN least(greatest(p_actual,0),100)
    WHEN v_direction='lower' AND p_actual=0 THEN 100 WHEN v_direction='lower' AND v_target=0 THEN 0
    WHEN v_direction='lower' THEN greatest(0,least(v_target/p_actual,1)*100)
    WHEN v_target=0 THEN 0 ELSE greatest(0,least(p_actual/v_target,1)*100) END;
  PERFORM set_config('hq.numbers_collector','external-v1',true);
  INSERT INTO public.project_kpi_values(project_id,week_start,pillar_key,kpi_key,actual,score,note,updated_by,
    source_provider,source_ref,observed_at,window_start,window_end,measurement_kind,collector_run_id,external_observation_id)
  VALUES(v_map.project_id,p_week_start,v_map.pillar_key,v_map.kpi_key,p_actual,v_score,
    'Verified '||v_map.provider||' observation; source status: '||(p_evidence->>'source_status')||'. Receipt: '||trim(p_receipt_ref)||
    '. This observation does not establish that the business or a paid store is operational.',NULL,
    v_map.provider,v_map.source_ref,p_observed_at,p_window_start,p_window_end,v_map.measurement_kind,NULL,v_id)
  ON CONFLICT(project_id,week_start,pillar_key,kpi_key) DO UPDATE SET
    actual=EXCLUDED.actual,score=EXCLUDED.score,note=EXCLUDED.note,updated_by=NULL,
    source_provider=EXCLUDED.source_provider,source_ref=EXCLUDED.source_ref,observed_at=EXCLUDED.observed_at,
    window_start=EXCLUDED.window_start,window_end=EXCLUDED.window_end,measurement_kind=EXCLUDED.measurement_kind,
    collector_run_id=NULL,external_observation_id=EXCLUDED.external_observation_id,updated_at=clock_timestamp()
  WHERE project_kpi_values.source_provider=v_map.provider AND project_kpi_values.source_ref=v_map.source_ref
    AND project_kpi_values.updated_by IS NULL AND (project_kpi_values.observed_at IS NULL OR project_kpi_values.observed_at<=p_observed_at)
    AND EXISTS(SELECT 1 FROM public.hq_external_observations old_observation WHERE old_observation.id=project_kpi_values.external_observation_id
      AND old_observation.request_payload->>'account_ref'=v_map.account_ref
      AND coalesce(old_observation.evidence->>'currency','')=coalesce(v_map.currency,''))
  RETURNING id INTO v_value_id;
  v_status:=CASE WHEN v_value_id IS NULL THEN 'manual_preserved' ELSE 'collected' END;
  IF v_value_id IS NOT NULL THEN
    UPDATE public.project_kpis SET source='auto' WHERE project_id=v_map.project_id AND pillar_key=v_map.pillar_key AND kpi_key=v_map.kpi_key AND source<>'auto';
  END IF;
  PERFORM set_config('hq.numbers_collector',coalesce(v_marker,''),true);
  v_result:=jsonb_build_object('observation_id',v_id,'mapping_id',p_mapping_id,'status',v_status,'replayed',false,
    'project_id',v_map.project_id,'pillar_key',v_map.pillar_key,'kpi_key',v_map.kpi_key,'week_start',p_week_start,
    'measurement_kind',v_map.measurement_kind,'window_basis',v_map.window_basis,'source_status',p_evidence->>'source_status',
    'target_unchanged',true,'revenue_rows_written',0,'preservation_reason',
      CASE WHEN v_value_id IS NULL THEN 'Manual, other-provider or more recent observation retained.' ELSE NULL END);
  UPDATE public.hq_external_observations SET status=v_status,result=v_result WHERE id=v_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_hq_external_metric_mapping(uuid,text,text,text,text,text,text,text,text,text,boolean),
  public.ingest_hq_external_observation(uuid,date,numeric,timestamptz,timestamptz,timestamptz,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_hq_external_metric_mapping(uuid,text,text,text,text,text,text,text,text,text,boolean),
  public.ingest_hq_external_observation(uuid,date,numeric,timestamptz,timestamptz,timestamptz,text,jsonb,text) TO authenticated,service_role;

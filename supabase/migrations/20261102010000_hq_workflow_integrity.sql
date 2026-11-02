-- User-triggered workflows run as the caller: existing table RLS remains authoritative.
ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS follow_up_completed_at timestamptz;
ALTER TABLE public.capture_items ADD COLUMN IF NOT EXISTS routed_record_id uuid;
ALTER TABLE public.capture_items ADD COLUMN IF NOT EXISTS routed_table text;
ALTER TABLE public.log_entries ADD COLUMN IF NOT EXISTS intent text;

CREATE OR REPLACE FUNCTION public.hq_promote_inbound_lead(p_lead_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE lead public.inbound_leads%ROWTYPE; company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO lead FROM public.inbound_leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found or access denied'; END IF;
  IF lead.promoted_company_id IS NOT NULL THEN RETURN lead.promoted_company_id; END IF;
  IF lead.status NOT IN ('new','reviewed') THEN RAISE EXCEPTION 'Only new or reviewed leads can be promoted'; END IF;
  INSERT INTO public.crm_companies(name,status,notes,created_by)
    VALUES(coalesce(nullif(trim(lead.business_name),''),lead.name),'prospect',lead.message,auth.uid()) RETURNING id INTO company_id;
  INSERT INTO public.crm_contacts(company_id,first_name,last_name,email,phone,is_primary,created_by)
    VALUES(company_id,split_part(trim(lead.name),' ',1),nullif(regexp_replace(trim(lead.name),'^\S+\s*',''),''),lead.email,lead.phone,true,auth.uid());
  INSERT INTO public.crm_deals(company_id,title,stage,notes,created_by)
    VALUES(company_id,coalesce(nullif(trim(lead.business_name),''),lead.name)||' — inbound inquiry','lead',lead.message,auth.uid());
  UPDATE public.inbound_leads SET status='promoted',promoted_company_id=company_id WHERE id=p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead could not be updated'; END IF;
  RETURN company_id;
END $$;
REVOKE ALL ON FUNCTION public.hq_promote_inbound_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_promote_inbound_lead(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.hq_route_capture(p_capture_id uuid,p_project_id uuid,p_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item public.capture_items%ROWTYPE; record_id uuid; target text; kit_id uuid; heading text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO item FROM public.capture_items WHERE id=p_capture_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capture not found or access denied'; END IF;
  IF item.status='routed' THEN
    IF item.routed_record_id IS NULL THEN RAISE EXCEPTION 'This older capture has no linked destination; review it before routing again'; END IF;
    RETURN jsonb_build_object('id',item.routed_record_id,'table',item.routed_table);
  END IF;
  IF item.status <> 'inbox' THEN RAISE EXCEPTION 'Only inbox captures can be routed'; END IF;
  IF p_type <> 'crm_lead' AND (p_project_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.venues WHERE id=p_project_id)) THEN
    RAISE EXCEPTION 'Choose an accessible project';
  END IF;
  heading := left(split_part(item.raw_text,E'\n',1),200);
  CASE p_type
    WHEN 'task' THEN
      target := 'tasks';
      INSERT INTO public.tasks(title,description,bar_id,venue_id,created_by,status)
        VALUES(heading,item.raw_text,p_project_id,p_project_id,auth.uid(),'Todo') RETURNING id INTO record_id;
    WHEN 'idea','content_idea' THEN
      target := 'content_items';
      INSERT INTO public.content_items(project_id,title,stage,purpose_type,purpose,brief)
        VALUES(p_project_id,heading,'idea','teach','From Capture Inbox',jsonb_build_object('summary',item.raw_text)) RETURNING id INTO record_id;
    WHEN 'note' THEN
      target := 'knowledge_base';
      INSERT INTO public.knowledge_base(venue_id,scope,category,subcategory,title,full_text,status,owner_id)
        VALUES(p_project_id,'venue_specific','reference','capture_note',heading,item.raw_text,'draft',auth.uid()) RETURNING id INTO record_id;
    WHEN 'brand_asset' THEN
      IF trim(item.raw_text) !~ '^https?://[^[:space:]]+$' THEN
        RAISE EXCEPTION 'For a brand asset, capture a single http(s) file URL, or upload the file in Brand Kit. Text can be routed as a note.';
      END IF;
      target := 'brand_kit_links';
      INSERT INTO public.brand_kits(project_id,created_by) VALUES(p_project_id,auth.uid()) ON CONFLICT(project_id) DO NOTHING;
      SELECT id INTO kit_id FROM public.brand_kits WHERE project_id=p_project_id;
      INSERT INTO public.brand_kit_links(kit_id,label,url,category)
        VALUES(kit_id,'Captured asset',trim(item.raw_text),'asset') RETURNING id INTO record_id;
    WHEN 'crm_lead' THEN
      target := 'crm_companies';
      INSERT INTO public.crm_companies(name,status,notes,created_by)
        VALUES(heading,'prospect',item.raw_text,auth.uid()) RETURNING id INTO record_id;
    ELSE RAISE EXCEPTION 'Unsupported capture type';
  END CASE;
  UPDATE public.capture_items SET status='routed',routed_project_id=p_project_id,routed_type=p_type::public.capture_routed_type,
    routed_at=now(),ai_suggestion_status='accepted',routed_record_id=record_id,routed_table=target WHERE id=p_capture_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capture could not be updated'; END IF;
  RETURN jsonb_build_object('id',record_id,'table',target);
END $$;
REVOKE ALL ON FUNCTION public.hq_route_capture(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_route_capture(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.hq_create_pipeline(p_job jsonb,p_steps jsonb,p_new_content jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE project uuid := (p_job->>'project_id')::uuid; job_id uuid; previous_id uuid; step_id uuid;
  v_target_id uuid := (p_job->>'target_id')::uuid; step jsonb; n int := 0; existing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.venues WHERE id=project) THEN RAISE EXCEPTION 'Project not found or access denied'; END IF;
  IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR jsonb_array_length(p_steps)=0 THEN RAISE EXCEPTION 'Pipeline needs steps'; END IF;
  -- Serializes retries/double-clicks for the same project and target without hiding old duplicates.
  PERFORM pg_advisory_xact_lock(hashtextextended(project::text||':'||(p_job->>'kind')||':'||coalesce(v_target_id::text,p_job->>'target_key',p_job->>'title'),0));
  SELECT id INTO existing_id FROM public.production_jobs
    WHERE project_id=project AND kind=p_job->>'kind' AND status NOT IN ('finished','parked')
      AND ((v_target_id IS NOT NULL AND production_jobs.target_id=v_target_id)
        OR (p_job->>'target_key' IS NOT NULL AND target_key=p_job->>'target_key'))
    ORDER BY created_at LIMIT 1;
  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;
  IF p_new_content IS NOT NULL AND v_target_id IS NULL THEN
    INSERT INTO public.content_items(project_id,title,stage,purpose_type,purpose,brief)
      VALUES(project,p_new_content->>'title','idea','teach','From Answer Bank',jsonb_build_object('summary',p_new_content->>'summary')) RETURNING id INTO v_target_id;
  END IF;
  INSERT INTO public.production_jobs(project_id,kind,title,target_type,target_id,target_key,recipe,level,money_destination,status,current_step,created_by,result_links)
    VALUES(project,p_job->>'kind',p_job->>'title',p_job->>'target_type',v_target_id,p_job->>'target_key',p_job->'recipe',
      (p_job->>'level')::smallint,p_job->>'money_destination',CASE WHEN p_steps->0->>'owner_kind'='owner' THEN 'ready' ELSE 'running' END,1,'owner','[]') RETURNING id INTO job_id;
  FOR step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    n := n+1;
    INSERT INTO public.action_items(bar_id,venue_id,job_id,step_order,method_id,owner_kind,title,detail,facts,status,approval_status,priority,assignee,source,is_manual,created_by_id,due_date,depends_on)
      VALUES(project,project,job_id,n,(step->>'method_id')::uuid,step->>'owner_kind',step->>'title',step->>'detail',step->>'facts','Open',
        CASE WHEN step->>'owner_kind'='claude' THEN 'Auto' WHEN n=1 THEN 'Approved' ELSE 'Blocked' END,
        step->>'priority',step->>'assignee','pipeline',true,auth.uid(),(step->>'due_date')::date,previous_id) RETURNING id INTO step_id;
    previous_id := step_id;
  END LOOP;
  RETURN job_id;
END $$;
REVOKE ALL ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_create_pipeline(jsonb,jsonb,jsonb) TO authenticated;

-- A parked job is the reversible cancel state; reject late worker writes on its steps.
CREATE OR REPLACE FUNCTION public.hq_guard_parked_pipeline_step() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE job_status text;
BEGIN
  SELECT status INTO job_status FROM public.production_jobs WHERE id=OLD.job_id FOR UPDATE;
  IF job_status='parked' THEN
    RAISE EXCEPTION 'This pipeline is paused. Resume it before updating steps.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_guard_parked_pipeline_step ON public.action_items;
CREATE TRIGGER hq_guard_parked_pipeline_step BEFORE UPDATE ON public.action_items
  FOR EACH ROW WHEN (OLD.job_id IS NOT NULL) EXECUTE FUNCTION public.hq_guard_parked_pipeline_step();

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS avg_ticket numeric CHECK (avg_ticket >= 0);
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS close_rate numeric CHECK (close_rate BETWEEN 0 AND 1);

CREATE OR REPLACE FUNCTION public.hq_pause_pipeline(p_job_id uuid,p_paused boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE job public.production_jobs%ROWTYPE; next_step public.action_items%ROWTYPE;
BEGIN
  SELECT * INTO job FROM public.production_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pipeline not found or access denied'; END IF;
  IF p_paused THEN
    IF job.status='finished' THEN RAISE EXCEPTION 'Completed pipelines cannot be canceled'; END IF;
    IF job.status='parked' THEN RETURN; END IF;
    UPDATE public.action_items SET approval_status='Rejected' WHERE job_id=p_job_id AND status <> 'Done';
    UPDATE public.production_jobs SET status='parked' WHERE id=p_job_id;
  ELSE
    SELECT * INTO next_step FROM public.action_items WHERE job_id=p_job_id AND status<>'Done' ORDER BY step_order LIMIT 1;
    UPDATE public.production_jobs SET status=CASE WHEN next_step.id IS NULL THEN 'finished' WHEN next_step.owner_kind='claude' THEN 'running' ELSE 'ready' END,
      current_step=next_step.step_order WHERE id=p_job_id;
    UPDATE public.action_items a SET approval_status=CASE WHEN a.owner_kind='claude' THEN 'Auto'
      WHEN a.depends_on IS NULL OR EXISTS(SELECT 1 FROM public.action_items predecessor WHERE predecessor.id=a.depends_on AND predecessor.status='Done') THEN 'Approved' ELSE 'Blocked' END
      WHERE a.job_id=p_job_id AND a.status<>'Done';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.hq_pause_pipeline(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_pause_pipeline(uuid,boolean) TO authenticated;

-- The browser and direct API writes share the same approval threshold.
CREATE OR REPLACE FUNCTION public.hq_guard_content_approval() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF NEW.approved_at IS NOT NULL AND (TG_OP='INSERT' OR NEW.approved_at IS DISTINCT FROM OLD.approved_at)
     AND (coalesce(NEW.quality_score,0)<80 OR coalesce(cardinality(NEW.quality_fails),0)>0) THEN
    RAISE EXCEPTION 'Approval needs a quality score of at least 80 and no hard failures.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_guard_content_approval ON public.content_items;
CREATE TRIGGER hq_guard_content_approval BEFORE INSERT OR UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.hq_guard_content_approval();

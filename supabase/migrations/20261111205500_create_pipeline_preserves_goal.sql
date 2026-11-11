-- Keep the current pipeline RPC and existing step/status behavior intact.
-- Only persist the optional user-selected growth goal with the plan.

CREATE OR REPLACE FUNCTION public.hq_create_pipeline(p_job jsonb, p_steps jsonb, p_new_content jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.content_items(project_id,title,stage,purpose_type,purpose,brief,created_by)
      VALUES(project,p_new_content->>'title','idea','teach','From Answer Bank',jsonb_build_object('summary',p_new_content->>'summary'),auth.uid()) RETURNING id INTO v_target_id;
  END IF;
  INSERT INTO public.production_jobs(project_id,kind,title,target_type,target_id,target_key,recipe,level,money_destination,goal_text,goal_pillar_key,goal_kpi_key,status,current_step,created_by,result_links)
    VALUES(project,p_job->>'kind',p_job->>'title',p_job->>'target_type',v_target_id,p_job->>'target_key',p_job->'recipe',
      (p_job->>'level')::smallint,p_job->>'money_destination',NULLIF(p_job->>'goal_text',''),NULLIF(p_job->>'goal_pillar_key',''),NULLIF(p_job->>'goal_kpi_key',''),CASE WHEN p_steps->0->>'owner_kind'='owner' THEN 'ready' ELSE 'running' END,1,'owner','[]') RETURNING id INTO job_id;
  FOR step IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
    n := n+1;
    INSERT INTO public.action_items(bar_id,venue_id,job_id,step_order,method_id,owner_kind,title,detail,facts,status,approval_status,priority,assignee,assignee_id,source,is_manual,created_by_id,due_date,depends_on)
      VALUES(project,project,job_id,n,(step->>'method_id')::uuid,step->>'owner_kind',step->>'title',step->>'detail',step->>'facts','Open',
        CASE WHEN step->>'owner_kind'='claude' THEN 'Auto' WHEN n=1 THEN 'Approved' ELSE 'Blocked' END,
        step->>'priority',step->>'assignee',CASE WHEN step->>'owner_kind'='owner' THEN auth.uid() ELSE NULL END,'pipeline',true,auth.uid(),(step->>'due_date')::date,previous_id) RETURNING id INTO step_id;
    previous_id := step_id;
  END LOOP;
  RETURN job_id;
END $function$;

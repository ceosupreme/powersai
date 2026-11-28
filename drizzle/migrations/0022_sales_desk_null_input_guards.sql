DO $repair$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_log_result(uuid,text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'OR p_details->>''reason'' NOT IN','OR p_details->>''reason'' IS NULL OR p_details->>''reason'' NOT IN');
 EXECUTE body;
 SELECT pg_get_functiondef('public.hq_lead_set_preview_link(uuid,text)'::regprocedure) INTO body;
 body:=replace(body,'IF p_link !~','IF p_link IS NULL OR p_link !~');
 EXECUTE body;
 SELECT pg_get_functiondef('public.hq_lead_confirm_won(uuid,uuid,numeric,numeric,text,uuid,uuid)'::regprocedure) INTO body;
 body:=replace(body,'IF NOT pay ? p_pay_level OR','IF p_pay_level IS NULL OR p_pay_level NOT IN (''rep_alone'',''rep_with_owner'',''rep_handed_over'',''owner_deal'') OR NOT pay ? p_pay_level OR');
 EXECUTE body;
END $repair$;
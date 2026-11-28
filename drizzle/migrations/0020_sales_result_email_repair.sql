DO $repair$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_log_result(uuid,text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'email text;','client_email_value text;');
 body:=replace(body,'email:=public.hq_normalize_email','client_email_value:=public.hq_normalize_email');
 body:=replace(body,'OR email IS NULL','OR client_email_value IS NULL');
 body:=replace(body,'''client_email'',email,','''client_email'',client_email_value,');
 EXECUTE body;
END $repair$;
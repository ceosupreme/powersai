DO $repair$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_confirm_won(uuid,uuid,numeric,numeric,text,uuid,uuid)'::regprocedure) INTO body;
 body:=replace(body,'UPDATE public.prospects SET status=''won'',','IF public.has_role(p_closed_by,''admin'') THEN p_pay_level:=''owner_deal''; END IF; UPDATE public.prospects SET status=''won'',');
 EXECUTE body;
END $repair$;
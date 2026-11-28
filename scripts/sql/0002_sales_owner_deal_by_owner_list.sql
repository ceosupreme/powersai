-- Owner's own deal = the closer is on the sales_settings 'owners' list, not any admin (Claude, 2026-11-28).
-- HQ has several admins (partners, agents); an admin who sells still earns rep pay.
-- The live 'owners' row holds the owner's user id; seeded empty here so fresh databases stay neutral.
INSERT INTO public.sales_settings(key,value) VALUES('owners','[]'::jsonb) ON CONFLICT (key) DO NOTHING;
DO $fix$
DECLARE body text; old_text text; new_text text;
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_confirm_won(uuid,uuid,numeric,numeric,text,uuid,uuid)'::regprocedure) INTO body;
 old_text := $a$IF public.has_role(p_closed_by,'admin') THEN p_pay_level:='owner_deal'; END IF;$a$;
 new_text := $b$IF EXISTS(SELECT 1 FROM public.sales_settings s, jsonb_array_elements_text(s.value) AS o(id) WHERE s.key='owners' AND jsonb_typeof(s.value)='array' AND o.id=p_closed_by::text) THEN p_pay_level:='owner_deal'; END IF;$b$;
 IF position(old_text IN body)=0 THEN RAISE EXCEPTION 'hq_lead_confirm_won owner fix did not find its text'; END IF;
 EXECUTE replace(body, old_text, new_text);
END $fix$;

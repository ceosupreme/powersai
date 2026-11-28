-- Sales desk review fixes (Claude, 2026-11-28). Applied live with the SQL tool; kept here as the record.
-- Runs after drizzle/migrations/0018..0023. Each patch fails loudly if the text it expects is missing.
-- 1. Out of tries after 4 failed tries even if the lead talked before (preview leads still never rest).
-- 2. Next tries never land on a Saturday or Sunday.
-- 3. Intro call needs a valid phone OR email, not both.
-- 4. The stale sweep leaves parked leads alone (waiting on Sean or on a preview link, intro booked).
CREATE OR REPLACE FUNCTION public.hq_sales_weekday(p_day date) RETURNS date LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE extract(isodow FROM p_day) WHEN 6 THEN p_day+2 WHEN 7 THEN p_day+1 ELSE p_day END
$$;
REVOKE ALL ON FUNCTION public.hq_sales_weekday(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hq_sales_weekday(date) TO authenticated,service_role;

DO $fix$
DECLARE body text; old_text text; new_text text; pairs text[][];
BEGIN
 SELECT pg_get_functiondef('public.hq_lead_log_result(uuid,text,jsonb)'::regprocedure) INTO body;
 pairs := ARRAY[
  ARRAY[$a$ELSIF a>=(c->>'max_tries')::int AND p.last_contacted_at IS NULL THEN$a$,
        $b$ELSIF a>=(c->>'max_tries')::int THEN$b$],
  ARRAY[$a$nxt:=(local_day+(c->>'rest_days')::int+time '09:00') AT TIME ZONE p.time_zone;$a$,
        $b$nxt:=(public.hq_sales_weekday(local_day+(c->>'rest_days')::int)+time '09:00') AT TIME ZONE p.time_zone;$b$],
  ARRAY[$a$nxt:=(local_day+day_gap+at_time) AT TIME ZONE p.time_zone;$a$,
        $b$nxt:=(public.hq_sales_weekday(local_day+day_gap)+at_time) AT TIME ZONE p.time_zone;$b$],
  ARRAY[$a$ARRAY['contact_name','role','phone','email','their_words','fix','spending_approver','times']$a$,
        $b$ARRAY['contact_name','role','their_words','fix','spending_approver','times']$b$],
  ARRAY[$a$IF public.hq_normalize_email(p_details->>'email') IS NULL OR public.hq_normalize_phone(p_details->>'phone') IS NULL THEN RAISE EXCEPTION 'A valid intro phone and email are required'; END IF;$a$,
        $b$IF public.hq_normalize_email(p_details->>'email') IS NULL AND public.hq_normalize_phone(p_details->>'phone') IS NULL THEN RAISE EXCEPTION 'Add a valid phone or email for the intro call'; END IF;$b$]
 ];
 FOR i IN 1..array_length(pairs,1) LOOP
  old_text := pairs[i][1]; new_text := pairs[i][2];
  IF position(old_text IN body)=0 THEN RAISE EXCEPTION 'hq_lead_log_result fix % did not find its text', i; END IF;
  body := replace(body, old_text, new_text);
 END LOOP;
 EXECUTE body;

 SELECT pg_get_functiondef('public.hq_lead_stale_sweep()'::regprocedure) INTO body;
 old_text := $a$WHERE assigned_to IS NOT NULL AND status NOT IN ('won','dead') AND NOT do_not_contact AND (working_until IS NULL OR working_until<=now())$a$;
 new_text := $b$WHERE assigned_to IS NOT NULL AND status NOT IN ('won','dead','meeting') AND NOT do_not_contact AND (working_until IS NULL OR working_until<=now()) AND pending_close IS NULL AND NOT (pay_level IS NOT NULL AND won_confirmed_at IS NULL) AND NOT (preview_by IS NOT NULL AND preview_link IS NULL)$b$;
 IF position(old_text IN body)=0 THEN RAISE EXCEPTION 'hq_lead_stale_sweep fix did not find its text'; END IF;
 EXECUTE replace(body, old_text, new_text);
END $fix$;

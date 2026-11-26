
ALTER TABLE public.agent_handoffs ADD COLUMN IF NOT EXISTS owner_question text;
ALTER TABLE public.agent_handoffs ADD COLUMN IF NOT EXISTS brand_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS agent_handoffs_brand_ids_idx ON public.agent_handoffs USING gin (brand_ids);
CREATE INDEX IF NOT EXISTS agent_handoffs_parent_idx ON public.agent_handoffs (parent_id);

-- Resolve brands from venue_id, spec.brand_ids and spec.brands (text, list, or object keyed by name). Unknown names are ignored.
CREATE OR REPLACE FUNCTION public.agent_handoff_resolve_brands(_venue uuid, _spec jsonb)
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE names text[] := '{}'; v jsonb; ids uuid[] := '{}'; t text;
BEGIN
  IF _venue IS NOT NULL THEN ids := ARRAY[_venue]; END IF;
  FOREACH v IN ARRAY ARRAY[_spec->'brand_ids', _spec->'brands'] LOOP
    IF v IS NULL THEN CONTINUE; END IF;
    IF jsonb_typeof(v) = 'string' THEN
      names := names || string_to_array(v #>> '{}', ',');
    ELSIF jsonb_typeof(v) = 'array' THEN
      names := names || ARRAY(SELECT x FROM jsonb_array_elements_text(v) x);
    ELSIF jsonb_typeof(v) = 'object' THEN
      names := names || ARRAY(SELECT k FROM jsonb_object_keys(v) k);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY names LOOP
    t := btrim(t);
    IF t = '' THEN CONTINUE; END IF;
    IF t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      ids := ids || ARRAY(SELECT id FROM public.venues WHERE id = t::uuid);
    ELSE
      ids := ids || ARRAY(SELECT id FROM public.venues WHERE lower(name) = lower(t));
    END IF;
  END LOOP;
  RETURN ARRAY(SELECT DISTINCT x FROM unnest(ids) x);
END $$;

-- Tidy-up for rows written from anywhere. Named to run before agent_handoffs_on_done so copied proof reaches the linked to-do.
CREATE OR REPLACE FUNCTION public.agent_handoffs_a_tidy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid text;
BEGIN
  BEGIN
    IF NEW.brand_ids IS NULL OR cardinality(NEW.brand_ids) = 0
       OR (TG_OP = 'UPDATE' AND (NEW.venue_id IS DISTINCT FROM OLD.venue_id OR NEW.spec->'brands' IS DISTINCT FROM OLD.spec->'brands' OR NEW.spec->'brand_ids' IS DISTINCT FROM OLD.spec->'brand_ids')) THEN
      NEW.brand_ids := public.agent_handoff_resolve_brands(NEW.venue_id, NEW.spec);
    END IF;
    IF (NEW.result_links IS NULL OR NEW.result_links = '[]'::jsonb)
       AND jsonb_typeof(NEW.result->'result_links') = 'array' THEN
      NEW.result_links := NEW.result->'result_links';
    END IF;
    IF NEW.result_links IS NULL THEN NEW.result_links := '[]'::jsonb; END IF;
    tid := NEW.spec->>'task_id';
    IF NEW.parent_id IS NULL AND tid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND tid::uuid <> NEW.id
       AND EXISTS (SELECT 1 FROM public.agent_handoffs WHERE id = tid::uuid) THEN
      NEW.parent_id := tid::uuid;
    END IF;
    IF NEW.owner_question IS NULL AND NEW.status = 'needs_owner' THEN
      NEW.owner_question := nullif(btrim(coalesce(NEW.spec->>'owner_question', NEW.spec->>'question', NEW.spec->>'owner_part', NEW.spec->>'needs')), '');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block an agent's write
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS agent_handoffs_a_tidy ON public.agent_handoffs;
CREATE TRIGGER agent_handoffs_a_tidy BEFORE INSERT OR UPDATE ON public.agent_handoffs
FOR EACH ROW EXECUTE FUNCTION public.agent_handoffs_a_tidy();

-- One-time backfill without changing updated_at
ALTER TABLE public.agent_handoffs DISABLE TRIGGER agent_handoffs_touch;
UPDATE public.agent_handoffs SET brand_ids = '{}' WHERE true;
ALTER TABLE public.agent_handoffs ENABLE TRIGGER agent_handoffs_touch;

-- Shared guard
CREATE OR REPLACE FUNCTION public.agent_desk_guard(_id uuid)
RETURNS public.agent_handoffs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the owner can do this'; END IF;
  SELECT * INTO r FROM public.agent_handoffs WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF r.studio_lease_expires_at IS NOT NULL AND r.studio_lease_expires_at > now() THEN
    RAISE EXCEPTION 'Content Studio is working on this right now. Try again after it finishes.';
  END IF;
  RETURN r;
END $$;

-- History row: kind reply, status done, so no agent ever picks it up as new work.
CREATE OR REPLACE FUNCTION public.agent_desk_log(_r public.agent_handoffs, _title text, _note text, _extra jsonb DEFAULT '{}')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.agent_handoffs (from_agent, to_agent, kind, title, status, parent_id, venue_id, brand_ids, notes, spec, completed_at)
  VALUES ('owner', CASE WHEN _r.to_agent = 'owner' THEN coalesce(_r.from_agent,'owner') ELSE _r.to_agent END, 'reply', _title, 'done', _r.id, _r.venue_id, _r.brand_ids, _note,
          jsonb_build_object('source','agent_desk','history_only',true,'by',auth.uid()) || _extra, now());
$$;

CREATE OR REPLACE FUNCTION public.agent_desk_append_note(_notes text, _line text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws(E'\n', nullif(_notes,''), _line)
$$;

-- Answer: lands on the task the agent will read, which goes back to 'new' for that agent.
CREATE OR REPLACE FUNCTION public.agent_desk_answer(p_id uuid, p_answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; target public.agent_handoffs; line text;
BEGIN
  IF coalesce(btrim(p_answer),'') = '' THEN RAISE EXCEPTION 'Write an answer first'; END IF;
  r := public.agent_desk_guard(p_id);
  IF r.status <> 'needs_owner' THEN RAISE EXCEPTION 'This is not waiting on you'; END IF;
  line := 'Owner answer (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT): ' || btrim(p_answer);
  IF r.to_agent = 'owner' THEN
    -- A question: close it; wake the task it belongs to, or send the answer to whoever asked.
    UPDATE public.agent_handoffs SET status = 'done', completed_at = now(),
      result = coalesce(result,'{}'::jsonb) || jsonb_build_object('owner_answer', btrim(p_answer)),
      notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
    IF r.parent_id IS NOT NULL THEN
      SELECT * INTO target FROM public.agent_handoffs WHERE id = r.parent_id FOR UPDATE;
    END IF;
    IF target.id IS NOT NULL AND target.status NOT IN ('done','cancelled') AND target.to_agent <> 'owner' THEN
      UPDATE public.agent_handoffs SET
        status = CASE WHEN kind = 'standing_task' THEN status ELSE 'new' END,
        claimed_at = NULL,
        spec = spec || jsonb_build_object('owner_answer', btrim(p_answer)),
        notes = public.agent_desk_append_note(notes, line) WHERE id = target.id;
      PERFORM public.agent_desk_log(target, 'Owner answered: ' || r.title, btrim(p_answer));
      RETURN jsonb_build_object('ok',true,'question_id',r.id,'task_id',target.id);
    ELSE
      INSERT INTO public.agent_handoffs (from_agent,to_agent,kind,title,status,parent_id,venue_id,brand_ids,notes,spec)
      VALUES ('owner', r.from_agent, 'task', 'Owner answered: ' || r.title, CASE WHEN r.from_agent = 'owner' THEN 'done' ELSE 'new' END,
              r.id, r.venue_id, r.brand_ids, line,
              jsonb_build_object('source','agent_desk','owner_answer',btrim(p_answer),'do','Read the owner''s answer to your question and carry on.'))
      RETURNING * INTO target;
      RETURN jsonb_build_object('ok',true,'question_id',r.id,'task_id',target.id);
    END IF;
  END IF;
  UPDATE public.agent_handoffs SET
    status = CASE WHEN kind = 'standing_task' THEN 'active' ELSE 'new' END,
    claimed_at = NULL,
    spec = spec || jsonb_build_object('owner_answer', btrim(p_answer)),
    notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Owner answered: ' || r.title, btrim(p_answer));
  RETURN jsonb_build_object('ok',true,'task_id',r.id);
END $$;

CREATE OR REPLACE FUNCTION public.agent_desk_send_back(p_id uuid, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; line text;
BEGIN
  IF coalesce(btrim(p_note),'') = '' THEN RAISE EXCEPTION 'Write a note first'; END IF;
  r := public.agent_desk_guard(p_id);
  IF r.to_agent = 'owner' THEN RAISE EXCEPTION 'Use Answer for questions'; END IF;
  IF r.status = 'cancelled' THEN RAISE EXCEPTION 'This task was cancelled'; END IF;
  line := 'Sent back by owner (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT): ' || btrim(p_note);
  UPDATE public.agent_handoffs SET
    status = CASE WHEN kind = 'standing_task' THEN 'active' ELSE 'new' END,
    claimed_at = NULL, completed_at = CASE WHEN kind = 'standing_task' THEN completed_at ELSE NULL END,
    spec = spec || jsonb_build_object('owner_note', btrim(p_note)),
    notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Sent back: ' || r.title, btrim(p_note));
  RETURN jsonb_build_object('ok',true,'task_id',r.id);
END $$;

CREATE OR REPLACE FUNCTION public.agent_desk_reassign(p_id uuid, p_to_agent text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; line text;
BEGIN
  IF p_to_agent NOT IN ('claude','muse','chatgpt') THEN RAISE EXCEPTION 'Pick Claude, Muse or ChatGPT'; END IF;
  r := public.agent_desk_guard(p_id);
  IF r.to_agent = 'owner' THEN RAISE EXCEPTION 'Use Answer for questions'; END IF;
  IF r.status IN ('done','cancelled') THEN RAISE EXCEPTION 'This task is already closed'; END IF;
  IF r.to_agent = p_to_agent THEN RAISE EXCEPTION 'It is already with that agent'; END IF;
  line := 'Handed from ' || r.to_agent || ' to ' || p_to_agent || ' by owner (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT)' || coalesce(': ' || nullif(btrim(p_note),''), '');
  UPDATE public.agent_handoffs SET to_agent = p_to_agent,
    status = CASE WHEN kind = 'standing_task' THEN 'active' ELSE 'new' END, claimed_at = NULL,
    spec = CASE WHEN nullif(btrim(p_note),'') IS NULL THEN spec ELSE spec || jsonb_build_object('owner_note', btrim(p_note)) END,
    notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Handed to ' || p_to_agent || ': ' || r.title, line, jsonb_build_object('from', r.to_agent, 'to', p_to_agent));
  RETURN jsonb_build_object('ok',true,'task_id',r.id);
END $$;

CREATE OR REPLACE FUNCTION public.agent_desk_cancel(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; line text;
BEGIN
  r := public.agent_desk_guard(p_id);
  IF r.status IN ('done','cancelled') THEN RAISE EXCEPTION 'This task is already closed'; END IF;
  line := 'Cancelled by owner (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT)' || coalesce(': ' || nullif(btrim(p_reason),''), '');
  UPDATE public.agent_handoffs SET status = 'cancelled', notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Cancelled: ' || r.title, line);
  RETURN jsonb_build_object('ok',true,'task_id',r.id);
END $$;

-- Done with proof. For social posts this means MADE; it never touches result.published.
CREATE OR REPLACE FUNCTION public.agent_desk_mark_done(p_id uuid, p_url text, p_label text DEFAULT NULL, p_summary text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; line text;
BEGIN
  IF coalesce(btrim(p_url),'') !~* '^https?://' THEN RAISE EXCEPTION 'Paste a full proof link starting with https://'; END IF;
  r := public.agent_desk_guard(p_id);
  IF r.status IN ('done','cancelled') AND r.kind <> 'standing_task' THEN RAISE EXCEPTION 'This task is already closed'; END IF;
  line := 'Closed by owner with proof (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT)' || coalesce(': ' || nullif(btrim(p_summary),''), '');
  UPDATE public.agent_handoffs SET
    status = CASE WHEN kind = 'standing_task' THEN status ELSE 'done' END,
    last_run_at = CASE WHEN kind = 'standing_task' THEN now() ELSE last_run_at END,
    result_links = coalesce(result_links,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('url', btrim(p_url), 'label', coalesce(nullif(btrim(p_label),''), 'Proof'))),
    result = CASE WHEN nullif(btrim(p_summary),'') IS NULL THEN result
                  ELSE coalesce(result,'{}'::jsonb) || jsonb_build_object('summary', btrim(p_summary)) END,
    notes = public.agent_desk_append_note(notes, line) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Closed with proof: ' || r.title, line, jsonb_build_object('url', btrim(p_url)));
  RETURN jsonb_build_object('ok',true,'task_id',r.id);
END $$;

-- Social posts only: record a live post.
CREATE OR REPLACE FUNCTION public.agent_desk_mark_posted(p_id uuid, p_url text, p_platform text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.agent_handoffs; pub jsonb;
BEGIN
  IF coalesce(btrim(p_url),'') !~* '^https?://' THEN RAISE EXCEPTION 'Paste the live post link starting with https://'; END IF;
  IF coalesce(btrim(p_platform),'') = '' THEN RAISE EXCEPTION 'Pick where it was posted'; END IF;
  r := public.agent_desk_guard(p_id);
  IF coalesce(r.spec->>'type','') <> 'social_post' THEN RAISE EXCEPTION 'Only social posts can be marked posted'; END IF;
  IF r.status = 'cancelled' THEN RAISE EXCEPTION 'This post was cancelled'; END IF;
  pub := CASE WHEN jsonb_typeof(r.result->'published') = 'array' THEN r.result->'published'
              WHEN r.result ? 'published' AND r.result->'published' <> 'null'::jsonb THEN jsonb_build_array(r.result->'published')
              ELSE '[]'::jsonb END;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(pub) e WHERE e->>'url' = btrim(p_url)) THEN
    RAISE EXCEPTION 'That link is already recorded';
  END IF;
  pub := pub || jsonb_build_array(jsonb_build_object('url', btrim(p_url), 'platform', lower(btrim(p_platform)), 'posted_at', now(), 'by', 'owner'));
  UPDATE public.agent_handoffs SET result = coalesce(result,'{}'::jsonb) || jsonb_build_object('published', pub),
    notes = public.agent_desk_append_note(notes, 'Marked posted on ' || btrim(p_platform) || ' by owner: ' || btrim(p_url)) WHERE id = r.id;
  PERFORM public.agent_desk_log(r, 'Posted: ' || r.title, btrim(p_url), jsonb_build_object('url', btrim(p_url), 'platform', lower(btrim(p_platform))));
  RETURN jsonb_build_object('ok',true,'task_id',r.id,'published_count',jsonb_array_length(pub));
END $$;

-- Retry a group of failed tasks: each goes back to 'new' for its own agent with the note.
CREATE OR REPLACE FUNCTION public.agent_desk_retry(p_ids uuid[], p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i uuid; r public.agent_handoffs; n int := 0; skipped int := 0; line text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only the owner can do this'; END IF;
  line := 'Retry asked by owner (' || to_char(now() AT TIME ZONE 'America/Los_Angeles','Mon DD HH12:MI AM') || ' PT)' || coalesce(': ' || nullif(btrim(p_note),''), '');
  FOREACH i IN ARRAY coalesce(p_ids,'{}') LOOP
    SELECT * INTO r FROM public.agent_handoffs WHERE id = i FOR UPDATE;
    IF NOT FOUND OR r.status <> 'failed' OR (r.studio_lease_expires_at IS NOT NULL AND r.studio_lease_expires_at > now()) THEN
      skipped := skipped + 1; CONTINUE;
    END IF;
    UPDATE public.agent_handoffs SET status = 'new', claimed_at = NULL,
      spec = CASE WHEN nullif(btrim(p_note),'') IS NULL THEN spec ELSE spec || jsonb_build_object('owner_note', btrim(p_note)) END,
      notes = public.agent_desk_append_note(notes, line) WHERE id = i;
    PERFORM public.agent_desk_log(r, 'Retry: ' || r.title, line);
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'retried',n,'skipped',skipped);
END $$;

REVOKE ALL ON FUNCTION public.agent_desk_guard(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agent_desk_log(public.agent_handoffs, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agent_handoff_resolve_brands(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agent_handoffs_a_tidy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agent_desk_answer(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_send_back(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_reassign(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_cancel(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_mark_done(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_mark_posted(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agent_desk_retry(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_desk_answer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_send_back(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_reassign(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_cancel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_mark_done(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_mark_posted(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_desk_retry(uuid[], text) TO authenticated;

GRANT SELECT ON public.agent_handoffs TO authenticated;
DROP POLICY IF EXISTS "Brand team reads its brand agent handoffs" ON public.agent_handoffs;
CREATE POLICY "Brand team reads its brand agent handoffs" ON public.agent_handoffs
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM unnest(brand_ids) b WHERE public.user_can_access_project(b)));

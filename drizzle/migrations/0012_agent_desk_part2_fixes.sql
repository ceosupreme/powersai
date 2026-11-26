CREATE OR REPLACE FUNCTION public.agent_handoffs_a_tidy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid text; p_brands uuid[];
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
    IF NEW.kind = 'question' AND (NEW.brand_ids IS NULL OR cardinality(NEW.brand_ids) = 0) AND NEW.parent_id IS NOT NULL THEN
      SELECT brand_ids INTO p_brands FROM public.agent_handoffs WHERE id = NEW.parent_id;
      IF p_brands IS NOT NULL AND cardinality(p_brands) > 0 THEN
        NEW.brand_ids := p_brands;
      END IF;
    END IF;
    IF NEW.owner_question IS NULL AND (NEW.status = 'needs_owner' OR NEW.kind = 'question') THEN
      NEW.owner_question := nullif(btrim(coalesce(
        NEW.spec->>'owner_question',
        NEW.spec->>'question',
        CASE WHEN NEW.kind = 'question' THEN NEW.spec->>'detail' END
      )), '');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block an agent's write
  END;
  RETURN NEW;
END $$;

ALTER TABLE public.agent_handoffs DISABLE TRIGGER agent_handoffs_touch;
UPDATE public.agent_handoffs
SET owner_question = NULL
WHERE owner_question IS NOT NULL
  AND (
    owner_question = nullif(btrim(spec->>'owner_part'), '')
    OR owner_question = nullif(btrim(spec->>'needs'), '')
  );
UPDATE public.agent_handoffs
SET brand_ids = '{}'
WHERE kind = 'question' AND cardinality(brand_ids) = 0 AND parent_id IS NOT NULL;
ALTER TABLE public.agent_handoffs ENABLE TRIGGER agent_handoffs_touch;
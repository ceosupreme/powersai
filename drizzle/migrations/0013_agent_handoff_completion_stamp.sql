CREATE OR REPLACE FUNCTION public.agent_handoffs_b_completion_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.agent_handoffs_b_completion_stamp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER agent_handoffs_b_completion_stamp BEFORE INSERT OR UPDATE ON public.agent_handoffs FOR EACH ROW EXECUTE FUNCTION public.agent_handoffs_b_completion_stamp();
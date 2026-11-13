ALTER TABLE public.crews ADD COLUMN default_brand_ids uuid[];
COMMENT ON COLUMN public.crews.default_brand_ids IS 'Brands attached to future runs only when details has no brands key; explicit per-run brands always win.';
UPDATE public.crews SET default_brand_ids = CASE key WHEN 'coastal_blog' THEN ARRAY['fa710cf6-09fc-45ad-97da-fa50dceec37d'::uuid] WHEN 'coastal_city_fill' THEN ARRAY['fa710cf6-09fc-45ad-97da-fa50dceec37d'::uuid] WHEN 'local_news_brief' THEN ARRAY['624a963f-f27a-4c12-a643-55b204acfde9'::uuid,'40666050-63c0-4928-9063-b664b1e61089'::uuid] END WHERE key IN ('coastal_blog','coastal_city_fill','local_news_brief');
CREATE FUNCTION public.attach_crew_default_brands() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE defaults uuid[];
BEGIN
  IF NOT (coalesce(NEW.details, '{}'::jsonb) ? 'brands') THEN
    SELECT default_brand_ids INTO defaults FROM public.crews WHERE key = NEW.crew_key;
    IF defaults IS NOT NULL THEN
      NEW.details := jsonb_set(coalesce(NEW.details, '{}'::jsonb), '{brands}', to_jsonb(defaults));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crew_runs_default_brands BEFORE INSERT ON public.crew_runs FOR EACH ROW EXECUTE FUNCTION public.attach_crew_default_brands();
CREATE FUNCTION public.hq_set_crew_default_brands(p_crew_key text, p_brand_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_brand_ids) AS b(id) WHERE NOT EXISTS (SELECT 1 FROM public.venues v WHERE v.id = b.id)) THEN RAISE EXCEPTION 'Unknown brand'; END IF;
  UPDATE public.crews SET default_brand_ids = CASE WHEN cardinality(p_brand_ids) > 0 THEN p_brand_ids ELSE NULL END, updated_at = now() WHERE key = p_crew_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown crew'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.hq_set_crew_default_brands(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hq_set_crew_default_brands(text, uuid[]) TO authenticated, service_role;
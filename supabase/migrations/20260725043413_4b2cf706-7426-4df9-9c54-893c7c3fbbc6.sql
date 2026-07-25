
-- Phase 0: enum → text + FK

-- 1. Pre-check: every distinct value must exist in project_types.id
DO $pre$
DECLARE missing text;
BEGIN
  SELECT string_agg(DISTINCT src || '.' || val, ', ') INTO missing FROM (
    SELECT 'venues' AS src, project_type::text AS val FROM public.venues WHERE project_type IS NOT NULL
    UNION SELECT 'pillar_templates', project_type::text FROM public.pillar_templates
    UNION SELECT 'project_type_leak_vectors', project_type::text FROM public.project_type_leak_vectors
    UNION SELECT 'project_type_qualifier_fields', project_type::text FROM public.project_type_qualifier_fields
    UNION SELECT 'project_type_qualifier_config', project_type::text FROM public.project_type_qualifier_config
  ) s
  WHERE val NOT IN (SELECT id FROM public.project_types);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Orphan project_type values found: %', missing;
  END IF;
END $pre$;

-- 2. Retype each column to text, preserving default on venues
ALTER TABLE public.venues                          ALTER COLUMN project_type DROP DEFAULT;
ALTER TABLE public.venues                          ALTER COLUMN project_type TYPE text USING project_type::text;
ALTER TABLE public.venues                          ALTER COLUMN project_type SET DEFAULT 'client';

ALTER TABLE public.pillar_templates                ALTER COLUMN project_type TYPE text USING project_type::text;
ALTER TABLE public.project_type_leak_vectors       ALTER COLUMN project_type TYPE text USING project_type::text;
ALTER TABLE public.project_type_qualifier_fields   ALTER COLUMN project_type TYPE text USING project_type::text;
ALTER TABLE public.project_type_qualifier_config   ALTER COLUMN project_type TYPE text USING project_type::text;

-- 3. Add FKs
ALTER TABLE public.venues
  ADD CONSTRAINT fk_venues_project_type
  FOREIGN KEY (project_type) REFERENCES public.project_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pillar_templates
  ADD CONSTRAINT fk_pillar_templates_project_type
  FOREIGN KEY (project_type) REFERENCES public.project_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.project_type_leak_vectors
  ADD CONSTRAINT fk_project_type_leak_vectors_project_type
  FOREIGN KEY (project_type) REFERENCES public.project_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.project_type_qualifier_fields
  ADD CONSTRAINT fk_project_type_qualifier_fields_project_type
  FOREIGN KEY (project_type) REFERENCES public.project_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.project_type_qualifier_config
  ADD CONSTRAINT fk_project_type_qualifier_config_project_type
  FOREIGN KEY (project_type) REFERENCES public.project_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4. Best-effort drop of the now-unused enum
DO $drop$
BEGIN
  BEGIN
    DROP TYPE public.project_type_enum;
    RAISE NOTICE 'project_type_enum dropped';
  EXCEPTION WHEN dependent_objects_still_exist OR others THEN
    RAISE NOTICE 'project_type_enum retained (still has dependents): %', SQLERRM;
  END;
END $drop$;

-- 5. Guard: block deletion of the built-in 'client' fallback type
CREATE OR REPLACE FUNCTION public.protect_client_project_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF OLD.id = 'client' THEN
    RAISE EXCEPTION 'The "client" project type is the system default and cannot be deleted.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_client_project_type ON public.project_types;
CREATE TRIGGER trg_protect_client_project_type
BEFORE DELETE ON public.project_types
FOR EACH ROW EXECUTE FUNCTION public.protect_client_project_type();

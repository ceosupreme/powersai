
-- 1. Extend enum (must commit before referencing the new value in data)
ALTER TYPE public.project_type_enum ADD VALUE IF NOT EXISTS 'home_services';

-- 2. project_types lookup
CREATE TABLE public.project_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_vertical boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_types TO authenticated;
GRANT ALL ON public.project_types TO service_role;

ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_types readable by authenticated"
  ON public.project_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_types editable by admin"
  ON public.project_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER project_types_updated_at
  BEFORE UPDATE ON public.project_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.project_types (id, label, sort_order, is_vertical) VALUES
  ('client',          'Client',          10, false),
  ('content_channel', 'Content Channel', 20, false),
  ('internal_brand',  'Internal Brand',  30, false),
  ('app_build',       'App Build',       40, false),
  ('service_offer',   'Service Offer',   50, false),
  ('home_services',   'Home Services',   60, true);

-- 3. project_type_leak_vectors (per-type template)
CREATE TABLE public.project_type_leak_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type public.project_type_enum NOT NULL,
  name text NOT NULL,
  detect_signal text,
  dollarize_formula text,
  benchmark text,
  severity text NOT NULL DEFAULT 'supporting' CHECK (severity IN ('headline','supporting')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_type_leak_vectors TO authenticated;
GRANT ALL ON public.project_type_leak_vectors TO service_role;

ALTER TABLE public.project_type_leak_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_type_leak_vectors readable by authenticated"
  ON public.project_type_leak_vectors FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_type_leak_vectors editable by admin"
  ON public.project_type_leak_vectors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER project_type_leak_vectors_updated_at
  BEFORE UPDATE ON public.project_type_leak_vectors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. project_leak_vector_overrides (per-project)
CREATE TABLE public.project_leak_vector_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  detect_signal text,
  dollarize_formula text,
  benchmark text,
  severity text NOT NULL DEFAULT 'supporting' CHECK (severity IN ('headline','supporting')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_leak_vector_overrides TO authenticated;
GRANT ALL ON public.project_leak_vector_overrides TO service_role;

ALTER TABLE public.project_leak_vector_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_leak_vector_overrides accessible by project members"
  ON public.project_leak_vector_overrides FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE TRIGGER project_leak_vector_overrides_updated_at
  BEFORE UPDATE ON public.project_leak_vector_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. project_type_qualifier_fields (per-type template)
CREATE TABLE public.project_type_qualifier_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type public.project_type_enum NOT NULL,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','select','number','boolean')),
  is_shared boolean NOT NULL DEFAULT false,
  channel text CHECK (channel IN ('web_voice','phone','chat','sms','form')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_type_qualifier_fields TO authenticated;
GRANT ALL ON public.project_type_qualifier_fields TO service_role;

ALTER TABLE public.project_type_qualifier_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_type_qualifier_fields readable by authenticated"
  ON public.project_type_qualifier_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_type_qualifier_fields editable by admin"
  ON public.project_type_qualifier_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER project_type_qualifier_fields_updated_at
  BEFORE UPDATE ON public.project_type_qualifier_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. project_qualifier_field_overrides (per-project)
CREATE TABLE public.project_qualifier_field_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','select','number','boolean')),
  is_shared boolean NOT NULL DEFAULT false,
  channel text CHECK (channel IN ('web_voice','phone','chat','sms','form')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_qualifier_field_overrides TO authenticated;
GRANT ALL ON public.project_qualifier_field_overrides TO service_role;

ALTER TABLE public.project_qualifier_field_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_qualifier_field_overrides accessible by project members"
  ON public.project_qualifier_field_overrides FOR ALL TO authenticated
  USING (public.user_can_access_project(project_id))
  WITH CHECK (public.user_can_access_project(project_id));

CREATE TRIGGER project_qualifier_field_overrides_updated_at
  BEFORE UPDATE ON public.project_qualifier_field_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. project_type_qualifier_config (per-type singleton)
CREATE TABLE public.project_type_qualifier_config (
  project_type public.project_type_enum PRIMARY KEY,
  ready_definition text,
  primary_channel text CHECK (primary_channel IN ('web_voice','phone','chat','sms','form')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_type_qualifier_config TO authenticated;
GRANT ALL ON public.project_type_qualifier_config TO service_role;

ALTER TABLE public.project_type_qualifier_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_type_qualifier_config readable by authenticated"
  ON public.project_type_qualifier_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_type_qualifier_config editable by admin"
  ON public.project_type_qualifier_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER project_type_qualifier_config_updated_at
  BEFORE UPDATE ON public.project_type_qualifier_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

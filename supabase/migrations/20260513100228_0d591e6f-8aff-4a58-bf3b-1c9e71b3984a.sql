
CREATE TABLE IF NOT EXISTS public.venue_execution_adapters (
  venue_id uuid PRIMARY KEY,
  adapter_type text NOT NULL DEFAULT 'asana',
  asana_project_gid text,
  asana_section_gid text,
  asana_custom_field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  live_writes_enabled boolean NOT NULL DEFAULT false,
  last_field_setup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_execution_adapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage venue execution adapters"
ON public.venue_execution_adapters
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue owners read their adapter config"
ON public.venue_execution_adapters
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.get_user_venue_role(auth.uid(), venue_id) = 'owner'
);

CREATE TRIGGER trg_venue_execution_adapters_updated_at
BEFORE UPDATE ON public.venue_execution_adapters
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

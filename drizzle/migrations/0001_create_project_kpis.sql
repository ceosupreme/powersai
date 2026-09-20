CREATE TABLE public.project_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  pillar_key text NOT NULL,
  kpi_key text NOT NULL,
  kpi_label text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  direction text NOT NULL DEFAULT 'higher' CHECK (direction IN ('higher','lower','checklist')),
  target numeric,
  unit text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','claude','auto')),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, pillar_key, kpi_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_kpis TO authenticated;
GRANT ALL ON public.project_kpis TO service_role;

ALTER TABLE public.project_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_kpis accessible by project members"
ON public.project_kpis
FOR ALL
TO authenticated
USING (public.user_can_access_project(project_id))
WITH CHECK (public.user_can_access_project(project_id));

CREATE TABLE public.project_kpi_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  pillar_key text NOT NULL,
  kpi_key text NOT NULL,
  actual numeric,
  score numeric,
  note text,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, week_start, pillar_key, kpi_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_kpi_values TO authenticated;
GRANT ALL ON public.project_kpi_values TO service_role;

ALTER TABLE public.project_kpi_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_kpi_values accessible by project members"
ON public.project_kpi_values
FOR ALL
TO authenticated
USING (public.user_can_access_project(project_id))
WITH CHECK (public.user_can_access_project(project_id));

CREATE INDEX idx_project_kpis_project_pillar ON public.project_kpis (project_id, pillar_key);
CREATE INDEX idx_project_kpi_values_project_week ON public.project_kpi_values (project_id, week_start);

CREATE TRIGGER project_kpis_updated_at BEFORE UPDATE ON public.project_kpis
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER project_kpi_values_updated_at BEFORE UPDATE ON public.project_kpi_values
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TABLE public.sculpture_site_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL UNIQUE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sculpture_site_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage site mappings"
  ON public.sculpture_site_mappings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read site mappings"
  ON public.sculpture_site_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_sculpture_site_mappings_updated_at
  BEFORE UPDATE ON public.sculpture_site_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.inventory_station_stock
  ALTER COLUMN source_report_type SET DEFAULT 'inventory_csv';
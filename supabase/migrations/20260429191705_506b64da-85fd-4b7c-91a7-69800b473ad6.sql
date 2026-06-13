
-- Create table
CREATE TABLE public.venue_asana_log_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('project', 'section', 'task')),
  asana_gid TEXT NOT NULL,
  log_type TEXT NOT NULL DEFAULT 'gm' CHECK (log_type IN ('gm', 'lead', 'manager', 'shift')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_asana_log_sources_venue ON public.venue_asana_log_sources(venue_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.venue_asana_log_sources ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all log sources"
  ON public.venue_asana_log_sources
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read sources for venues they are assigned to
CREATE POLICY "Users can view log sources for their venues"
  ON public.venue_asana_log_sources
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR venue_id = ANY(public.user_venue_ids())
  );

-- Trigger to enforce max 4 active sources per venue
CREATE OR REPLACE FUNCTION public.enforce_max_log_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
BEGIN
  IF NEW.is_active THEN
    SELECT COUNT(*) INTO active_count
    FROM public.venue_asana_log_sources
    WHERE venue_id = NEW.venue_id
      AND is_active = true
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF active_count >= 4 THEN
      RAISE EXCEPTION 'A venue cannot have more than 4 active Asana log sources';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_max_log_sources
  BEFORE INSERT OR UPDATE ON public.venue_asana_log_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_log_sources();

-- updated_at trigger
CREATE TRIGGER trg_venue_asana_log_sources_updated_at
  BEFORE UPDATE ON public.venue_asana_log_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backfill from existing legacy columns
INSERT INTO public.venue_asana_log_sources (venue_id, label, source_type, asana_gid, log_type, sort_order)
SELECT id, 'GM Log Task', 'task', asana_gm_log_task_gid, 'gm', 1
FROM public.venues
WHERE asana_gm_log_task_gid IS NOT NULL AND asana_gm_log_task_gid <> '';

INSERT INTO public.venue_asana_log_sources (venue_id, label, source_type, asana_gid, log_type, sort_order)
SELECT id, 'Lead Log Task', 'task', asana_lead_log_task_gid, 'lead', 2
FROM public.venues
WHERE asana_lead_log_task_gid IS NOT NULL AND asana_lead_log_task_gid <> '';

INSERT INTO public.venue_asana_log_sources (venue_id, label, source_type, asana_gid, log_type, sort_order)
SELECT id, 'GM Log Section', 'section', asana_gm_log_section_gid, 'gm', 3
FROM public.venues
WHERE asana_gm_log_section_gid IS NOT NULL AND asana_gm_log_section_gid <> '';

INSERT INTO public.venue_asana_log_sources (venue_id, label, source_type, asana_gid, log_type, sort_order)
SELECT id,
  CASE WHEN asana_log_section_gid IS NOT NULL AND asana_log_section_gid <> ''
       THEN 'Log Project Section' ELSE 'Log Project' END,
  CASE WHEN asana_log_section_gid IS NOT NULL AND asana_log_section_gid <> ''
       THEN 'section' ELSE 'project' END,
  COALESCE(NULLIF(asana_log_section_gid, ''), asana_log_project_gid),
  'manager',
  4
FROM public.venues
WHERE asana_log_project_gid IS NOT NULL AND asana_log_project_gid <> '';

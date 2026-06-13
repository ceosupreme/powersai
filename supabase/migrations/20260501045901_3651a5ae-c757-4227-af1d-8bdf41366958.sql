
ALTER TABLE public.gm_logs
  ADD COLUMN IF NOT EXISTS asana_source_id uuid REFERENCES public.venue_asana_log_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asana_source_label text;

ALTER TABLE public.lead_logs
  ADD COLUMN IF NOT EXISTS asana_source_id uuid REFERENCES public.venue_asana_log_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asana_source_label text;

ALTER TABLE public.shift_logs
  ADD COLUMN IF NOT EXISTS asana_source_id uuid REFERENCES public.venue_asana_log_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asana_source_label text;

CREATE INDEX IF NOT EXISTS idx_gm_logs_asana_source_id ON public.gm_logs(asana_source_id);
CREATE INDEX IF NOT EXISTS idx_lead_logs_asana_source_id ON public.lead_logs(asana_source_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_asana_source_id ON public.shift_logs(asana_source_id);

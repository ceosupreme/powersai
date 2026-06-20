ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS source_lead_id uuid NULL REFERENCES public.inbound_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS venues_source_lead_id_idx ON public.venues(source_lead_id);

ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS promoted_venue_id uuid NULL REFERENCES public.venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inbound_leads_promoted_venue_id_idx ON public.inbound_leads(promoted_venue_id);
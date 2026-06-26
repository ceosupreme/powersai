-- Build: venue-aware qualifier intake
-- 1) New column linking inbound leads to the client (venue) they were captured for.
ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS captured_for_project_id uuid
  REFERENCES public.venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_leads_captured_for_project_id
  ON public.inbound_leads(captured_for_project_id)
  WHERE captured_for_project_id IS NOT NULL;

-- 2) Enforce unique slug per client (NULLs allowed for legacy rows).
CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_unique_not_null
  ON public.venues(slug)
  WHERE slug IS NOT NULL;
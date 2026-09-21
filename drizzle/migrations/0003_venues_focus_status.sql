ALTER TABLE public.venues
  ADD COLUMN focus_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.venues
  ADD CONSTRAINT venues_focus_status_check
  CHECK (focus_status IN ('active', 'parked'));
ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_notify_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_notify_error text;
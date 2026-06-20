
ALTER TABLE public.inbound_leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS route_to text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS qualifier_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_ready_reason text,
  ADD COLUMN IF NOT EXISTS transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conversation_channel text;

ALTER TABLE public.inbound_leads
  ALTER COLUMN message DROP NOT NULL;

ALTER TABLE public.inbound_leads
  ADD CONSTRAINT inbound_leads_route_to_chk
  CHECK (route_to IN ('self','operator','client'));

ALTER TABLE public.inbound_leads
  ADD CONSTRAINT inbound_leads_channel_chk
  CHECK (conversation_channel IS NULL OR conversation_channel IN ('voice','chat','form','phone'));

CREATE INDEX IF NOT EXISTS inbound_leads_project_type_idx ON public.inbound_leads(project_type);
CREATE INDEX IF NOT EXISTS inbound_leads_is_ready_idx ON public.inbound_leads(is_ready);

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS toast_client_id text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS toast_client_secret text;
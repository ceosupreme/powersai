ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS auto_analysis_enabled boolean NOT NULL DEFAULT false;
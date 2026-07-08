ALTER TABLE public.recovery_reports
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_referral_footer boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_recovery_reports_share_token
  ON public.recovery_reports(share_token)
  WHERE share_token IS NOT NULL;
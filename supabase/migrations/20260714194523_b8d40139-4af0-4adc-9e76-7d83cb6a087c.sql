ALTER TABLE public.gbp_snapshots ADD COLUMN IF NOT EXISTS source_kind text;
COMMENT ON COLUMN public.gbp_snapshots.source_kind IS 'Provenance flag: managed = BarPulse-owned venue on cron; public_checkup = arbitrary business resolved via public /free-audit flow. Nullable for legacy rows.';
CREATE INDEX IF NOT EXISTS idx_gbp_snapshots_source_kind ON public.gbp_snapshots (source_kind);
-- Backfill dedupe_hash for existing daily_insights_v2 insights using
-- stable key: daily_v2:<bar_id>:<source_date>:<normalized_title>
-- where normalized_title is lowercased, non-alphanumeric stripped, collapsed.
UPDATE public.insights
SET dedupe_hash = 'daily_v2:' || bar_id::text || ':' || COALESCE(source_date::text,'') || ':' ||
  regexp_replace(lower(COALESCE(title,'')), '[^a-z0-9]+', '', 'g')
WHERE generated_by = 'daily_insights_v2'
  AND dedupe_hash IS NULL;

-- Deduplicate any rows that collide on the new hash within the non-Dismissed
-- set BEFORE creating the unique index. Keep the newest by created_at; mark
-- older twins as Dismissed with reason='dedup_backfill_collision' so they
-- don't block index creation but stay auditable.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY dedupe_hash
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.insights
  WHERE generated_by = 'daily_insights_v2'
    AND dedupe_hash IS NOT NULL
    AND status <> 'Dismissed'
)
UPDATE public.insights i
SET status = 'Dismissed',
    dismiss_reason = COALESCE(i.dismiss_reason, 'dedup_backfill_collision')
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

-- Partial unique index — matches the deterministic_trigger pattern.
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_dedupe_unique_daily_v2
ON public.insights (dedupe_hash)
WHERE generated_by = 'daily_insights_v2'
  AND status <> 'Dismissed'
  AND dedupe_hash IS NOT NULL;
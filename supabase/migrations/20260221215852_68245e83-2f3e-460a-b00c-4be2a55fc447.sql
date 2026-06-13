
-- Migration 2: Rename bars → venues + backward-compatible view

ALTER TABLE bars RENAME TO venues;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_name TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS gm_name TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS toast_api_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS sevenshifts_api_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS asana_project_gid TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS current_secret_shop_date DATE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS current_secret_shop_score_pct DECIMAL(5,2);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS current_secret_shop_cleanliness_pct DECIMAL(5,2);

UPDATE venues SET venue_name = name WHERE venue_name IS NULL;
UPDATE venues SET slug = bar_code WHERE slug IS NULL AND bar_code IS NOT NULL;

-- bars view: SELECT * already includes bar_code, so only alias name→bar_name
CREATE OR REPLACE VIEW bars AS SELECT *, name AS bar_name FROM venues;

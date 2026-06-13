
-- Add source column to shift_logs for distinguishing manual vs asana_project entries
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create unique index for upsert deduplication (bar_id, date, source)
CREATE UNIQUE INDEX IF NOT EXISTS shift_logs_bar_date_source_idx ON shift_logs (bar_id, date, source);

-- Ensure asana_project_gid column exists on venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS asana_project_gid text;

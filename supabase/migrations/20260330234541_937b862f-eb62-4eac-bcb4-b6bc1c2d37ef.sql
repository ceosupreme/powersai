ALTER TABLE weekly_core ALTER COLUMN engage_lates TYPE numeric USING engage_lates::numeric;
ALTER TABLE weekly_core ALTER COLUMN engage_no_shows TYPE numeric USING engage_no_shows::numeric;
ALTER TABLE weekly_core ALTER COLUMN engage_dropped_shifts TYPE numeric USING engage_dropped_shifts::numeric;
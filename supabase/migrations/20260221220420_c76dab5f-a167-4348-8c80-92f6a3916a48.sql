
-- Migration 3: Add venue_id UUID to tables using bar_id TEXT, backfill from venues

-- daily_metrics
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE daily_metrics dm SET venue_id = v.id
  FROM venues v WHERE v.bar_code = dm.bar_id AND dm.venue_id IS NULL;

-- insight_cards
ALTER TABLE insight_cards ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE insight_cards ic SET venue_id = v.id
  FROM venues v WHERE v.bar_code = ic.bar_id AND ic.venue_id IS NULL;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE tasks t SET venue_id = v.id
  FROM venues v WHERE v.bar_code = t.bar_id AND t.venue_id IS NULL;

-- manager_logs
ALTER TABLE manager_logs ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE manager_logs ml SET venue_id = v.id
  FROM venues v WHERE v.bar_code = ml.bar_id AND ml.venue_id IS NULL;

-- user_bar_assignments
ALTER TABLE user_bar_assignments ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE user_bar_assignments uba SET venue_id = v.id
  FROM venues v WHERE v.bar_code = uba.bar_id AND uba.venue_id IS NULL;

-- chat_channels
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE chat_channels cc SET venue_id = v.id
  FROM venues v WHERE v.bar_code = cc.bar_id AND cc.venue_id IS NULL;

-- staff_announcements
ALTER TABLE staff_announcements ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE staff_announcements sa SET venue_id = v.id
  FROM venues v WHERE v.bar_code = sa.bar_id AND sa.venue_id IS NULL;

-- voice_notes
ALTER TABLE voice_notes ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE voice_notes vn SET venue_id = v.id
  FROM venues v WHERE v.bar_code = vn.bar_id AND vn.venue_id IS NULL;

-- log_entries
ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE log_entries le SET venue_id = v.id
  FROM venues v WHERE v.bar_code = le.bar_id AND le.venue_id IS NULL;

-- bar_targets
ALTER TABLE bar_targets ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE bar_targets bt SET venue_id = v.id
  FROM venues v WHERE v.bar_code = bt.bar_id AND bt.venue_id IS NULL;

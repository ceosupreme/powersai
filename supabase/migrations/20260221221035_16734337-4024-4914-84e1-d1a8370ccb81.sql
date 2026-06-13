
-- Migration 4: Upgrade existing tables (add new columns)

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';

-- Backfill profiles.role from user_roles
UPDATE profiles p SET role = ur.role::TEXT
  FROM user_roles ur WHERE ur.user_id = p.id
  AND (p.role = 'staff' OR p.role IS NULL);

-- weeks
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- daily_metrics
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS source_toast_report_date DATE;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS source_import_run_id UUID;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS transactions INTEGER;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS labor_cost_total NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS labor_hours_total NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS labor_pct_actual NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS tips_amount NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS comps_amount NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS voids_amount NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS voids_count INTEGER;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS refunds_amount NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS refunds_count INTEGER;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS discounts_amount NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS ticket_time_avg_minutes NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS ticket_time_over_20_pct NUMERIC;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Backfill daily_metrics aliases
UPDATE daily_metrics SET transactions = orders_count WHERE transactions IS NULL AND orders_count IS NOT NULL;
UPDATE daily_metrics SET labor_cost_total = labor_cost WHERE labor_cost_total IS NULL AND labor_cost IS NOT NULL;
UPDATE daily_metrics SET labor_hours_total = labor_hours WHERE labor_hours_total IS NULL AND labor_hours IS NOT NULL;
UPDATE daily_metrics SET labor_pct_actual = labor_pct WHERE labor_pct_actual IS NULL AND labor_pct IS NOT NULL;
UPDATE daily_metrics SET tips_amount = tips WHERE tips_amount IS NULL AND tips IS NOT NULL;
UPDATE daily_metrics SET comps_amount = comps WHERE comps_amount IS NULL AND comps IS NOT NULL;
UPDATE daily_metrics SET voids_amount = voids WHERE voids_amount IS NULL AND voids IS NOT NULL;
UPDATE daily_metrics SET refunds_amount = refunds WHERE refunds_amount IS NULL AND refunds IS NOT NULL;
UPDATE daily_metrics SET discounts_amount = discounts WHERE discounts_amount IS NULL AND discounts IS NOT NULL;
UPDATE daily_metrics SET ticket_time_avg_minutes = avg_turn_time_mins WHERE ticket_time_avg_minutes IS NULL AND avg_turn_time_mins IS NOT NULL;
UPDATE daily_metrics SET last_synced_at = synced_at WHERE last_synced_at IS NULL AND synced_at IS NOT NULL;

-- insights
ALTER TABLE insights ADD COLUMN IF NOT EXISTS evidence_ids JSONB DEFAULT '[]'::JSONB;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS feedback feedback_vote;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS feedback_note TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS dismiss_note TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS snoozed_until DATE;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS dedupe_hash TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS metric_name TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS metric_value TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS threshold TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE insights SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;

-- action_items
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS day_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS pillar TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS problem_detail TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS insight_title TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS insight_summary TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS facts TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS feedback feedback_vote;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS feedback_note TEXT;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'barpulse';
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS approved_by_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS venue_id UUID;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS auto_approve_rule TEXT;
UPDATE action_items SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;
UPDATE action_items SET last_synced_at = synced_to_asana_at WHERE last_synced_at IS NULL AND synced_to_asana_at IS NOT NULL;

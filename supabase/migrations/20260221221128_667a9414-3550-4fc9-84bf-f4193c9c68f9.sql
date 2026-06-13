
-- Migration 4b: More column upgrades

-- weekly_scorecard
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE weekly_scorecard SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS r5_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS r5_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS l5_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS l5_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS o5_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS o5_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS g5_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS g5_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS marketing_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS marketing_grade TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS marketing_trend TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS marketing_explanation TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s1_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s1_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s2_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s2_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s3_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s3_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s4_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s4_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s5_actual NUMERIC;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS s5_score INTEGER;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS qa_grade_mismatch BOOLEAN DEFAULT false;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS revenue_drivers TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS labor_drivers TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS operations_drivers TEXT;
ALTER TABLE weekly_scorecard ADD COLUMN IF NOT EXISTS guest_experience_drivers TEXT;

-- shift_logs
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE shift_logs SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS week_id UUID;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS log_intent TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS ai_auto_tags JSONB;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS ai_severity TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS ai_sentiment TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS voice_audio_url TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS voice_transcript TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS follow_up_needed BOOLEAN DEFAULT false;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS follow_up_task_id UUID;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS headlines TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS callouts INTEGER DEFAULT 0;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS callout_names TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS comp_reasons TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS comps_given NUMERIC;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS handoff_notes TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS tomorrow_focus TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS shift_wins TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS shift_challenges TEXT;
ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- gm_logs
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE gm_logs SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS week_id UUID;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS submitted_by UUID;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS day_rating SMALLINT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS week_rating_enum TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS wins TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS incidents TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS summary_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS staff_performance_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS coaching_given TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS recognition_given TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS schedule_changes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS inventory_issues TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS orders_placed TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS waste_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS maintenance_completed TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS maintenance_pending TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS vendor_visits TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS notable_guest_interactions TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS vip_visits TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS review_responses TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS marketing_activities TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS content_captured BOOLEAN DEFAULT false;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS content_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS security_incidents TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS cash_handling_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS tomorrow_events TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS tomorrow_staffing_notes TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS tomorrow_focus TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS for_chad TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS challenges_and_concerns TEXT;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gm_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- sync_runs
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS week_id UUID;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS completion_tokens INTEGER;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS ai_latency_ms INTEGER;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS ai_cost_usd DECIMAL(8,4);
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS notes TEXT;

-- period_config
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS comps_pct_target NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS check_avg_target NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS ticket_time_over_20_pct_target NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS employee_logs_target INTEGER;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS composite_rating_target NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS guest_experience_min_score NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS target_social_posts_week INTEGER;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS target_events_per_month INTEGER;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS target_content_capture_pct NUMERIC;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS promos_events_target INTEGER;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS promo_redemptions_target INTEGER;
ALTER TABLE period_config ADD COLUMN IF NOT EXISTS venue_id UUID;
UPDATE period_config SET venue_id = bar_id WHERE venue_id IS NULL AND bar_id IS NOT NULL;

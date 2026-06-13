
-- Migration 7: Functions, triggers, views, indexes

-- Score → Grade function
CREATE OR REPLACE FUNCTION get_grade(score DECIMAL)
RETURNS grade_letter AS $$
BEGIN
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 80 THEN RETURN 'B';
  ELSIF score >= 70 THEN RETURN 'C';
  ELSIF score >= 60 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-set grade on scorecard
CREATE OR REPLACE FUNCTION validate_scorecard_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overall_score IS NOT NULL THEN
    NEW.overall_grade := get_grade(NEW.overall_score::DECIMAL)::TEXT;
    NEW.qa_grade_mismatch := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scorecard_grade ON weekly_scorecard;
CREATE TRIGGER trg_scorecard_grade
  BEFORE INSERT OR UPDATE ON weekly_scorecard
  FOR EACH ROW
  EXECUTE FUNCTION validate_scorecard_grade();

-- User venue IDs helper (for RLS)
CREATE OR REPLACE FUNCTION user_venue_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(venue_id),
    '{}'::UUID[]
  ) FROM venue_assignments WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- weekly_core_computed view
CREATE OR REPLACE VIEW weekly_core_computed AS
SELECT
  w.id AS week_id,
  w.bar_id AS venue_id,
  w.week_start,
  w.week_end,
  COALESCE(SUM(dm.gross_sales), 0) AS gross_sales,
  COALESCE(SUM(dm.net_sales), 0) AS net_sales,
  COALESCE(SUM(dm.orders_count), 0) AS transactions,
  CASE WHEN SUM(dm.orders_count) > 0
    THEN ROUND(SUM(dm.net_sales) / SUM(dm.orders_count), 2)
    ELSE 0 END AS check_avg,
  COALESCE(SUM(dm.discounts), 0) AS discounts_amount,
  COALESCE(SUM(dm.comps), 0) AS comps_amount,
  CASE WHEN SUM(dm.net_sales) > 0
    THEN ROUND(SUM(dm.comps) / SUM(dm.net_sales) * 100, 2)
    ELSE 0 END AS comps_pct,
  COALESCE(SUM(dm.voids), 0) AS voids_amount,
  CASE WHEN SUM(dm.net_sales) > 0
    THEN ROUND(SUM(dm.voids) / SUM(dm.net_sales) * 100, 2)
    ELSE 0 END AS voids_pct,
  COALESCE(SUM(dm.tips), 0) AS tips_amount,
  CASE WHEN SUM(dm.net_sales) > 0
    THEN ROUND(SUM(dm.tips) / SUM(dm.net_sales) * 100, 2)
    ELSE 0 END AS tips_pct,
  COALESCE(SUM(dm.labor_cost), 0) AS labor_cost_total,
  COALESCE(SUM(dm.labor_hours), 0) AS labor_hours_total,
  CASE WHEN SUM(dm.net_sales) > 0
    THEN ROUND(SUM(dm.labor_cost) / SUM(dm.net_sales) * 100, 2)
    ELSE 0 END AS labor_pct,
  CASE WHEN SUM(dm.labor_hours) > 0
    THEN ROUND(SUM(dm.net_sales) / SUM(dm.labor_hours), 2)
    ELSE 0 END AS splh,
  ROUND(AVG(dm.avg_turn_time_mins), 2) AS ticket_time_avg_minutes,
  COALESCE(SUM(dm.refunds), 0) AS refunds_amount,
  COALESCE(SUM(dm.guests), 0) AS weekly_guests,
  COALESCE(SUM(dm.overtime_hours), 0) AS overtime_hours,
  COALESCE(SUM(dm.scheduled_hours), 0) AS scheduled_hours,
  COUNT(dm.id) AS days_with_data
FROM weeks w
LEFT JOIN days d ON d.week_id = w.id
LEFT JOIN daily_metrics dm ON dm.day_id = d.id
GROUP BY w.id, w.bar_id, w.week_start, w.week_end;

-- Set security_invoker on the computed view
ALTER VIEW weekly_core_computed SET (security_invoker = on);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_profiles_venue ON employee_profiles(venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_metrics_week ON employee_weekly_metrics(week_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_incidents_emp ON employee_incidents(employee_id, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON employee_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_venue_date ON daily_metrics(venue_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_venue_id ON insights(venue_id);
CREATE INDEX IF NOT EXISTS idx_action_items_venue_id ON action_items(venue_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_venue_date ON shift_logs(venue_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gm_logs_venue_date ON gm_logs(venue_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_dedupe ON insights(dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_insights_status_severity ON insights(venue_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_action_items_source ON action_items(source, venue_id);
CREATE INDEX IF NOT EXISTS idx_action_items_asana ON action_items(asana_task_gid) WHERE asana_task_gid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scorecard_venue_week ON weekly_scorecard(venue_id, week_id);
CREATE INDEX IF NOT EXISTS idx_briefings_venue_week ON weekly_briefings(venue_id, week_id);


INSERT INTO action_items (title, detail, estimated_minutes, priority, approval_status, status, source, insight_id, bar_id, week_id)
SELECT
  'Review: ' || i.title,
  i.summary,
  15,
  CASE i.severity
    WHEN 'Critical' THEN 'P1-Critical'
    WHEN 'High'     THEN 'P2-High'
    WHEN 'Medium'   THEN 'P3-Medium'
    ELSE 'P4-Low'
  END,
  'Proposed',
  'Not Started',
  'barpulse',
  i.id,
  i.bar_id,
  i.week_id
FROM insights i
WHERE NOT EXISTS (
  SELECT 1 FROM action_items ai WHERE ai.insight_id = i.id
);

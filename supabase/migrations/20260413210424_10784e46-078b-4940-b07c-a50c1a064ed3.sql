
-- Backfill insights with NULL week_id
UPDATE insights i
SET week_id = w.id
FROM weeks w
WHERE i.week_id IS NULL
  AND w.bar_id = i.bar_id
  AND i.source_date IS NOT NULL
  AND w.week_start <= i.source_date
  AND w.week_end >= i.source_date;

-- Backfill action_items with NULL week_id via their linked insight's source_date
UPDATE action_items
SET week_id = sub.wk_id
FROM (
  SELECT ai.id AS ai_id, w.id AS wk_id
  FROM action_items ai
  JOIN insights ins ON ins.id = ai.insight_id
  JOIN weeks w ON w.bar_id = ai.bar_id
    AND ins.source_date IS NOT NULL
    AND w.week_start <= ins.source_date
    AND w.week_end >= ins.source_date
  WHERE ai.week_id IS NULL
) sub
WHERE action_items.id = sub.ai_id;

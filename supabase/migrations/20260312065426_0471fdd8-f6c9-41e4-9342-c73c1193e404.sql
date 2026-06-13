-- Final cleanup: null out all bad labor data where wages are 0 but hours exist
UPDATE daily_metrics 
SET labor_pct = NULL, labor_cost = NULL, splh = NULL
WHERE date >= '2026-03-02' 
  AND date <= '2026-03-11' 
  AND (labor_pct = 0 OR labor_cost = 0)
  AND labor_hours > 0;
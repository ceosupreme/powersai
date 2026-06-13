-- Clean up incorrect labor_pct=0 and labor_cost=0 where Toast wages were broken
-- but labor hours exist (Mar 2 - Mar 11, 2026)
UPDATE daily_metrics 
SET labor_pct = NULL, labor_cost = NULL, splh = NULL
WHERE date >= '2026-03-02' 
  AND date <= '2026-03-11' 
  AND (labor_cost = 0 OR labor_cost IS NULL)
  AND labor_hours > 0
  AND source = 'toast';
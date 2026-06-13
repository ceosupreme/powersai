---
name: Insights deterministic dedupe constraint
description: Partial unique index on insights.dedupe_hash for deterministic_trigger rows; the existing 23505 upsert path in labor-compliance-alerts depends on it. New deterministic detectors must supply a stable dedupe key.
type: constraint
---

## The index

```sql
CREATE UNIQUE INDEX idx_insights_dedupe_unique_deterministic
ON public.insights (dedupe_hash)
WHERE generated_by = 'deterministic_trigger' AND dedupe_hash IS NOT NULL;
```

Without this constraint, concurrent runs of any deterministic detector double-insert when the rate of races exceeds the previous (bar_id, title) partial index's reach. The (bar_id, title) index doesn't help when titles vary across runs (e.g., when employee_name resolution changes).

## Implications for new detectors

- Every deterministic detector MUST set `dedupe_hash` to a stable key per logical alert. Examples:
  - `late_meal:<venueId>:<shiftId>`
  - `missed_meal:<venueId>:<shiftId>`
  - `weekly_ot:<venueId>:<empId>:<isoWeekStart>`
  - `multi_loc:<venueId>:<ssId>:<isoWeekStart>`
  - `meal_config_gap:<venueId>:<isoWeekStart>`
  - `meal_break_weekly_rollup:<venueId>:<isoWeekStart>`
- `upsertComplianceInsight` in `_shared/labor-compliance-alerts.ts` catches the resulting `23505` and refreshes the existing row instead of inserting a duplicate. Do not bypass this helper.
- AI-generated insights (`generated_by != 'deterministic_trigger'`) are NOT covered by this constraint and continue to dedupe via title patterns + grouping in the AI pipeline.

## Why
Spot-check 5/2026 found duplicate Juan Luciano late_meal pairs and 11 total dup rows across `late_meal`, `missed_meal`, and `meal_config_gap` detectors due to the missing constraint. Cleaned up + indexed.

---
name: Consecutive Decline Detectors
description: 3-consecutive day-of-week decline and 3-consecutive YoY week decline alerts are client-requested; do not add severity/magnitude floors
type: constraint
---
The two deterministic detectors below are explicit client requests. They are designed to surface every clean 3-in-a-row trend, even when individual deltas are small.

1. **3-consecutive same-day-of-week decline** (e.g., Sundays $3.0K → $2.7K → $2.5K vs prior 3 Sundays at the same venue).
2. **3-consecutive YoY week decline** vs the same ISO week last year.

**Rule:** Do NOT add severity floors, magnitude thresholds (dollar minimums, percent minimums), or any other gate to either detector without explicit client direction. The point is the streak itself, not the size of any individual delta. If a future request asks to "tame noise" on these, push back and confirm with the client first.

Lives in `supabase/functions/generate-daily-insights/index.ts` (Triggers around the YOY/same-day decline blocks). Source metric tags: `daily_yoy_drop` and the analogous DoW detector.

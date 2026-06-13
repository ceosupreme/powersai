---
name: compute-weekly-scores coverage gate
description: Hard skip weekly_core/scorecard write when daily_metrics coverage <85% OR <85% of days have plausible net_sales (>=$100)
type: feature
---
compute-weekly-scores enforces TWO coverage gates before any write:

1. **Row-count gate** (`[COVERAGE-GATE]`): distinct daily_metrics dates / 7 must be ≥0.85. Skip with `{status:"skipped", reason:"coverage_gate", days_present}`.
2. **Value-aware gate** (`[COVERAGE-GATE-VALUE]`, Phase E): days with `net_sales >= $100` / 7 must also be ≥0.85. Catches degenerate rows ($0 / $19 / $117) from partial-day captures that would otherwise pass the row-count gate. Skip with `{status:"skipped", reason:"coverage_gate_value", days_present, valid_days}`.

Both skip writes to weekly_core AND weekly_scorecard; prior week's row remains current. Constants: `DAILY_COVERAGE_THRESHOLD=0.85`, `PLAUSIBLE_NET_SALES_FLOOR=100`. No flag column, no UI surface.

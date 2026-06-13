---
name: Log Frequency detector — closed-week evaluation
description: Log Frequency detector (generate-daily-insights Trigger 1) evaluates the most-recently CLOSED ISO week, never the current in-progress week. Fires once on Monday per closed week.
type: feature
---

## Rule

`generate-daily-insights` Trigger 1 ("Log Frequency Alert") MUST evaluate the most recently closed ISO week, resolved via `weeks` table with `.lt('week_end', todayPT)`. Never count logs against the current (in-progress) week's `weekStart..weekEnd` — partial-week counts trip the 5+ threshold and produce false-positive "only N daily logs this week" alerts.

## Pattern

- Monday gate (`dayOfWeek === 1`) preserved — alert fires once on Monday per closed week.
- Closed-week lookup: `weeks WHERE bar_id=? AND week_end < todayPT ORDER BY week_start DESC LIMIT 1`.
- Counts `gm_logs` + `lead_logs` + native `shift_logs` (excluding 7shifts sources) across the closed week.
- Dedupe probe scoped to the closed-week `source_date` range (not current week).
- Title encodes the closed-week date range (e.g., `May 11-May 17:`), satisfying the deterministic-rolling-window-titles rule.

## Why

Bug shipped 2026-05-18: Monday cron evaluated 5/18–5/24 (new in-progress week) against the 5+ threshold and fired 8 false positives ("Only 0 daily logs"). Cleanup migration dismissed them with `dismiss_reason='in_progress_week_false_positive'`.

## Sibling check

Triggers T2 / T2B (three-week sales / YOY decline) already use the same `.lt('week_end', todayPT)` closed-week pattern. T3 / T4 / T4B are per-day and don't have the bug. `runWeeklyLaborAlerts` receives an explicit closed Monday from its caller. T1 was the only weekly-window detector with this bug.

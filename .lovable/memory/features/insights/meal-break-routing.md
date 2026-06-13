---
name: Meal-break insight routing
description: Individual late_meal/missed_meal insights are hidden from the main /insights feed; a weekly rollup card surfaces them in aggregate. ComplianceTab + /audit retain individual rows. Scoring unchanged.
type: feature
---

## Routing

- **Main /insights feed** (`fetchInsightCardsFromSupabase`) excludes `source_metric IN ('missed_meal','late_meal')` by default. Pass `{ includeIndividualMealBreaks: true }` to include them (e.g. /audit if it ever switches to this helper).
- **Employee profile → ComplianceTab** queries `source_metric` directly. Unaffected — individual rows still render.
- **/audit (`InsightsAudit.tsx`)** queries `insights` + `action_items` directly (not via the helper). Unaffected.
- **Weekly Review** pillar drilldowns are scoring-metric filtered. Unaffected.

## Weekly rollup detector

`detectWeeklyMealBreakRollup` in `_shared/labor-compliance-alerts.ts`. Invoked from `runWeeklyLaborAlerts` so it fires from both:
- `generate-monday-briefing` (Monday weekly pass)
- `compliance-sweep` (rolling per-week pass; fires for current + previous weeks)

Output: 1 insight per venue per ISO week with:
- `source_metric = 'meal_break_weekly_rollup'`
- `dedupe_hash = meal_break_weekly_rollup:<venueId>:<isoWeekStart>` (unique under partial index)
- severity = High when total ≥ 10 OR missed ≥ 3, else Medium
- title: `<Venue>: <N> meal break violations this week across <M> employees`
- summary lists missed/late split, week, top 3 employees
- paired action via deterministic-actions template `meal_break_weekly_rollup` → `Review meal break violations at <Venue> week of <weekStart>`

## Per-employee escalation

In addition to the rollup, `detectWeeklyMealBreakRollup` emits a High-severity card per employee with **≥5 violations** in the same ISO week:
- `source_metric = 'meal_break_employee_escalation'`
- `dedupe_hash = meal_break_emp_escalation:<venueId>:<empId>:<isoWeekStart>`
- title: `<Employee>: <N> meal break violations — week of <weekStart>`
- These cards **DO** surface in the main /insights feed (the read-side `.or()` whitelist only excludes raw `late_meal` / `missed_meal`).

## Scoring

Labor pillar continues to consume the underlying individual time_entries. Only the /insights UI surface changes — no scoring impact.

## Backfill

Initial backfill seeded for week-of-4/20 and week-of-4/27 (8 cards) so the feed isn't empty after the read-layer filter takes effect.

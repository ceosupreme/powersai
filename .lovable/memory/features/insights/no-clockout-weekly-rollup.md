---
name: no_clockout weekly rollup routing
description: Individual no_clockout insights are hidden from the main /insights feed; a weekly rollup card surfaces them in aggregate. Per-employee escalation (≥3/week) DOES surface in the main feed. ComplianceTab + /audit retain individual rows. Mirrors meal-break rollup pattern.
type: feature
---

## Routing

- **Main /insights feed** (`fetchInsightCardsFromSupabase`) excludes `source_metric='no_clockout'` by default. Pass `{ includeIndividualNoClockouts: true }` to include them. Filter is combined with the meal-break exclusion via a single NULL-safe `.or('source_metric.is.null,and(<neq clauses>)')` — both options can be toggled independently.
- **Employee profile → ComplianceTab** queries `source_metric` directly. Unaffected.
- **/audit (`InsightsAudit.tsx`)** queries `insights` + `action_items` directly (not via the helper). Unaffected.
- Rollup (`no_clockout_weekly_rollup`) and per-employee escalation (`no_clockout_employee_escalation`) are NOT in the exclusion list → surface naturally in main feed.

## Weekly rollup detector

`detectWeeklyNoClockoutRollup` in `_shared/labor-compliance-alerts.ts` (Detector 9). Invoked from `runWeeklyLaborAlerts`, so it fires from both:
- `generate-monday-briefing` (Monday weekly pass)
- `compliance-sweep` (rolling per-week pass; current + previous weeks)

Output: 1 insight per venue per ISO week with:
- `source_metric = 'no_clockout_weekly_rollup'`
- `dedupe_hash = no_clockout_weekly_rollup:<venueId>:<isoWeekStart>`
- severity = High when total ≥ 5 OR Class C count ≥ 3, else Medium
- title: `<Venue>: <N> no-clockout event(s) this week across <M> employee(s)`
- Class C count derived by parsing `source_context` JSON of each underlying no_clockout insight (`auto_clocked_out === true`)
- summary lists Class C / other split, week, top 3 employees
- paired action via `_shared/deterministic-actions.ts` template `no_clockout_weekly_rollup` → `Review no-clockout events at <Venue> week of <weekStart>`

## Per-employee escalation

For any employee with **≥3 no_clockout events** in the same ISO week:
- `source_metric = 'no_clockout_employee_escalation'`
- `dedupe_hash = no_clockout_emp_escalation:<venueId>:<empId>:<isoWeekStart>`
- severity = High
- title: `<Employee>: <N> no-clockout events — week of <weekStart>`
- action template → `Coach <Employee> on clockout discipline — week of <weekStart>`
- These cards **DO** surface in the main /insights feed.

## Scoring

Labor pillar continues to consume underlying time_entries. Only the /insights UI surface changes — no scoring impact.

## Backfill

2026-05-13 backfill via `compliance-sweep` with `anchorDate=2026-05-08` and `anchorDate=2026-05-01` seeded rollups for weeks of 5/04, 4/27, 5/11. Detectors are idempotent via `dedupe_hash`.

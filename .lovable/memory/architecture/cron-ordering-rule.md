---
name: Cron ordering rule — sync before insight generation
description: Daily sync jobs that write to time_entries / daily_metrics / logs MUST run (and complete) before any cron that reads from those tables to generate insights, scores, or alerts. Otherwise detectors fire on stale snapshots (e.g. false "no clockout" insights).
type: constraint
---

## Rule
Any cron job that reads operational tables to generate insights/scores/alerts (`generate-daily-insights`, `compliance-sweep-daily`, scoring jobs) MUST be scheduled AFTER the sync jobs that write to those tables for the current business day.

**Why:** Reading before sync produces false-negative/positive alerts on stale data. Discovered via false "no clockout" insights when `sync-toast-time-entries-daily` (07:45 PT) ran AFTER `generate-daily-insights` (07:30 PT).

## Current daily schedule (Pacific Time → UTC)
1. **07:15 PT (`15 14 * * *`)** — `sync-toast-time-entries-daily` (writes `time_entries.out_date`)
2. **07:20 PT (`20 14 * * *`)** — `parse-logs-daily` (writes parsed log fields)
3. **07:30 PT (`30 14 * * *`)** — `generate-daily-insights` (reads both above)

## How to apply
- Before adding/moving a cron, check what tables it writes/reads.
- Sync writers come first; insight/score/compliance readers come last.
- Leave ≥10 min headroom between writer end and reader start to absorb per-venue iteration.
- Verify with: `SELECT jobname, schedule FROM cron.job ORDER BY schedule;`

## Known single-writers (audit before reordering)
- `time_entries.out_date` → only `sync-toast-time-entries` writes it.

## Detector self-resolution requirement
Cron ordering only protects the *first* fire. Detectors that read time-windowed source data MUST also sweep their prior open insights and dismiss any whose source rows have since been corrected or deleted. Otherwise stale alerts persist forever once underlying data is fixed late.

Pattern: before inserting new insights for a (venue, date) bucket, query existing open insights for the same `source_metric` + `source_date` and dismiss those whose source row is now resolved. Use a specific `dismiss_reason` (e.g. `stale_no_clockout_resolved`). See [features/insights/no-clockout-detector](mem://features/insights/no-clockout-detector) for a worked implementation.

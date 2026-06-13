---
name: toast_metrics sync_runs reaper
description: Dispatcher auto-fails toast_metrics worker runs stuck in 'running' >15min and re-enqueues their date range
type: feature
---
Phase F. At the top of every sync-toast-metrics dispatcher invocation, query `sync_runs` for `sync_type='toast_metrics' AND status='running' AND started_at < now() - 15 min`. For each match: mark `status='failed'` with `error_message='auto-reaped: wall-clock timeout (>15min in running)'`, then re-enqueue a fresh worker via `pg_net` using `metadata.start_date` / `metadata.end_date` and the run's `bar_id`. Log `[REAPER] re-enqueued {bar} {start}..{end}`. Prevents silent multi-day gaps like the HILLS 2026-05-02 stalled-dispatcher case.

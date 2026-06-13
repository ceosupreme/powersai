---
name: toast metrics fan-out
description: sync-toast-metrics dispatches per-venue child invocations via pg_net to avoid 300s wall-clock timeout
type: feature
---
sync-toast-metrics runs in two modes:
- **Dispatcher** (no venue filter, multiple venues): inserts a `sync_runs` row with sync_type=`toast_metrics_dispatch`, then fires one `net_http_post` per venue with `{venue_id, start_date, end_date}`, staggered 1s. Returns immediately.
- **Worker** (venue_id/bar_code present, or single-venue list): runs the existing per-venue loop unchanged. Stays well under 300s.

Venues query uses `.order('bar_code', { ascending: true })` for deterministic iteration.

Mirrors `architecture/insight-orchestration` (generate-daily-insights). Replaced sequential 8-venue loop that was timing out and stalling the last-iterated venue (Harbor Town / Sycamore Den would silently miss days).

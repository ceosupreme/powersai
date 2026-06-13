---
name: toast sync grace window
description: sync-toast-metrics refuses to write daily_metrics for any date whose Pacific business day hasn't closed for ≥6h
type: feature
---
Phase B of the partial-day fix. Inside the per-day loop, before any idempotency check, compute `eodPlusGraceUtc(date)` = next-day 09:00 PT (03:00 EOD + 6h grace). If `Date.now() < eodGrace`, skip the date with `[GRACE-WINDOW] {bar}/{date} business day not safely closed (until ...) — skipping`. `force_resync=true` bypasses the guard for ops repair. Helper `ptWallClockToUtc` handles PST/PDT correctly. Mirrors `architecture/insight-generation/grace-window`.

---
name: toast sync freshness-aware idempotency
description: Existing toast_analytics_api row only blocks re-fetch when its synced_at is after the date's EOD+grace
type: feature
---
Phase C of the partial-day fix. The existing-row skip in sync-toast-metrics now reads `synced_at` along with `source`. Logic:
- manual sources: always preserved (unless force_resync).
- toast_analytics_api row + `synced_at >= eodPlusGraceUtc(date)`: `[SKIP] already synced (fresh: ...)`.
- toast_analytics_api row + `synced_at <  eodPlusGraceUtc(date)`: `[REFRESH] prior sync was Nh before EOD+grace — re-fetching` and overwrite via the normal upsert path.

This auto-heals the partial-day capture failure mode (mid-business-day sync at 13:42 PT locking in $1.6K instead of $23K) on the next nightly cron with no manual `force_resync` needed.

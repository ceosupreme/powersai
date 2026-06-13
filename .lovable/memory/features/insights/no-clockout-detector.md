---
name: no_clockout detector — settle window, self-resolution, Class C policy
description: Deterministic no_clockout detector behavior. 14-day lookback, 90-min settle window for null-out entries, self-resolution sweep dismisses prior insights when source time_entries are corrected/deleted. 4am PT auto_clocked_out=true entries are real management failures and ALWAYS fire — never suppress, no shift-length gate.
type: feature
---

## Detector source
`supabase/functions/_shared/labor-compliance-alerts.ts` — Detector 5 (NO CLOCKOUT) inside the daily compliance pass.

## Lookback
14 days, excluding today (`businessDate >= lookbackStr && businessDate < todayStr`).

## Two firing classes
1. **`out_date IS NULL`** (nullOut) — High severity. Subject to 90-minute settle window: skip if `(now - in_date) < 90 min` so Toast sync can catch a manual clockout before we alert.
2. **`auto_clocked_out = true`** (Class C) — Medium severity. **Fires immediately, no settle window, no shift-length gate, never suppressed.** This represents Toast's 4am PT default end-of-day cleanup force-closing an entry the employee never actually clocked out from. It is a real management failure, not routine late-night behavior.

## Self-resolution sweep
Runs unconditionally on every daily compliance pass (independent of whether the pass-date itself fires new alerts). Sweeps the **full 14-day lookback window** — `source_date BETWEEN lookbackStr AND businessDate` — not just the pass-date. Dismisses any open `no_clockout` insight whose underlying `time_entries` row:
- is missing (`te.id IS NULL`), OR
- is deleted (`te.deleted = true`), OR
- now has a manual clockout (`te.out_date IS NOT NULL AND te.auto_clocked_out = false`).

Dismissal: `status='Dismissed'`, `dismiss_reason='stale_no_clockout_resolved'`. **Do NOT include `updated_at` in the update payload — that column does not exist on `insights`; PostgREST 400s and the dismiss silently no-ops.** Class C (`auto_clocked_out=true AND deleted=false`) is preserved by construction.

Log line: `[LABOR-ALERT][no_clockout] sweep venue=X window=lookback..pass scanned=N dismissed=M`.

## Why full-window sweep matters
`generate-daily-insights` processes a single `businessDate` per pass. A per-pass-date sweep can never re-evaluate an insight fired on day N when the underlying entry is corrected on day N+2 — subsequent passes process N+1, N+2, etc., never N. The detector looks back 14 days; the sweep must too.

## Dedupe
`dedupe_hash = no_clockout:{venueId}:{entry.id}` — per time-entry, so dismissed Class A/B insights don't re-fire when the detector runs again.

## Verified counts
- 2026-05-06 manual cleanup: dismissed 63 stale (54 Class A + 9 Class B), preserved 7 Class C.
- 2026-05-13 sweep-window-fix cleanup: dismissed 23 stale rows portfolio-wide that the narrow sweep had missed (Werewolf 12, Aero Club 5, Waterfront 3, Club Marina/Harbor Town/Hearth House 1 each). Waterfront from 5 open → 2 (both real Class C: Kayla Johnson 5/11, Tommy Hackett 5/7).

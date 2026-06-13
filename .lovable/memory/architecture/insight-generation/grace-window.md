---
name: Daily insight tri-pass model — grace removed
description: Three idempotent passes per business date (early/fresh/catchup) all run with 0h grace. Same-day surfacing + long-tail catchup; substantive-content-guard + dedupe handle re-entry safety.
type: feature
---

`generate-daily-insights` runs in **three passes per business date**. All three target the date by `log_date` (not `created_at`) and write through the `idx_insights_dedupe_unique_deterministic` partial unique index + substantive-content-guard, so re-runs are idempotent. The `pass` request-body field (`'early' | 'fresh' | 'catchup'`, default `'catchup'`) selects which one.

| Pass | Cron (jobid) | UTC | PT | Default target | Grace | Purpose |
|------|--------------|-----|-----|----------------|-------|---------|
| **early** | `generate-daily-insights-early` (41) | `30 11 * * *` | 04:30 | `yesterday()` | **0h** | Captures close-of-night log filers (2-3am PT). Ready by Chad's 6am PT read. |
| **fresh** | `generate-daily-insights-fresh` (30) | `0 18 * * *`  | 11:00 | `yesterday()` | **0h** | Picks up morning filers; idempotent supplement. |
| **catchup** | `generate-daily-insights` (3) | `30 14 * * *` | 06:30 next day | `twoDaysAgo()` | **0h** | Long-tail: late-afternoon and 24h+ filers. |

End-user perception: yesterday's insights appear by early morning today; the same date refreshes through the day and overnight as late entries arrive.

## Pass routing rules

- **Body parse:** `body.pass ∈ {'early','fresh','catchup'}` honored; default catchup.
- **Date defaults:** catchup → `twoDaysAgo()`; early & fresh → `yesterday()`.
- **No grace gate:** removed 2026-05-16. Previous gate (10h fresh / 36h catchup) was vestigial — querying by `date` + dedupe already covered late filers.
- **Score-driven backfill** (`week_start` override) bypasses pass semantics — unchanged.
- **Fan-out dispatch** propagates `pass` to per-venue invocations via pg_net body.

## Why tri-pass + 0h grace

28-day diagnostic of real-time log entries (within 72h of business date):

| Source | n | p50 | p75 | p90 | by 12h | by 24h | by 36h |
|---|---|---|---|---|---|---|---|
| gm_logs | 559 | 7.1h | 9.8h | 57.8h | 77% | 80% | 86% |
| lead_logs | 98 | 7.1h | 9.8h | 57.8h | 76% | 76% | 87% |
| shift_logs | 395 | 7.5h | 7.5h | 31.5h | 82% | 82% | 98% |

Late filing is the norm; a single-pass cron forced a trade-off between coverage and perceived lag. Tri-pass closes both ends: 04:30 PT same-morning surfacing for end-of-night filers, 11:00 PT for morning filers, 06:30 PT next day for the long tail.

## Idempotency guarantees

1. **Storage key:** Logs are stored against the form's date field (or PT-local `created_at` fallback as of the `parseLogDate` PT-fix 2026-05-16). `generate-daily-insights` queries `eq('date', target)` — re-runs see new arrivals automatically.
2. **Deterministic dedupe:** `dedupe_hash` partial unique index (`idx_insights_dedupe_unique_deterministic`) blocks duplicate deterministic insights across passes.
3. **AI dedupe (daily_insights_v2):** stable `dedupe_hash = daily_v2:<bar_id>:<source_date>:<normalized_title>` + partial unique index `idx_insights_dedupe_unique_daily_v2` (added 2026-05-20) blocks duplicate AI cards within the active (non-Dismissed) set. Re-running a venue/date is inherently safe — same-title insights are 23505 no-ops; only new/changed titles land. Within-batch word-overlap dedupe still runs first as a cheap pre-filter.
4. **No time-based skip gate:** there is NO 36h / 10h / created_at gate anywhere in `processBar`. The only date-based skip is the future-date guard (`date >= todayLocal in venue TZ`). Dedupe at insert time is the real safeguard — count-based early-out is a cheap optimization only.
5. **Substantive-content-guard:** `processBar` skips the AI call when no source carries operational signal. For `## 7SHIFTS TASKS` sections the guard accepts ❌, "Incomplete tasks", OR any `\d+/\d+` fraction below 100% (so persisted `shift_logs.source='7shifts_tasks'` rows surfacing 0/19-class data are not misclassified as placeholders).

## Diagnostic log lines

- `Generating ${insightMode} insights pass=${pass} for dates=...` — entry log per invocation (orchestrator and per-venue).
- `[SCORE-DRIVEN]` prefix marks backfill runs that bypass pass semantics.

## Migration history

- **2026-05-08:** Dual-pass introduced (fresh 10h + catchup 36h) to fix grace-window vs cron-time mismatch postmortem.
- **2026-05-14:** Fresh cron scheduled (`generate-daily-insights-fresh`, jobid 30) at 18:00 UTC.
- **2026-05-16:** Tri-pass migration. Added early pass (jobid 41) at 11:30 UTC. Removed grace gate from all three passes. Bundled `parseLogDate` UTC→PT fallback fix in `sync-asana-logs` (late-night PT logs were attributed to the next business day).

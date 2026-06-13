---
name: Monday Briefing Reliability
description: Precondition + re-enqueue + Tuesday sweeper cron for generate-monday-briefing race fix
type: feature
---
`generate-monday-briefing` had a long-standing race with `compute-weekly-scores` causing 3-5/8 venues to miss briefings most weeks (and 0/8 occasionally).

Fixes (2026-05-05):
1. **Precondition guard**: Per-venue, skip if `weekly_scorecard` row is missing for `(week_id, bar_id)`. Log `[BRIEFING-PRECONDITION-FAIL] bar=<id> week_start=<date> reason=missing_scorecard is_retry=<bool>`.
2. **Auto re-enqueue**: On precondition fail with `is_retry=false`, fire a one-shot retry via `net_http_post` RPC with `{is_retry:true}`. Log `[BRIEFING-REENQUEUE]`. No infinite loops — retries don't re-enqueue.
3. **Sweeper mode**: Body `{sweeper:true}` short-circuits venues that already have a substantive briefing (`length > 50`). Used by the Tuesday cron to fill gaps without rewriting good rows.
4. **Tuesday sweeper cron**: `generate-monday-briefing-tuesday-sweeper` runs `0 18 * * 2` UTC, posts `{"sweeper":true}` to retry any unpopulated venues from Monday's run. Pairs with the Monday cron `generate-monday-briefing-weekly` (`0 18 * * 1`).
5. **Coverage diagnostic**: At end of every invocation, log `[BRIEFING-COVERAGE] week_start=<date> populated=<n>/<total> is_retry=<bool> missing_bar_ids=[…]` for monitoring.

Historical baseline (last 8 weeks before fix): mean 4.4/8 populated. Weeks 4/13 and 4/06 were 0/8 wipeouts.

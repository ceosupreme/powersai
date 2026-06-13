---
name: deterministic-action-contract
description: All three insight generators (daily_insights_v2, weekly_insights, deterministic_trigger) write paired insights+action_items rows. Deterministic detectors must use _shared/deterministic-actions.ts.
type: feature
---
All three insight generator paths must write paired `insights + action_items` rows so the UI ACTION block is never empty and Asana tasks have specific titles:

- `daily_insights_v2` and `weekly_insights` already do this via the AI generator.
- `deterministic_trigger` (labor-compliance-alerts.ts + generate-daily-insights trend/red-score/inventory inserts) writes the action via `_shared/deterministic-actions.ts` `upsertDeterministicAction()`.

**Title rules:** Action titles must be specific — employee + date + violation (e.g. "Verify break with Jake Cline on 2026-04-27; correct in Toast or process §226.7 premium pay") or venue + metric + date. Generic strings are forbidden because the title becomes the Asana task title on approval, and Chad's board fills with vague duplicates otherwise.

**How to add a new deterministic detector:**
1. Build the `insights` row as today, including a stable `source_metric` token.
2. After insert, call `upsertDeterministicAction()` with employee_name / venue_name / metric_label as available.
3. If `source_metric` doesn't match an existing template in `buildTitle()`, add a template — never rely on the generic fallback for production detectors.

**Idempotency:** Partial unique index `action_items_insight_id_deterministic_unique` on `(insight_id) WHERE source='deterministic_trigger'` enforces one action per insight. Re-runs swallow 23505 and refresh only `Pending` rows (never overwrite human-approved/rejected work).

**Phase 2 (deferred):** Strip imperative tails out of `insights.detail` (currently the "What Happened" body sometimes ends with "Confirm with the employee…") and migrate them into `action_items.detail`. Today, action_items.detail is null and insights.detail keeps the full narrative — mildly redundant but not broken.

Replaces the rejected read-path synthesis approach: read-path fallback in `src/services/insightsSupabase.ts` lines 59–86 is kept only as a safety net for legacy pre-fix deterministic insights.

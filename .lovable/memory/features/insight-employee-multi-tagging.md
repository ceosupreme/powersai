---
name: insight-employee-multi-tagging
description: insight_employees junction tags multiple employees per insight; reads union legacy employee_id with junction; author-exclusion + Spanish guardrails
type: feature
---
Multi-employee insight tagging.

- Schema: `insight_employees(insight_id, employee_id, role, employee_name, created_at)` — composite PK on (insight_id, employee_id, role). Roles: subject | witness | recognizer. RLS: admin all; venue users via `user_venue_ids()` against the parent insight's `bar_id`.
- `insights.employee_id` and `employee_name` are KEPT for backward compat. The generator mirrors the first subject from junction back onto these so existing single-employee reads still work.
- Generator (`generate-daily-insights`): per-venue roster from `employee_profiles` (id, employee_name, preferred_name, first/last) injected into prompt as an "EMPLOYEE ROSTER (for tagging)" context section. AI returns `employee_mentions: [{name, role}]`. Post-insert resolver matches by canonical/full/first-name fallback, never invents.
- Reads union legacy + junction:
  - `useEmployeeInsights` — pulls both, dedupes by insight id.
  - `useEmployeeSentimentEvents` — same union, preserves status='approved' and positive/negative filters.
  - `useEmployees` (Wins/Concerns 90d) — adds junction query; dedupes by (employee_id, insight_id).
  - `useEmployeeCompliance` — unchanged (deterministic labor alerts are inherently single-employee).
- No historical backfill of the 839 untagged insights from before this change. They age out of the 90-day window naturally.

## Author-exclusion guardrails (added post-deploy)

GMs/leads write the logs — without guarding, they get tagged as subjects of their own logs.

- `sync-asana-logs/index.ts` — `parseAsanaTaskAuthor(taskName)` strips venue prefixes (`Syc - `, `Hills - `, `HTP - `, etc.), drops trailing date suffixes (`Angel, Apr 30, 2026` → `Angel`), and rejects generic titles ("Lead Logs", "Daily Notes"). Result is prepended to the ingested entry as a `Task Author: <name>` line.
- `gm_logs.author_name` / `lead_logs.author_name` are already set from Asana comment author. Per-comment authors in `shift_logs.shift_summary` are formatted `→ [Author Name] ...` (also captured).
- `generate-daily-insights/index.ts`:
  - `extractEmbeddedAuthors()` pulls both `[Author]` markers and `Task Author:` lines out of `raw_text` / `shift_summary`.
  - `mergeLogSections()` returns an `authorNames` array of every author touched in this run.
  - Each log context block prints an `AUTHOR EXCLUSION:` line telling the AI not to tag the author as subject/witness (recognizers OK — "Shannon shouted out Rosie").
  - `authorEmployeeIds` set resolves each author to a roster employee_id; the haystack fallback skips them entirely; AI-returned tags drop them when role is `subject` or `witness` but keep `recognizer`.

## Spanish-language support

- Both `SYSTEM_PROMPT` and `DAILY_SYSTEM_PROMPT` carry a LANGUAGE line: logs may be Spanish or English; output English.
- `classify-insight-sentiment` system prompt mirrors the same line.
- Roster tokens and the haystack fallback both run through `normalizeForMatch()` (NFKD + diacritic strip + lowercase) so "María" matches "Maria" and vice versa.

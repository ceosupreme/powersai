# Build E — Recovery Report

A per-client weekly report showing what the system recovered (leads, follow-ups, reactivations, reviews) with a conservative, honestly-labeled dollar estimate. Internal-first: cron generates a draft, operator reviews/edits, operator delivers. Assembles strictly from existing tables; clones the `generate-monday-briefing` pattern.

## 1. Storage — dedicated table (clearer than overloading `insights`)

New migration creates `recovery_reports`:

- `id`, `project_id` (FK venues.id, cascade)
- `period_start` date, `period_end` date — Monday–Sunday PT, previous closed week
- `metrics` jsonb — `{ leads: { total, after_hours, by_channel }, followups: { sent, re_engaged }, reactivation: { contacted, responded }, reviews: { requests_sent, reviews_landed } }`
- `estimated_dollars` numeric — conservative headline
- `estimate_basis` jsonb — `{ avg_ticket, close_rate, source: 'project'|'default', formula: "...", caveats: [...] }`
- `narrative` text — AI-generated short plain-language summary (editable)
- `narrative_edited` boolean (operator touched it)
- `status` text check in (`draft`,`reviewed`,`sent`), default `draft`
- `reviewed_by` uuid (auth.users), `reviewed_at` timestamptz, `sent_at` timestamptz
- `generated_at` timestamptz default now(), `updated_at`
- Unique `(project_id, period_start)` — idempotent re-runs UPSERT
- GRANTs: `authenticated` SELECT/UPDATE (status/narrative only via UI), `service_role` ALL
- RLS: read/update gated by `public.user_can_access_project(project_id)`; inserts only via service_role (edge function)
- `updated_at` trigger via existing `handle_updated_at`

No new tracking machinery added.

## 2. Generator — `generate-recovery-report` edge function

Clones the structure of `generate-monday-briefing`:

- Dispatcher mode (`{}` body) — list active projects (venues with at least one `project_automation_enrollments` row OR Build C "active client" flag), fan out via `pg_net` self-invocations with `{ project_id, week_start }` (mirrors briefing fanout).
- Per-project mode — compute `period_start/end` (previous Mon–Sun PT), then for that window aggregate from existing tables:
  - **Leads captured**: `inbound_leads` where `project_id` matches (via lead → project linkage from Build B `useLeadProposal`) and `created_at` in window; flag `after_hours` from `created_at` PT hour outside 9–17 local OR `conversation_channel` = voice/chat off-hours; group by `conversation_channel`.
  - **Follow-ups re-engaged**: count distinct leads where a `followup_sequence_runs` row exists for the lead with `step_index >= 2` AND the lead's `status`/`is_ready` flipped positive after that run's `sent_at` (derived join: `automation_send_log` → `lead_id` → `inbound_leads.updated_at > send_log.sent_at` AND `is_ready=true`). Gap note: if status timestamps are missing, fall back to "follow-ups sent" count with an `estimate_basis.caveats` entry — flagged, not faked.
  - **Reactivation responded**: `reactivation_campaign_runs` joined to `automation_send_log` where `response_at IS NOT NULL` (or queue-row response signal). Same fallback rule if response tracking is sparse.
  - **Reviews generated**: `review_request_runs` count sent in window; cross-ref `online_reviews`/`google_reviews` rows created in window for the project as "landed" approximation.
- **Dollar estimate** (conservative):
  - Pull `bar_targets` / `period_config` avg ticket & close rate for the project.
  - `estimated_dollars = (leads_captured × close_rate × avg_ticket) + (reactivated_responded × avg_ticket) + (re_engaged × close_rate × avg_ticket)`. Review count contributes $0 (reputational, not directly attributable).
  - If project values missing, use clearly-labeled conservative defaults (close_rate=0.15, avg_ticket=$40) and set `estimate_basis.source='default'` with a caveat.
  - Headline only counts confirmed responses for reactivation/re-engagement (no speculative multiplier on raw sends).
- **Narrative** via existing `_shared/ai-models.ts` `callAI` (same wrapper used by briefing) with `taskType: "user_facing_narrative"`, prompt enforces:
  - Activity counts stated as fact.
  - Dollars always prefixed "est." with the basis ("based on your avg ticket of $X and Y% close rate").
  - No phrases like "we earned", "we made you" — uses "captured / re-engaged / at work".
- UPSERT into `recovery_reports` with `status='draft'`. Idempotent on `(project_id, period_start)`.

## 3. Schedule — pg_cron

`supabase--insert` (not migration) registers a weekly cron mirroring briefing registration:
- `recovery-report-dispatch`: Mondays 09:00 PT (16:00 UTC, after briefing settles) → `net.http_post` to `generate-recovery-report` dispatcher with empty body and anon JWT header.
- Generates drafts only; never sends anything outward.

## 4. Internal Review UI

New page `src/pages/RecoveryReports.tsx` mounted at `/recovery-reports` (admin/operator route, gated by existing role check — same surface as `AutomationInbox`):

- Left list: drafts grouped by project, newest period first; status pill (draft/reviewed/sent).
- Detail pane:
  - Project + period header.
  - Four metric cards: Leads Captured, Follow-ups Re-engaged, Customers Reactivated, Reviews Generated — each a hard count with sub-breakdown (after-hours, channel, etc.).
  - Headline card: "Est. $X at work" with a small "How we got this" disclosure listing `estimate_basis` (formulas, source=project|default, caveats).
  - Narrative: editable `<Textarea>` (autosave on blur via update hook).
  - Action row: "Mark reviewed" (sets `status='reviewed'`, `reviewed_by=auth.uid()`, `reviewed_at=now()`), "Copy for client" (copies markdown of facts + narrative + estimate-with-basis to clipboard), "Mark sent" (sets `status='sent'`, `sent_at=now()`; enabled only after reviewed).
- Hook: `src/hooks/useRecoveryReports.ts` — list, get, update narrative, update status. Pure Supabase client (no edge function needed for status changes; RLS allows).
- Add nav entry in the operator nav (mirror where `AutomationInbox` lives).

## 5. Client-presentable export (operator-controlled)

Simplest path: the "Copy for client" button produces a clean Markdown block (header, four facts, headline + basis, narrative). No PDF, no public share link — operator pastes into their existing client channel. Keeps delivery fully operator-controlled, no new auth surface, no public route.

## Files

**New**
- `supabase/migrations/<ts>_recovery_reports.sql` — table, GRANTs, RLS, unique constraint, updated_at trigger
- `supabase/functions/generate-recovery-report/index.ts` — dispatcher + per-project generator
- `src/pages/RecoveryReports.tsx`
- `src/hooks/useRecoveryReports.ts`
- `src/components/recovery/RecoveryReportDetail.tsx` (metric cards, headline, narrative editor, action row)

**Edited (additive only)**
- `src/App.tsx` — route registration
- Operator nav component (same place `/automations/inbox` is wired)
- `src/integrations/supabase/types.ts` — regenerated after migration

## Out of scope (not touched)

Build 0/A/B/C/D, `project_automation_enrollments`, `automation_message_queue`, `automation_send_log`, runs tables, `generate-monday-briefing`, `generate-daily-insights`, RLS on any existing table, AI gateway shared module, integrations. No new tracking columns added to existing tables.

## Verify

- Cron row exists; manual dispatcher invocation creates one `recovery_reports` row per active project for prior week with `status='draft'`.
- Re-run is idempotent (UPSERT on unique constraint).
- Counts match SQL spot-checks against source tables; underivable signals appear in `estimate_basis.caveats`.
- UI: operator can edit narrative, mark reviewed, copy markdown, mark sent. RLS denies cross-project access.
- `tsc --noEmit` clean.

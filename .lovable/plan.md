# Build C — Tier 2 Fulfillment Automations

Goal: build the three retainer automations (follow-up sequences, reactivation, review requests) on top of one shared spine — approval queue, pluggable send-adapter, per-project enrollment, idempotent runs, pg_cron scheduling. Reuse `crm-generate-outreach` for drafting and mirror `content-publish-automation` for the atomic claim/log pattern. **Nothing reaches a customer without operator approval.**

## Architectural spine (built once, all three reuse)

### 1. Per-project enrollment — `project_automation_enrollments`
Mirrors `venue_execution_adapters.growth_audit_enabled` but as rows (so Build D can bundle):
- `project_id` (venues.id), `automation_key` (`followup_sequence` | `reactivation` | `review_request`), `enabled`, `config jsonb` (channels, cadence, default tone, platform links, etc.), `created_by`, timestamps.
- Unique `(project_id, automation_key)`. RLS via `user_can_access_project`.

### 2. Approval queue — `automation_message_queue` (the daily QA surface)
Single table all three automations write to. One row = one drafted message awaiting QA.
- `project_id`, `automation_key`, `source_run_id` (FK to that automation's runs table), `recipient_contact_id` (nullable), `recipient_snapshot jsonb` (name/email/phone/handle frozen at draft time), `channel` (`email`|`sms`|`linkedin_dm`|`instagram_dm`), `subject`, `body`, `model`, `status` (`pending_review`|`approved`|`rejected`|`sent`|`failed`|`canceled`), `scheduled_for` (when it should actually go out after approval), `approved_by`, `approved_at`, `edited_body` (operator override), `reject_reason`, `send_attempted_at`, `send_result jsonb`, `dedupe_key` (unique partial index on `(project_id, dedupe_key)` where not null — prevents double-queueing).
- RLS: project-scoped. UI: one inbox filterable by project + automation_key.

### 3. Send-adapter interface — `_shared/send-adapters.ts`
```ts
type SendInput = { channel, to, subject?, body, project_id, queue_id, metadata }
type SendResult = { ok: boolean, provider: string, provider_message_id?: string, error?: string, raw?: unknown }
interface SendAdapter { name: string; supports(channel): boolean; send(input): Promise<SendResult>; }
```
Resolver picks adapter from `project_automation_enrollments.config.adapters[channel]` (default `"manual_log"`).
- **`manualLogAdapter`** (shipped now): writes intended send to `automation_send_log`, returns ok. Makes the full flow testable end-to-end with zero providers.
- Stubs noted in code comments for future drop-ins: Twilio (SMS), Resend/SendGrid (email), LinkedIn/IG (likely manual-assist only). No provider hardcoded.

### 4. Send executor — `automation-send-approved` edge function
Called from the approval UI (and from a pg_cron sweeper for `scheduled_for <= now()` approved rows). Atomic claim mirroring content-publish-automation:
```
UPDATE automation_message_queue
SET status='sending', send_attempted_at=now()
WHERE id=? AND status='approved'
RETURNING *
```
If row claimed → resolve adapter → `send()` → on success set `status='sent'`, write `automation_send_log` row; on failure set `status='failed'` with error. Idempotent: only one worker can claim. No retries on rejection.

### 5. Per-automation runs tables (mirror `content_automation_runs`)
- `followup_sequence_runs` (lead_id, project_id, enrollment_snapshot, status, stop_reason, queued_message_ids, started_at, ended_at)
- `reactivation_campaign_runs` (project_id, campaign_id, segment_snapshot, queued_count, status)
- `review_request_runs` (project_id, trigger_source, trigger_ref, queued_message_id, status)

Each uses atomic check-and-set on a `*_fired_at` / claim column to guarantee fire-once.

## The three automations

### A. Follow-up sequences
- **Trigger:** new `inbound_leads` row for an enrolled project → `enqueue-followup-sequence` edge function (called from `submit-inbound-lead` post-write, plus a backfill scheduler).
- Creates a `followup_sequence_runs` row (unique `(lead_id)` so re-fires no-op).
- Calls `crm-generate-outreach` per configured channel — reused as-is. (For inbound_leads without a `crm_lead_analyses` row, add a thin shim: synthesize a minimal analysis from qualifier_data, or call `crm-analyze-lead` first.)
- Each draft message (opener + each sequence_day) → inserted into `automation_message_queue` with `scheduled_for = lead.created_at + day_offset` and `dedupe_key = lead_id:channel:day`.
- **Cadence stop conditions** (checked by sweeper before sending): lead status in `replied|booked|opted_out`, or run status `halted`. New columns on `inbound_leads`: `automation_status`, `opted_out_at`.
- Operator UI: "Halt sequence" button → marks run halted, cancels all `pending_review`/`approved` queue rows.

### B. Reactivation
- **List storage:** new `project_customer_lists` + `project_customer_list_members` (per-project; reuse `crm_contacts` would conflate sales CRM with end-customer lists — keep them separate). Members carry email/phone/name/tags/last_visit/imported_at.
- Operator uploads CSV via existing CSV parse pattern → list rows inserted.
- "Start campaign" → `reactivation-generate` edge function: AI segments (e.g. 30/60/90-day lapsed), drafts a per-segment message via Lovable AI Gateway (same provider helper as crm-generate-outreach), creates `reactivation_campaign_runs` row, queues one `automation_message_queue` row per member (`dedupe_key = campaign_id:member_id`), staggered by cadence config.
- Approval UI shows segment summary + sample messages; operator can approve segment-wide or per-message.

### C. Review requests
- **Trigger sources (config per project):**
  1. Operator-marked: button on a job/visit record (operator-triggered).
  2. Event-driven: a new row in an existing visit/job table (Phase 1 wires the manual button; event-source noted as a per-project optional wiring once we know which table represents a "visit" for that vertical).
- `enqueue-review-request` → AI draft (gateway), 1 row in `automation_message_queue` with `scheduled_for = visit_time + config.delay_hours`, `dedupe_key = visit_ref`.
- **Review replies (bonus):** `draft-review-reply` reads new rows from `online_reviews` / `google_reviews`, drafts replies into a separate `review_reply_queue` (or reuses `automation_message_queue` with `channel='review_reply'`) for operator approve → manual post (no public reply API integration in this build).

## Scheduling (pg_cron + pg_net)
Three jobs, all using the existing `net_http_post` helper:
- `*/5 * * * *` → `automation-queue-sweeper` (sends approved rows whose `scheduled_for <= now()`).
- `0 * * * *` → `followup-cadence-tick` (advances follow-up runs whose next-day message is due to be DRAFTED; drafts ahead of approval window, not at send time).
- `0 13 * * *` → `automation-stop-condition-sweep` (cancels queue rows for halted/replied/opted-out leads).

## UI surface
- **Approval Inbox page** (`/automations/inbox`): unified queue, filters by project + automation_key + status; cards show recipient, channel, subject/body editable, Approve / Reject / Edit & Approve / Reschedule actions.
- **Per-project automations panel** (extends Build A wizard step + venue settings): toggles per `automation_key`, per-channel adapter dropdown (defaults to `manual_log`), cadence config.
- **Reactivation page**: upload list → segment preview → start campaign.
- **Lead detail / Visit detail**: "Start follow-up" / "Request review" buttons.

## Files

**Migrations** (one file):
- `project_automation_enrollments`, `automation_message_queue`, `automation_send_log`, `followup_sequence_runs`, `reactivation_campaign_runs`, `review_request_runs`, `project_customer_lists`, `project_customer_list_members`, `review_reply_queue` (or reuse queue), `inbound_leads.automation_status` + `opted_out_at`. All with GRANTs + RLS via `user_can_access_project`.
- pg_cron schedules for the three sweepers.

**Edge functions** (new):
- `_shared/send-adapters.ts` (interface + manualLog adapter + resolver)
- `automation-send-approved` (claim + send + log)
- `automation-queue-sweeper` (cron target)
- `enqueue-followup-sequence` (lead → drafts → queue rows)
- `followup-cadence-tick` (cron target)
- `automation-stop-condition-sweep` (cron target)
- `reactivation-generate` (segment + draft + queue)
- `enqueue-review-request` (visit → draft + queue)
- `draft-review-reply` (cron + manual; reads new reviews)

**Edge functions** (extended, minimal):
- `submit-inbound-lead`: post-insert call to `enqueue-followup-sequence` (fire-and-forget, only if project enrolled).
- `crm-generate-outreach`: unchanged. Used as-is.

**Frontend**:
- `src/pages/AutomationInbox.tsx` (queue UI)
- `src/pages/ReactivationCampaigns.tsx` (list upload + campaign start)
- `src/components/automations/AutomationEnrollmentPanel.tsx` (per-project toggles + adapter selection; embeddable in Build A wizard via new step)
- `src/hooks/useAutomationQueue.ts`, `useAutomationEnrollments.ts`, `useCustomerLists.ts`
- Buttons on lead detail & a visit/job surface to trigger flows.
- Add a new Build A wizard step `automations_enrollment` (registered in `venueOnboardingSteps.ts`) — non-blocking, completion detected by enrollment row count.

## Explicit non-goals (this build)
- No real SMS/email provider wired. `manual_log` adapter only; Twilio/Resend listed as drop-ins.
- No automatic posting of review replies — drafted for operator to copy/post.
- Build D (templated bundling of these to a client in one action) is NOT in this build, but the enrollment+config row model is shaped to make it a single insert-batch operation later.

## Verification
- Insert a test lead on an enrolled project → followup run row created → queue rows scheduled with correct `scheduled_for` → approve in inbox → `manual_log` adapter writes to `automation_send_log` → queue row status `sent`.
- Re-fire enqueue on same lead → no duplicate queue rows (dedupe_key).
- Approve same queue row twice rapidly → only one send (atomic claim).
- Halt run → pending queue rows cancel.
- Upload reactivation CSV → campaign drafts → approve → logged sends.
- Mark visit → review request drafts → approve → logged send.
- `tsc --noEmit` clean. Build A wizard still works; Build B intake bridge unchanged; existing `content-publish-automation` and `crm-generate-outreach` untouched in behavior.

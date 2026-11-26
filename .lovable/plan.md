# Agent Desk plan

## What we found in the real mailbox (72 rows, read today)
- 3 agents plus "owner" as a recipient. Kinds: task, standing job, question, reply, report. Statuses: new, claimed, done, failed, needs owner, cancelled, active.
- 4 items wait on the owner, the oldest 7 days (Jenna Banks Facebook access question from Muse; Muse's Jenna stats task; Matrix test clips; WO-014).
- 12 ChatGPT social posts are failed, all "Blocked at the Google Drive image upload"; their Drive folders hold copy but no images.
- 12 open items are past due; 2 "new" items are over 3 days old; nothing is currently "claimed".
- 47 rows have proof links (Drive folders, Facebook/Instagram posts); 6 finished items have no proof link.
- Brand link: 60 rows set the brand (venue_id), 12 do not; some also put brands in `spec.brands` (sometimes text, sometimes a list) or `spec.hq_project_id`.
- 14 rows link to a to-do (closing the row also closes the to-do, by trigger); 2 link to a Content Studio item. No row uses `parent_id` yet.

## Risks in the current setup
1. **Only admins can read; nobody can change rows from the app.** There is no update policy, so today the owner cannot answer or close anything in HQ, and brand helpers cannot see their brand's work at all.
2. **Failed batch has one shared cause** (Drive image upload). It looks like 12 problems but is one. The Desk should group same-reason failures.
3. **"Needs owner" has no clear question field.** Asks are spread across `notes`, `spec.owner_part`, `spec.detail`, or the title. Answers have nowhere defined to go.
4. **Brand tagging is inconsistent** (12 untagged, three different places). Brand pages would miss work.
5. **Due dates and "done" without proof** are not enforced. Fine for agents, but the screen must show it.
6. Rows created directly in the database skip any app logic, so every rule must live in the database or be read-only display logic that tolerates odd rows.

## What the owner sees (phone-first)
One new page, **Agent Desk**, in the side menu (admin can grant it per role/person like other items).
- **Top strip: "Needs you"** — every item waiting on the owner, oldest first, with how long it has waited and the question in plain words. Big Answer button.
- **Three agent cards: Claude, Muse, ChatGPT** — "Working on", "Waiting to start", "Stuck", "Finished this week" counts. Tap to filter.
- **Stuck and late** — failed, past due, or unstarted for over 2 days, with "for 3 days" style ages. Same-reason failures shown as one group ("12 social posts: blocked at the Google Drive image upload").
- **Repeating jobs** — each standing job, its schedule in words, when it last ran, and a "Missed" flag when the last run is older than its schedule allows.
- **Recently finished** — with a proof button per link (opens Drive/post). "No proof link" shown plainly when missing.
- Filters: agent, brand, status words. Search by title.
- **Task sheet** (tap any row): what was asked (readable view of the instructions, not raw data), who sent it, to whom, due, history (created, last run, finished), result summary, proof links, linked to-do or Content Studio item.

### Owner actions (in the task sheet)
- **Answer** (for items waiting on him) — writes his answer, sends it back to the agent as ready to start.
- **Send back with a note** — returns to the same agent as new, note kept.
- **Hand to another agent** — pick Claude, Muse or ChatGPT.
- **Cancel** — with optional reason.
- **Mark done with proof** — paste a Drive link (required) and short summary. This also closes any linked to-do, as today.
- **Retry group** for a same-reason failed batch.

Muse and ChatGPT, signed in as the owner, use the same sheet with a filter "Show my tasks" (agent picker remembered in the browser) and the same Mark done with proof button.

### Brand page
Brand Today tab > **Latest work** gains agent mailbox rows (finished items with proof) alongside crew runs. A small **"Agents on this brand"** card shows open, stuck and waiting-on-owner counts, linking to the Desk filtered to that brand. Brand helpers see their brand's rows read-only; they cannot act.

## Reuse, extend, merge (no second board)
- **Dashboard "Waiting on me"**: extend; mailbox items waiting on the owner appear there, linking to the task sheet. No separate owner inbox.
- **Brand Latest work / brand pulse**: extend the existing batched feed with finished mailbox rows; Portfolio "last work" picks them up automatically.
- **Admin Panel > Crews**: keep as is (it answers "did the scheduled run happen"). Add a link from Crews to the Desk; standing jobs live on the Desk only.
- **Content Studio requests**: keep showing per-item requests there; the Desk shows them too (same rows) with a link to the Studio item. Studio-claimed rows are read-only on the Desk so the Studio's lease is never broken.
- **TaskExplainer / Ask**: reuse the "Ask about this" panel in the task sheet.

## Database changes (need your approval; additive only)
1. **Owner action functions** (secure, admin-checked): answer, send back, reassign, cancel, mark done with proof. Each one writes a reply row into the same mailbox (kind "reply", linked by `parent_id`) so agents read answers the same way they read work, and updates the original. No direct table edit rights for the app.
2. **Two optional columns**: `owner_question text` (what the agent needs from the owner) and `brand_ids uuid[]` (all brands a row covers). A database trigger fills `brand_ids` from `venue_id`, `spec.brands`/`spec.brand_ids` when agents leave it blank, tolerating text or lists, so outside writes stay tidy without agents changing anything. One-time backfill for existing rows.
3. **Brand helper read policy**: brand-assigned people can read rows tagged with their brand. Existing admin read policy unchanged.
4. A short note for the agents' instructions: put the ask in `owner_question`, and always add a proof link when done. (Text for you to give them; not code.)

## Left out of version 1
- Notifications (email/text) when something waits on the owner.
- Agents creating work orders from the screen; editing instructions.
- Charts/history beyond "this week".
- Automatic retry or fixing the Drive upload problem itself (flagged above; it is an agent-side fix).

## HQ Guide
New page "Agent Desk"; updates to Today/Waiting on me, Overview Latest work, Nightly crews, Content Studio and glossary (plain words for each status).

## Rough credit estimate
- Database (functions, columns, trigger, policy, backfill): ~4-6
- Desk page, task sheet, actions: ~8-12
- Brand page, Waiting on me, Latest work extensions: ~3-5
- Guide, tests (status words, stuck/missed rules, brand tagging), phone checks: ~3-4
- Total roughly 18-27 credits.

## Technical notes
- Shared rules in `src/lib/agentDesk.ts` (status words, stuck/late/missed, group-by-failure-reason, readable spec, brand resolution) with tests; one hook `useAgentDesk`.
- Standing job "missed" uses the schedule text heuristically (daily/weekly/monthly); unrecognized schedules show last run only.
- Times shown in Pacific.

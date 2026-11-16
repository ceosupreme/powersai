# Sales system in HQ: calling, texting, email sequences, booking, alerts

Plan only. Nothing is built until you approve a phase.

## A. What exists and what I would reuse (checked in code)

Confirmed:
- Leads page `/prospects` (`ProspectDock.tsx`, `src/components/prospects/*`, rules in `src/lib/leads.ts`), `prospects.outreach_mode`, `prospect_activity`, the nine statuses.
- Send adapters: `supabase/functions/_shared/send-adapters.ts` defines one `SendAdapter` interface with `manual_log` and Resend email. SMS/DM are declared in the channel type but have no adapter. This is the right seam for Twilio and Gmail.
- Queue engine functions: `automation-queue-sweeper`, `automation-send-approved`, `automation-stop-condition-sweep`, `enqueue-followup-sequence`, `followup-cadence-tick`, `send-adapter-status`, plus shared `automation-state.ts`, `worker-lease.ts`, `webhook-signature.ts`, `inbound-forwarding.ts`.
- Inbound mail: `resend-inbound-webhook` writes `inbound_emails`.
- `BookingCta.tsx` reads `site_settings.booking_url`.
- Owner alerts: `notify-owner-inquiry`, `alert-emergency-lead`.

Corrections to your list:
- The engine is keyed to `inbound_leads`: `followup_sequence_runs` is unique on `lead_id`, and the stop sweep looks up runs by `lead_id`. Prospects are not in it. Your read is right.
- There is already a `transcribe-audio` function and an `openai-realtime-*` voice pair; voicemail transcripts can reuse the first, and the second is unrelated to calling.
- Not verified yet (I will check before Phase 1, read-only): the exact queue columns that tie a message to a recipient, and whether `email_suppressions` (it exists, project-scoped) can serve as the opt-out list. If it fits, no new suppression table is needed for email.

## B. Recommended architecture, and where I differ

```text
Lead (prospects)  <-- one "contact point" per phone/email
   |                         |
Sequence run (generic)    Conversations (calls, texts, emails) -> prospect_activity
   |                         |
Queue -> Send adapters (Gmail, Twilio SMS, manual)   Webhooks in (Twilio, Gmail push, booking)
                     |
            Stop rules + stage rules (one shared module)
```

Where I would do it differently:
1. **Bridge prospects and inbound_leads by making the engine target-neutral, not by copying leads.** Add `subject_type` ('prospect' | 'inbound_lead') + `subject_id` to sequence runs and the queue, keep `lead_id` for old rows. Then one inbound form submission auto-creates or links a prospect (via the existing `hq_promote_inbound_lead` style), so the Leads page becomes the single list. Reason: two parallel lead lists is the biggest long-term confusion risk.
2. **One stage-rules module** (database function, called by every webhook) decides moves: reply -> Replied, booking -> Meeting booked, never moves a lead backward, never touches Won/Dead. Reason: today each feature would otherwise move stages its own way.
3. **Do-not-contact checked at send time inside the adapter layer**, not only at enroll. Reason: a lead can opt out between queue and send.
4. **Email: human mail on the root domain in Google Workspace; system mail on a subdomain** (for example `mail.supremeteammedia.com` for Resend sending and login mail, and `in.supremeteammedia.com` if any automated receiving is still wanted). I agree Resend stays only for system/login mail. Reply detection uses Gmail push (Google Pub/Sub watch) with a 10-minute history poll as backup. Reason: push alone can silently stop.
5. **Booking: build our own** page, but keep it simple at first (one meeting type, weekly hours, buffer, minimum notice). Busy times read from Google Calendar free/busy; event created with a Meet link. Reason: owning it lets booking write straight to the lead; the risk is time-zone bugs, so it gets thorough tests.
6. **Calling: bridged call as you outlined** (Twilio rings his cell, then the lead, shows the business number). I agree. I would add a "call from my own cell" fallback button (plain tel: link) that still logs the call, for when Twilio is down.
7. **Alerts: add a phone home-screen web push** later as a third option; email until texting is approved. In-app: a red count on the Leads menu item and an "Needs reply" filter.
8. **Connection method:** use Lovable's Google connectors (Gmail, Google Calendar) and Twilio connector where they fit, instead of a hand-made OAuth app. Caveat: those connectors act as the builder's one account, which matches the owner today. For per-client installs later, Twilio subaccounts per client still work; Gmail per salesperson would need the per-user Google connection. Decision point for you.

## C. Phases (recommended order)

Credit estimates are rough.

**Phase 0 — Foundations (no outside accounts).** ~15–25 credits
- Owner sees: Do-not-contact switch on each lead; "Opted out" badge; inbound form leads appear on Leads automatically; top-5 leads card on Today; real assignee names.
- Database: `prospects.do_not_contact`, `opted_out_at`, `opt_out_channel`; generic subject columns on runs/queue; `contact_points` (lead, kind, value normalized E.164/lowercase, opted_out); stage-rules function; a safe "team names" view so non-admins see names.
- Functions: adapter gate for do-not-contact; enqueue accepts prospects.
- Test without credentials: fully, using `manual_log`.

**Phase 1 — Calling (Twilio voice).** ~25–35 credits
- Owner sees: Call button on a lead rings his cell then connects; calls log automatically with length; inbound calls to the business number forward to his cell; missed calls leave voicemail with transcript on the lead; phone settings page with honest "Texting: waiting on carrier approval".
- Database: `calls` (direction, from/to, status, duration, recording, transcript, prospect_id), `phone_settings` (business number, owner cell, voicemail greeting, texting status).
- Functions: `twilio-call-start`, `twilio-voice-webhook` (TwiML), `twilio-status-webhook`, voicemail transcription via existing `transcribe-audio`. Signature check on every webhook.
- Needs from owner: Twilio connection, one business number, his cell, start A2P 10DLC registration now (in parallel).
- Outside steps: point the number's voice webhook at our function.
- Test without credentials: TwiML output and call matching logic; real call needs the number.

**Phase 2 — Gmail sending, reply detection, mail cutover.** ~30–40 credits
- Owner sees: Email button and sequences send from his real mailbox and thread normally; replies show on the lead and Inbox, sequence stops, stage moves to Replied; owner gets an email alert.
- Database: `email_threads`/messages linked to prospect (or extend `inbound_emails` with `source` and `prospect_id`), gmail sync cursor.
- Functions: Gmail send adapter, `gmail-push-webhook`, `gmail-history-poll`, unsubscribe link + one-click List-Unsubscribe page.
- Needs: Workspace mailbox, Gmail connection, Pub/Sub topic (if via own Google Cloud).
- DNS cutover order: 1) add subdomain for Resend sending and verify, move system/login senders; 2) lower MX TTL; 3) switch root MX to Google, update SPF to include both, DKIM for Google, DMARC at p=none; 4) keep Resend receiving on the subdomain for 2 weeks and forward anything stray; 5) Inbox Email tab reads both sources.
- Test without credentials: message building, threading headers, reply matching, unsubscribe.

**Phase 3 — Sequences on leads.** ~20–30 credits
- Owner sees: Auto switch enrolls the lead in a chosen sequence; each first message waits in the approval inbox; a sequence can be marked "proven" to send without approval; stops on reply, booking, opt-out, Won/Dead; a sequence editor (steps, wait days, channel, template with merge fields).
- Database: sequence definitions (reuse `automation_bundles` if its shape fits, verified first), per-sequence `approval_mode`, send windows (business hours in lead's time zone).
- Test without credentials: entirely with `manual_log`.

**Phase 4 — Booking page.** ~30–40 credits
- Owner sees: public booking page, availability settings, conflict-free slots from his calendar, confirmation + reminder emails (texts later), reschedule/cancel links, lead created/updated and moved to Meeting booked; `booking_url` filled so the site's button uses it.
- Database: `availability_rules`, `bookings` (token for reschedule/cancel).
- Functions: `booking-slots`, `booking-create`, `booking-manage`, reminder sweep.
- Needs: Google Calendar connection.
- Test without credentials: slot math and time zones with tests; calendar calls need connection.

**Phase 5 — Texting (after A2P approval).** ~20–30 credits
- Owner sees: text thread on each lead and in Inbox; inbound texts matched by phone or create a lead; missed-call text-back; STOP/START/HELP handled; text alerts to his cell; texts as sequence steps.
- Database: `text_messages`; uses `contact_points.opted_out`.
- Functions: Twilio SMS adapter, `twilio-sms-webhook`.
- Switch stays off in `phone_settings` until approval is recorded.

**Phase 6 — Polish and salespeople.** ~15–20 credits
- Per-salesperson assignment rules, round-robin, "my day" call list, reporting (contacts per day, reply rate, bookings, won).

## D. What you can safely do outside this chat
- Safe for you: loading sequence templates and copy once tables exist; seeding availability hours; backfilling `contact_points` from existing prospects with a query I give you; marking known opt-outs.
- Must be built here together: every schema change, the stage-rules function, adapters and webhooks, and screens, so the types, rules and guide stay in one consistent shape.

## E. Risks and unknowns
- A2P 10DLC can be rejected; texting date is outside our control.
- Gmail sending limits (about 2,000/day Workspace) and deliverability of cold email from his main mailbox; I recommend low daily caps and warm-up.
- Cold-calling/texting law (TCPA, consent for texts to people who never gave their number); texts to scraped leads may need consent first. I would only allow auto-texts to leads with recorded consent or who texted first.
- Call recording consent in California: two-party; recording off by default, or an announcement.
- Connector fits for Gmail push and Calendar must be confirmed before Phase 2/4.
- Leads page fixes along the way: real assignee names (Phase 0), top-5 card on Today (Phase 0), "Add note" not counting as contact (keep, confirm), drag and export untested (test in Phase 0).

## F. What a GoHighLevel user would also expect
- One unified conversation view per lead across call, text, email.
- Templates and snippets, merge fields.
- Tasks/reminders from follow-up dates with a daily list.
- Lead source tracking and simple reporting.
- Forms/funnels feeding leads (already have inbound forms).
- Review requests after Won (engine exists).
- Pipeline value per deal, and won/lost reasons.
- Mobile notifications.

## Decisions I need from you
1. Merge inbound form leads into the Leads list (recommended) or keep them separate?
2. Use Lovable's Google and Twilio connections, or your own Internal Google app?
3. Allow auto-texts only to leads with consent (recommended)?
4. Approve starting with Phase 0 + 1.

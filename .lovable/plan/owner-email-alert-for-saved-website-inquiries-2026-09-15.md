# Owner email alert for saved website inquiries

When someone submits the contact form on the public site (including hiring
inquiries), you get one email at ceosupreme@gmail.com after the inquiry is
safely saved. Nothing is sent to the visitor.

## What the email contains

- Name, email, company (if given)
- The project note, exactly as typed (safely escaped, never rendered as code)
- Service selections, hiring/agency context, budget, timing
- Record ID and submission time
- A link to your protected inbox where the lead lives

## Behavior rules

- Only general website inquiries: no client project attached, routed to you.
  Client-captured leads and emergency service alerts keep their current paths,
  untouched.
- One email per saved inquiry. A second attempt for the same record is a no-op.
- If the email fails, the visitor still sees success — the save already
  happened. The failure is recorded on the record itself, not hidden.
- The email is sent from your existing verified sender
  (reports@supremeteammedia.com) through the email provider already configured
  server-side. Credentials stay on the server; nothing new is purchased.

## Technical notes

- Migration: add `owner_notified_at`, `owner_notify_error`,
  `owner_notify_attempted_at` to `public.inbound_leads`. No grant/RLS changes
  (existing policies already cover the table; the notifier uses the service
  role).
- New edge function `notify-owner-inquiry` (`verify_jwt = false`, invoked
  server-to-server with the service-role key only, validates `lead_id` with
  zod):
  1. Load the lead; skip when `captured_for_project_id` is set or
     `route_to` is not `self`.
  2. Claim it atomically: `update inbound_leads set owner_notify_attempted_at =
     now() where id = $1 and owner_notified_at is null returning id`. No row
     returned → already notified, exit.
  3. Send via the existing `resendEmailAdapter` from
     `_shared/send-adapters.ts` with `metadata.internal = true` (skips the
     customer suppression check and venue footer) to
     ceosupreme@gmail.com, subject `New website inquiry — <name>`.
  4. On success set `owner_notified_at`; on failure clear it and store the
     provider error in `owner_notify_error`.
- All user-supplied values HTML-escaped before templating; plain-text body too.
- `submit-inbound-lead/index.ts`: add one fire-and-forget dispatch to the new
  function after a confirmed insert, mirroring the existing emergency-alert
  block. Response shape, validation, honeypot, rate limit and emergency /
  follow-up dispatch stay exactly as they are.
- Inbox link target: the protected leads view at `/crm` on the published app.

## Verification

- Save a checkpoint before any change.
- Rerun the TypeScript check and production build.
- Deploy the two functions, then run ONE clearly labelled owner-authorized
  submission through the real form in the signed-out preview, and report: saved
  record ID, the notification row state, and the provider result. You confirm
  receipt in Gmail.
- No design changes, no analytics, no publishing, no other automations enabled.

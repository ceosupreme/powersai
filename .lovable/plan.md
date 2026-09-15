# Live intake test, résumé download, and final checks

## 1. One controlled test through the real contact form

Pre-flight confirmation (read-only) before submitting:
- Confirm the form sends general-site routing only: `route_to: "self"`, `conversation_channel: "form"`, no `project_type`, no `captured_for_project_id`.
- Confirm the follow-up automation skips leads without a client project, so no customer or client recipient is contacted. No automation is enabled or edited.

Then drive the signed-out preview with a browser session:
- Open `/?intent=hiring#contact` and confirm the hiring context is preselected and the contact area is in view.
- Fill in exactly:
  - Name: `Sean Mayo — WEBSITE QA TEST`
  - Email: `ceosupreme@gmail.com`
  - Company: `Supreme Team Media — QA`
  - Message: `Owner-authorized website test. Not a customer inquiry.`
  - Service: clearly labelled test selection, plus budget and timing test values.
- Submit once and capture the actual response (success flag and record ID). No retry unless the record is confirmed absent.

Verification:
1. Real success response with a record ID.
2. Exactly one matching record in the existing owner-facing Inbound Leads view (query by name/email, confirm single row).
3. Message, hiring context, service, budget and timing all preserved on the stored record.
4. Owner notification status checked separately and reported as it actually is. If nothing is configured, that is reported plainly — no new notification system is built.

## 2. Résumé download on /hire

- Place the approved PDF as a real file in `public/` (kept byte-identical, not rewritten).
- Point the existing résumé config at that file with the correct display label and download filename, which switches `/hire` from the email-request fallback to a working Download résumé button.
- Fetch the file URL and confirm the response is a real PDF (PDF content type and `%PDF` header), not the app's HTML fallback.

## 3. Final checks (reusing prior verification)

- Production build and TypeScript check.
- Responsive layouts at 375 / 390 / 768 / 1440 with no horizontal overflow.
- Keyboard focus order and the mobile menu on home, work, case and hire pages.
- Work filters: deep links, hidden empty categories, browser back/forward, and back-navigation from a case restoring the filtered list.
- Hiring handoff from `/hire` into the contact form.
- Regression pass on existing routes: `/free-audit`, a vertical page, a qualifier page, and that signed-in visitors still land in the internal app.

## Out of scope

No new features, no analytics destination, no database/server/auth/automation changes, no publishing.

## Deliverable

Short report: test record ID, inbox visibility, notification status, résumé URL, build and type-check results, and any remaining blocker.

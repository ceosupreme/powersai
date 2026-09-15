# Final frontend QA pass — STM redesign (Prompt 4)

No new features, no backend changes, no publishing. Only fixes inside the public studio frontend.

## Reused evidence (not repeated)

- Live inquiry test already passed: record `b940ca04-a3d1-407d-aafd-350b0b1b558a`. No second submission.
- Prior verified items re-confirmed only if the code changed since: work filters and URL state, back/forward restore, case back-navigation, unknown-slug not-found, résumé file serving as a real PDF.

## 1. Commands

- Type check, the project's test command, and a production build.
- Each failure classified as pre-existing or a new regression from the redesign; only regressions inside the public studio pages get fixed here.

## 2. Browser accessibility and layout sweep

Widths 375 / 390 / 768 / 1440 plus 200% zoom, on home, /work, a filtered /work URL, all four case pages, /hire.

Checks: no sideways overflow, anchor offsets land correctly under the fixed header, one sensible heading order per page, visible focus on every interactive element, tab order, mobile menu opens/closes with Escape and returns focus, readable contrast, reduced-motion respected, and nothing left permanently hidden by reveal animations.

## 3. Every public action

Logo, all header/footer links, capability links, process/about anchors, contact, category URLs and browser back, four case pages, /hire, free checkup, client login, and the résumé download or the request fallback. Any button whose destination is not real and approved gets removed rather than left dead.

## 4. Media slots

Confirm each image-null slot renders the finished editorial plate — no broken image, no empty portrait frame. Final slot list and status reported.

## 5. Contact form states (mocked only)

Invalid fields, mocked saved response, server failure, network failure, over-limit message, rapid duplicate clicks, and typed content preserved while choosing services. Mocked success is reported as a contract check, never as production verification.

## 6. Regression smoke checks

`/free-audit`, `/qualify/:slug`, `/for/:slug`, `/q/:venueSlug`, `/r/:token`, auth and password reset, and protected app access. No paid external calls, no client data changes, no anonymous opening of protected data. Confirm `/portfolio` stays internal and that a signed-in visitor at `/` still lands in the internal app.

## 7. Public copy check

No invented clients, testimonials or logos; no present-tense eight-venue live/daily claim; no 48-hour guarantee; no borrowed $495 price; no universal API/SMS/booking compatibility claim; no confidential financial or employee details; owned brands and sample-data demos labelled. Sean Mayo, 2002 and the advertising degree preserved exactly.

## Tracked separately, not done in this pass

- Missing email notification for general site inquiries — proposed enhancement only.
- Pre-existing `/for/hvac` mobile sideways overflow — recorded as pre-existing, not a redesign regression.

## Deliverable

Short release report: changed files, actual command results, pass/fail/blocked per check, fixes made, final media slots and their statuses, and a rollback checkpoint reference. Deployment stays a separate owner-approved step.

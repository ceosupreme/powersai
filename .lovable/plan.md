# Gauntlet Fix 1 — Final Plan (approved with one change)

## PART A — Homepage triage widget

### A.1 Diagnosis (why option B fails)

`HeroTriage.tsx` maps B → `#ops-dashboard`, but no element with that id is rendered on `/`. `OpsDashboardShowcase` (which owns that id) is defined but never imported by `MarketingSite.tsx`. `querySelector` returns `null`, the `if (el)` guard silently skips the scroll. A (`#lead-followup`) and C (`#automations`) work because their sections are mounted.

### A.2 Fix (retarget, do NOT mount orphan)

The homepage already has the intended "whole operation in one view" section: `ConnectiveLayer.tsx` (headline *"One clear picture of your whole operation"*), rendered in `MarketingSite.tsx`. It currently lacks an `id`.

1. **Add `id="whole-operation"`** to the `<section>` in `src/components/marketing/sections/ConnectiveLayer.tsx` (line 21).
2. **Retarget triage B** in `HeroTriage.tsx` from `#ops-dashboard` → `#whole-operation`.
3. `OpsDashboardShowcase` stays unmounted (no duplicate storefront content). Deleting the orphan file is a later cleanup, not this fix.
4. **Arrival highlight.** After `scrollIntoView`, set a `data-arrival-highlight` attribute on the target `<section>` for ~2s; scoped CSS in `src/index.css` under `.stm-marketing` draws a fading gold ring (box-shadow using `--gold`, opacity transition). Same treatment for A/B/C.
5. **OK → contact prefill.** When a triage option is picked, `OK` scrolls to `#contact` **and** dispatches `window.dispatchEvent(new CustomEvent("stm:contact-prefill", { detail }))` plus writes `sessionStorage.setItem("stm.contact.prefill", text)` as a fallback for mount-order races. Copy:
   - A → *"I want to recover missed leads."*
   - B → *"I want one live view of my whole business."*
   - C → *"I want to automate manual work."*
6. **Contact reads prefill.** Convert the `<textarea name="message">` in `Contact.tsx` to controlled state; on mount read `sessionStorage.getItem("stm.contact.prefill")` and add a listener for `stm:contact-prefill` (writes into state, then `sessionStorage.removeItem`). "None of these" scrolls to `#contact` without prefill.
7. **Mobile parity.** No viewport-conditional code; verify at 390×844 with Playwright.

## PART B — /free-audit CTA & pipeline failure

### B.1a — CTA wiring (smoke test, do not blindly repoint)

Repo already has `href="/free-audit"` on Hero + FinalCTA and `<Route path="/free-audit" element={<FreeAudit />} />` in `App.tsx`. No global anchor interceptor. Reported desktop "scrolls to contact" is not reproducible from source (likely stale bundle). Plan verifies with Playwright click at 1280×800 asserting `page.url()` ends with `/free-audit`; escalate if it fails, do not silently repoint.

### B.1b — Pipeline failure (DB evidence)

Recent `public_audit_requests`, both `status='failed'`:

```
Harbortownpub    [02:47:53] GBP resolve failed: caller does not have permission
                 [02:47:59] Map-pack ranking check degraded.
                 [02:48:03] Pipeline failed: compute-leak-stack failed: HTTP 401
Supreme Tea Media (same shape, same fatal line)
```

GBP + map-pack already degrade gracefully (logged, pipeline continues). The **only hard fail is `compute-leak-stack: HTTP 401`**.

### B.1c — Root cause

- `run-public-audit/index.ts:114` invokes the child with `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
- `compute-leak-stack/index.ts:86–92` requires a **user JWT**: builds a `userClient` with anon key + forwarded header and calls `auth.getUser()`. A service-role JWT is not a user token → `getUser()` returns null → the function returns `401` before touching the venue-access RPC.

Design mismatch: `compute-leak-stack` was written for signed-in operators; `run-public-audit` calls it server-to-server for an anonymous shell venue. No missing secret, no third-party API involved.

### B.2 Fix

1. **Service-role equality bypass in `compute-leak-stack`.**
   Auth block becomes:
   - if `Authorization` header is exactly `Bearer <SUPABASE_SERVICE_ROLE_KEY>` (constant-time-ish equality on the token substring), skip `auth.getUser()` and skip the `user_can_access_project` gate (trusted server caller — only edge functions with the service role can present this header; end users cannot obtain it);
   - otherwise fall through unchanged to the existing user-JWT path.
   - Never log the token or any prefix of it.
2. **Degrade-gracefully spec preserved.** `run-public-audit`'s existing try/catch pattern around GBP, review, map-pack (each logged as "…degraded" or "…failed:" into `status_detail`, pipeline continues) is unchanged. `compute-leak-stack` remains the single legitimate hard-fail gate.
3. **Failure UX on `/free-audit`.** Replace the terminal "Something went sideways…" line with:
   - human-readable headline built from the last non-degrade line of `status_detail` (fallback: generic message),
   - a **Try again** button that calls a new `usePublicAudit.reset()` (nulls token/status/statusDetail/redacted/full/error, clears polling timer) and re-focuses the intake form,
   - fallback link to `/#contact` if retry itself fails.
   - Same layout on mobile (already single-column).
4. **CTA smoke test only.** Playwright at 1280×800 and 390×844: click hero CTA + FinalCTA, assert navigation to `/free-audit`. No repoint unless assertion fails.

## Guardrails

- No schema changes, no new migration.
- No new anon grants (bypass is server-side equality check against `SUPABASE_SERVICE_ROLE_KEY`).
- Theater flow, redaction, unlock behavior unchanged.
- No new secrets requested — every failure traced to code.
- No token logging.
- OpsDashboardShowcase not mounted (no duplicate storefront content).

## Files to touch

- `src/components/marketing/sections/ConnectiveLayer.tsx` — add `id="whole-operation"`.
- `src/components/marketing/sections/HeroTriage.tsx` — B target `#whole-operation`; arrival-highlight; OK dispatches prefill event + sessionStorage.
- `src/components/marketing/sections/Contact.tsx` — controlled `message` state; mount-time prefill read + event listener.
- `src/index.css` — scoped `.stm-marketing [data-arrival-highlight]` keyframe (gold ring fade ~2s).
- `src/pages/FreeAudit.tsx` — failed-state UI with Try Again + human-readable message.
- `src/hooks/usePublicAudit.ts` — export `reset()`.
- `supabase/functions/compute-leak-stack/index.ts` — service-role equality bypass in auth block.

## Verification

- `tsgo` clean.
- Playwright 1280×800 + 390×844: hero + final CTA → `/free-audit`; triage A/B/C each scroll to the correct existing section with the gold arrival ring; OK prefills contact textarea; None-of-these leaves it blank.
- Fresh `run-public-audit` run on a test business: new row reaches `status='complete'`, no `HTTP 401` in `status_detail`.
- Force a failure path in dev; confirm `/free-audit` shows Try Again (no dead spinner).

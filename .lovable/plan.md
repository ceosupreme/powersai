
# GAUNTLET FIX 2 — checkup substance + public rendering + email gate

## PART A — DOLLARIZATION DIAGNOSIS

### A1. Seeded vectors for `home_services` (project_type_leak_vectors)

| # | Name | Formula | Variables | Resolver layer today |
|---|---|---|---|---|
| 1 | Missed calls | `missed_calls * booking_rate * avg_ticket` | `missed_calls`, `booking_rate`, `avg_ticket` | **unresolved**, **unresolved**, vertical_default (500) |
| 2 | Unsold estimates | `open_estimates * close_rate * avg_ticket` | `open_estimates`, `close_rate`, `avg_ticket` | **unresolved**, vertical_default (0.55), vertical_default (500) |
| 3 | Lapsing memberships | `lapsing_members * monthly_value * 12` | `lapsing_members`, `monthly_value` | **unresolved**, **unresolved** |

**Current `project_types.home_services.display_defaults`:** `avg_ticket=500, close_rate=0.55, avg_job_low=300, avg_job_high=800, emergency_job_low=3000, emergency_job_high=8000` plus non-formula copy fields.

**Root cause of "$0 but 3 gaps":** every vector has ≥1 variable with no resolver AND no default → `resolveVar` returns `null` → engine records `unresolved:*`, sets `monthly_dollars = null`, contributes 0 to `total_monthly_dollars`. Result summary reports `leak_count=3` and `$0`.

### A2. "Lapsing memberships" verdict — **wrong seed**
- Only one project_type is seeded (`home_services`); no cross-vertical contamination and no type mis-resolution on the shell (shell is created as `home_services` before vectors are read).
- Memberships aren't a home-services baseline vector. **Action:** delete this seed row from `project_type_leak_vectors` for `home_services`. Do NOT invent membership defaults to keep it alive.

### A3. New `display_defaults` (conservative, benchmark-sourced) — for approval

Add these to `home_services.display_defaults` so every remaining formula variable resolves at `vertical_default` or better on a cold run:

| Variable | Proposed default | Basis (conservative) |
|---|---|---|
| `missed_calls` | `18` /mo | Servicetitan/CallRail benchmarks — small home-services businesses miss ~15–30% of ~120 monthly calls; picking bottom quartile. |
| `booking_rate` | `0.35` | Industry norm for missed-then-recovered calls is 30–50% — bottom of range. |
| `open_estimates` | `12` /mo | Bottom-quartile pipeline for a 2–5 crew (roughly one estimate/business day, minus wins). |
| `avg_ticket` | keep `500` | Already set; conservative mid for HVAC/plumbing/electrical average job. |
| `close_rate` | keep `0.55` | Already set. |

After A2 removes "Lapsing memberships", `lapsing_members` and `monthly_value` are no longer referenced → nothing to default.

**New invariant (enforced by convention, not schema):** a vector may not be seeded unless every one of its formula variables resolves at `vertical_default` or better. Documented in a code comment above the seed migration.

### A4. Cold-run rule (engine change in `compute-leak-stack`)

Today: any unresolved var → whole vector returns `monthly_dollars = null` and `reason: unresolved:*` in the results array.

Change:
- Vector still records `unresolved: true` internally (so `/leak-stack` operator view is unchanged).
- Public rendering (Part B) never shows the raw `unresolved:*` string.
- Unresolved-dollar vectors are **excluded** from `total_monthly_dollars` / `total_risk_exposure_dollars` (already true) and get a stable `render_state: 'priced_with_your_numbers'` flag added to each result so the client can pick copy without pattern-matching on the `reason` string. Vectors that compute normally get `render_state: 'estimated'`.

No schema change required — `render_state` lives inside the existing `results` JSON.

## PART B — PUBLIC RENDERING (owner language)

Split rules: `/free-audit` (public) uses new owner-language rendering. `/leak-stack` (operator) is untouched.

1. **Headline result copy** in `FreeAudit.tsx`:
   - `total_monthly_dollars > 0` → keep current dollars headline + caveat footnote.
   - `total_monthly_dollars == 0 && leak_count > 0` → render exactly: `"{n} gap{s} found — a 2-minute call with your numbers puts dollars on them"` plus the primary booking CTA (`/#contact`). Never render `$0`.
   - `leak_count == 0` → "No gaps detected." (This is the only path that may print `$0` — as literal zero gaps, not a dollar amount.)

2. **Strip internal taxonomy** from `/free-audit` full-result cards:
   - Remove: HEADLINE / SUPPORTING chip, CAPTURED REVENUE / avoided-loss chip, raw `benchmark` string, `<details>Inputs & sources</details>` block, any `unresolved:*` text.
   - Per card render: `leak.name`, one **plain-English "why this costs you"** sentence rewritten from the vector's benchmark (mapping table below), the dollar estimate OR the "Found — priced with your numbers" state (from `render_state`), and a single small **source line** shown only in unlocked view.

   Benchmark → owner sentence map (client-side, keyed by vector name):
   - *Missed calls* → "Calls that ring out during business hours become someone else's booking within minutes."
   - *Unsold estimates* → "Estimates you gave that never turned into a job — most of these can still be closed with one follow-up."
   - *Lapsing memberships* → (removed in A2)

   Source-line rules (from `inputs_basis` — pick strongest source across the vector's inputs):
   - any `signal` from `google_reviews`/`review_snapshots` → "from your public reviews"
   - any `signal` from `gbp_snapshots` → "from your Google listing"
   - all `vertical_default`/`fallback` → "estimated from industry baseline"
   - any `override` or `signal` from `inbound_leads` → "from a live read of your business"

3. **Locked-row tease = real remaining count.**
   - Replace `Math.max(2, leak_count - 3)` with `Math.max(0, leak_count - top_leaks.length)`.
   - When zero, render nothing (no card).
   - Delete the `"Additional gap line item {i+4}" / "$X,XXX/mo"` fake row markup entirely.

4. **Category-mismatch caveat reword** (both redacted and full views):
   Replace current caveat with: *"We couldn't confirm your business category from Google yet, so these use general local-business benchmarks — your numbers will sharpen everything."* Emit from `run-public-audit` `resolveProjectType` when `path === 'default'` (single source of truth).

5. **CTA / token sweep on `/free-audit`:**
   - Unlock submit button: `bg-[hsl(var(--stm-warn))]` → `bg-[hsl(var(--stm-cobalt))]` with `text-white` for contrast on the dark unlock card.
   - Unlock inputs focus ring: `focus:border-[hsl(var(--stm-warn))]` → `focus:border-[hsl(var(--stm-cobalt))]`.
   - "Try again" button in failure state: same swap (amber → cobalt).
   - Grep the file for any remaining `stm-warn` used as a CTA vs. attention-only; keep amber only on the "we couldn't confirm your category" caveat and honeypot/attention states.

## PART C — EMAIL GATE INTEGRITY

### C1. Diagnosis — how "ab" unlocked
Two independent gaps line up:
- **Client:** input has `type="email" required maxLength=255` but the submit handler only checks `if (!email) return` — no format validation, and `required` is only enforced when the form fires a real `submit` event through the browser (a controlled `<form onSubmit>` bypasses the browser's built-in validity check because React calls the handler before the browser cancels invalid submits — and even when the browser does validate, `type=email` accepts `"ab"` as empty-string-ish; specifically `type=email` requires an `@` but 2-char strings without `@` should be rejected — the observed 2-char unlock means either the button was clicked while `required` was momentarily satisfied by whitespace, or the handler ran without validity checking).
- **Server:** `unlock-public-audit` uses `z.string().trim().email().max(255)` on `email`. If Zod passed `"ab"`, then the client bypassed validation and the server ran an old build without this zod line — OR the value at unlock time was actually `"ab@x"` (5 chars, minimal RFC-valid), which `z.string().email()` DOES accept. **Working hypothesis:** the tested string was `a@b` (or similar) which passes both the browser and Zod's default lax email regex. The gate is not truly enforcing "real-looking business email".

**Fix strategy:** tighten both sides with the same regex; do not rely on browser `required` alone.

### C2. Client fixes (`FreeAudit.tsx` + `usePublicAudit.ts`)
- Add pure regex validator `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` (requires `.` in the domain with a ≥2-char TLD).
- Trim value on change; compute `emailValid`; disable submit unless `emailValid`.
- Show inline red helper text ("Enter a valid business email") on blur when invalid and non-empty.
- Do not `await audit.unlock(...)` if `!emailValid`.
- No change to `unlockName`/`phone` handling.

### C3. Server fixes (`unlock-public-audit/index.ts`)
- Replace `z.string().trim().email().max(255)` with:
  ```
  z.string().trim().toLowerCase().max(255).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'invalid_email')
  ```
- On validation failure return 400 with `{ error: 'invalid_email' }` **before** any Supabase write. No `inbound_leads` insert, no `email_captured_at` stamp, no `full_result` return.
- `email` stored in `public_audit_requests.email` and `inbound_leads.email` is the trimmed-lowercased value from Zod's transformed output.

Client-side validation is UX; the server is the gate. Both use the identical regex string (copied verbatim, no shared package — edge functions can't import from `src/`).

## PART D — CURRENT UNLOCK WRITE PATH (confirmed, no code)

On a successful `POST /unlock-public-audit`:

1. **Loads** `public_audit_requests` row by token (must be `status='complete'`; otherwise 409).
2. **Inserts** one row into `public.inbound_leads` with:
   - `name` = provided name OR local-part of email
   - `business_name` = from audit request
   - `email` = user-supplied
   - `phone` = user-supplied or `null`
   - `message` = `"Public leak audit unlocked. Estimated $<total>/mo across <n> leaks."`
   - `conversation_channel` = `'public_audit'`
   - `route_to` = `'self'`
   - `is_ready` = `true`
   - `source` = `'free-audit'`
   - `qualifier_data` (jsonb) = `{ source, token, operation_footprint, redacted_summary, leak_count, top_leaks, project_type_resolution, place_id, city }`
   - (`captured_for_project_id` stays NULL — shell venue is not persisted as a real project.)
3. **Updates** the `public_audit_requests` row: sets `email` (lowercased/trimmed post-fix) and `email_captured_at = now()`. Nothing else on that row changes.
4. **Returns** `{ full_result }` to the client, which flips FreeAudit into the full-result view.

No CRM auto-promotion, no `crm_contacts`/`crm_deals` write, no email send. That's the pre-E1 surface.

## Files changed (scope)

- **DB migration** — remove Lapsing memberships row from `project_type_leak_vectors` for `home_services`; extend `project_types.home_services.display_defaults` with `missed_calls`, `booking_rate`, `open_estimates`. Add a comment on the seed statement documenting the "every var must resolve" invariant.
- `supabase/functions/compute-leak-stack/index.ts` — add `render_state` to each result; no other math change.
- `supabase/functions/unlock-public-audit/index.ts` — tighten email regex + lowercase + early 400.
- `src/pages/FreeAudit.tsx` — new headline branching, taxonomy stripped from cards, plain-English + source-line rendering, locked rows use real remaining count (delete fake rows), reworded caveat pulled from `project_type_resolution.caveat` (server-side reworded), cobalt-not-amber CTA sweep, client email regex + disabled state + inline error.
- `src/hooks/usePublicAudit.ts` — surface a typed 400 (`invalid_email`) so the UI can render a specific error.

## Guardrails

- No fabricated numbers — all new defaults are labeled estimates and rendered via the same source chip pipeline; unscored stays unscored internally.
- Internal `/leak-stack` page renders `full_result` results verbatim including `severity`, `risk_type`, benchmark, and `inputs` — unchanged.
- Theater, redaction, and dedupe mechanics untouched.
- `tsc --noEmit` clean; no anon grants; no route changes.

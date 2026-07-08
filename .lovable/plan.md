## Branded Recovery Report — Plan

Clone the **proposal** render/print pattern (not growth-audit) to give each `recovery_reports` row a branded one-pager, plus an integrity-gated public share link. Zero changes to `generate-recovery-report` or the draft→reviewed→sent workflow. Zero arithmetic anywhere in render — every figure reads verbatim from the row.

### (a) Files cloned from the proposal pattern

- `src/components/proposals/ProposalRenderer.tsx` → **`src/components/recovery-report/RecoveryReportRenderer.tsx`**
  - Reuses the same section shell: `.proposal-print-root .proposal-surface p-10 relative`, `max-w-3xl mx-auto space-y-8`, `.proposal-avoid-break` sections, `.proposal-card`, `.proposal-eyebrow`, `.proposal-rule`, `.proposal-ink-muted`, `.proposal-display`, `.proposal-mono`, `.proposal-check`, `.proposal-draft-watermark`.
  - Reuses the `useProposalFonts()` webfont-injection pattern verbatim (Bricolage / Instrument Sans / IBM Plex Mono).
- `src/components/proposals/print.css` → **imported directly** (`import '@/components/proposals/print.css'`). Same tokens, same `@page`, same `-webkit-print-color-adjust: exact`, same `.proposal-print-root` visibility discipline. No new print.css file — one source of truth for the brand.
- Harness pattern from `ProposalsListCard` (sticky non-printing header w/ Back + Print + share controls) → **`src/components/recovery-report/RecoveryReportPrintHarness.tsx`**, embedded inside `RecoveryReports.tsx` when "View branded report" is clicked.

**New class added to shared `print.css`:** `.proposal-money-green { color: #0E5236; font-weight: 600; font-family: 'IBM Plex Mono', ui-monospace, monospace; }` — recovered money is green, `.proposal-money` (rust) stays reserved for leaks/losses. One-line addition; does not alter existing proposal usage.

### 1. Renderer sections (verbatim reads)

Input: a single `RecoveryReport` row (`metrics`, `estimated_dollars`, `estimate_basis`, `narrative`, `status`, `period_start/end`) plus the client display name (already available via `useApp().selectedBar`) and a `referralFooter: boolean`.

- **Header:** eyebrow `WEEKLY RECOVERY REPORT`; `proposal-display` "Prepared for {client name}"; period `period_start – period_end` in mono. "your business" phrasing in body copy.
- **Recovered-Activity Ledger** (`proposal-card`, rows separated by `proposal-rule`): reads `metrics.leads.total` (with `metrics.leads.after_hours` shown inline as a mono chip), `metrics.followups.re_engaged` (of `.sent`), `metrics.reactivation.responded` (of `.contacted`), `metrics.reviews.reviews_landed` (of `.requests_sent`). Each row: green `CheckCircle2` (gold `proposal-check` swapped for forest), ink label, count in `proposal-display` size, `proposal-ink-muted` sub-line. Counts are FACT — no dollar sign, no "estimate" label.
- **Estimated Value:** big `proposal-display` number in `.proposal-money-green` (forest #0E5236), explicit label "Estimated recovered value". Below it, `.proposal-eyebrow` "How we got this" and a visible disclosure block rendering `estimate_basis.formula` (mono), `avg_ticket`, `close_rate`, `source` (with a gold "default assumption" pill when `source === 'default'` or `'mixed'`), and each caveat as a bullet. This block is always visible in print and share — no `<details>`.
- **Narrative:** `narrative` rendered as-is inside a `proposal-card` (`whitespace-pre-wrap`).
- **Optional referral footer** (rendered when `referralFooter === true`): italic block, `proposal-card` with gold left border — "PS — the referral offer is standing: $250 for every owner you send who signs. You've seen the report now. You know if it's real."
- **Footer:** small mono "Powered by Supreme Team OS", centered.
- **Watermark:** `.proposal-draft-watermark` reading `DRAFT` when `status === 'draft'`; hidden when `reviewed` or `sent`.

### (c) Renderer performs no recomputation — confirmed

The component takes `report: RecoveryReport` and reads `metrics.*` fields, `estimated_dollars`, and `estimate_basis.*` directly. No summation, no derivation, no percent math, no fallback numeric coercion. `Math.round` and `toLocaleString` are formatting only. `estimate_basis` is displayed byte-for-byte from the row.

### 2. Entry point

Edit `src/pages/RecoveryReports.tsx`:
- Add a **"View branded report"** button next to the existing Copy / Mark reviewed / Mark sent controls in `ReportDetail`. Enabled for all statuses (drafts render watermarked).
- Clicking swaps the detail pane for `RecoveryReportPrintHarness` — sticky non-printing top bar (`proposal-no-print`) with **Back**, **Print**, **Create share link / Copy link / Revoke** controls (admin/operator only for share actions; existing operator/admin gate on this page already applies).
- No new route, no new pageKey, no `role_page_defaults` seed needed.

### 3. Share link (public, integrity-gated)

**Migration** (additive):

```sql
ALTER TABLE public.recovery_reports
  ADD COLUMN share_token text UNIQUE,
  ADD COLUMN share_referral_footer boolean NOT NULL DEFAULT true;
CREATE INDEX idx_recovery_reports_share_token ON public.recovery_reports(share_token) WHERE share_token IS NOT NULL;
```

No new RLS policies — anon still has no grants on `recovery_reports`. Public reads happen only through the edge function (service role).

**Hook additions** in `useRecoveryReports.ts`: `createShareLink({ id, referralFooter })` → generates a 32-byte base64url token client-side via `crypto.getRandomValues`, updates `share_token` + `share_referral_footer`. `revokeShareLink(id)` → nulls `share_token`. Both admin/operator via existing RLS on the table.

**Edge function** `supabase/functions/get-shared-recovery-report/index.ts` (new, `verify_jwt = false` — Lovable-managed default; explicit CORS via `npm:@supabase/supabase-js@2/cors`):

- Zod-validate `{ token: string.min(32).max(256) }` from POST body.
- Service-role client queries `recovery_reports` by `share_token`.
- **HARD GUARD:** returns 404 unless `status IN ('reviewed','sent')`. A regenerated draft with a still-populated token also returns 404. Confirmed: single status check, no `.in()` shortcut so the intent is explicit.
- Also joins the venue display name (via `venues.name` on `project_id`) so the public page never queries the DB itself.
- **Curated JSON out:** `{ display_name, period_start, period_end, metrics, estimated_dollars, estimate_basis, narrative, share_referral_footer }`. **Never** returns: `id`, `project_id`, `reviewed_by`, `reviewed_at`, `sent_at`, `status`, `narrative_edited`, `generated_at`, `updated_at`, share_token.

### (b) Status guard confirmed

The edge function returns 404 for any `status` other than `'reviewed'` or `'sent'`. Drafts — including reports regenerated back to draft after a token was minted — cannot reach a client through the share route. The 404 is indistinguishable from a bad token so link enumeration reveals nothing.

**Public route** `src/pages/PublicRecoveryReport.tsx` at `/r/:token`:

- Registered in `src/App.tsx` **outside** `ProtectedRoute`.
- Component calls `supabase.functions.invoke('get-shared-recovery-report', { body: { token } })` — the page never touches the DB directly.
- Renders `<RecoveryReportRenderer report={curated} referralFooter={curated.share_referral_footer} statusOverride="sent" />` (statusOverride hides the DRAFT watermark on the public surface; the status guard already prevents drafts from reaching here).
- `<Helmet>`-style `<meta name="robots" content="noindex, nofollow" />` injected via `useEffect`.
- No layout chrome, no nav, no sidebar, no links back to `/`. Bone background, brand fonts, that's it.
- 404 fallback → minimal "This report is not available" card in brand tokens.

### Files

- **New:**
  - `src/components/recovery-report/RecoveryReportRenderer.tsx`
  - `src/components/recovery-report/RecoveryReportPrintHarness.tsx`
  - `src/pages/PublicRecoveryReport.tsx`
  - `supabase/functions/get-shared-recovery-report/index.ts`
  - Migration adding `share_token` + `share_referral_footer`.
- **Edited:**
  - `src/pages/RecoveryReports.tsx` — "View branded report" entry point.
  - `src/hooks/useRecoveryReports.ts` — `createShareLink` / `revokeShareLink`, extend `RecoveryReport` type with new columns.
  - `src/components/proposals/print.css` — add `.proposal-money-green` (one class).
  - `src/App.tsx` — public `/r/:token` route outside auth.
  - `src/integrations/supabase/types.ts` — regenerated post-migration.

### Guardrails

- Additive. No changes to `generate-recovery-report`, the metrics jsonb shape, or the draft→reviewed→sent workflow.
- Renderer takes a curated payload matching the row shape — same component powers the internal harness and the public `/r/:token` page. Zero arithmetic in either mode.
- Activity=fact / dollars=labeled-estimate framing baked into markup and survives to print and share (estimate_basis disclosure is always-visible, not collapsed).
- No new anon grants on any table. Public access is service-role via the curated function only, gated on `status IN ('reviewed','sent')`.
- `tsgo --noEmit` clean.

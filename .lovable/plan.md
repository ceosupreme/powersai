# Homepage Rebuild — Full Pass (with guards)

Additive rebuild. New section components live under `src/components/marketing/rebuild/`. `MarketingSite.tsx` unmounts the current sections and mounts the new ones. Zero deletions, zero schema/route changes — instant rollback by swapping the imports back.

## Preserved exactly
- Supabase contact submission + success card (logic reused inside `rebuild/Contact.tsx`).
- All routes (`/`, `/free-audit`, `/for/:slug`, `/approvals`, internal app).
- `/free-audit` backend, theater timing, redaction, unlock (only copy strings + token references change).
- Fix-1 prefill mechanic (`sessionStorage` key `stm.contact.prefill` + `stm:contact-prefill` CustomEvent) — moved into the new Contact triage picker; homepage triage widget removed.
- Internal app + `/approvals` (out of scope — new tokens are additive under `.stm-marketing`, cannot leak).
- Database schema (no migrations).

## Guard 1 — Print renderers keep Bricolage

`ProposalRenderer.tsx` (line 28) and `RecoveryReportRenderer.tsx` (line 34) already self-inject their own `<link>` to `Bricolage+Grotesque:wght@500;700`. Their `print.css` files reference `'Bricolage Grotesque'` for headings.

Path chosen: **keep the Bricolage line in `src/index.css` `@import`** exactly as-is. The marketing scope simply stops *referencing* it in `.stm-marketing .font-display`. Renderers are dual-covered (self-load + global import), so neither the /approvals PDF nor the recovery-report PDF can silently re-skin.

## Guard 2 — New tokens are additive, legacy tokens untouched

Legacy tokens keep their existing values under `.stm-marketing`:
```
--bone --bone-2 --surface --ink --ink-soft
--green --green-deep --green-tint
--rust --rust-tint --rust-light
--gold --gold-tint --line
```
None of these get their VALUE changed. VerticalLanding's `bg-[hsl(var(--bone))]`, ProposalRenderer, RecoveryReportRenderer, and any legacy consumer continue to render exactly as before.

New tokens live under new names in the `.stm-marketing` scope only:
```
--stm-bg: 220 20% 97%;         /* #F7F8FA */
--stm-surface: 0 0% 100%;
--stm-ink: 225 14% 9%;         /* #101218 */
--stm-ink-soft: 220 8% 41%;    /* #5F6672 */
--stm-band-dark: 225 52% 8%;   /* #0A1020 */
--stm-cobalt: 231 100% 64%;    /* #465CFF */
--stm-cyan: 191 100% 67%;      /* #55D6FF */
--stm-cobalt-soft: 230 100% 96%;/* #E9EDFF */
--stm-ok: 152 68% 32%;         /* #198A5A */
--stm-warn: 36 72% 55%;        /* #E1A23A */
--stm-loss: 9 72% 59%;         /* #E15C4A */
```
Inside `.stm-marketing` I additionally *re-route* the shadcn semantic tokens (`--background`, `--foreground`, `--primary`, `--accent`, `--border`, etc.) to the new `--stm-*` values. Those semantic tokens are already re-routed today (to `--bone`, `--green`, `--rust`, etc.) — I'm swapping the destination, not renaming or deleting the semantic layer. Effect: the marketing surface picks up the new palette; the app surface (which never applies `.stm-marketing`) is unaffected.

Rebuild components reference **only** `--stm-*` and the shadcn semantics (`--background`, `--foreground`, `--primary`, `--accent`, `--border`, `--muted-foreground`). Rebuild components do NOT reference `--bone/--green/--rust/--gold` directly — grep gate enforced pre-publish.

`/free-audit` copy pass swaps its inline `--bone/--green/--rust/--gold/--ink` references to the corresponding `--stm-*` names so the page inherits the new palette per spec.

Vertical landers: `src/components/marketing/vertical/VerticalHero.tsx` `accentVar` map values swap to `#E15C4A` / `#198A5A` / `#465CFF`; loading spinner border color changes. Their page shell keeps its existing `bg-[hsl(var(--bone))]` (out of scope — no migration).

## Final section order (top → bottom)
1. Nav (rebuild) — light
2. Hero (rebuild) — light, contains `#hero-flow` SVG animation
3. Problem (rebuild) — light, `id="moments"`
4. Outcomes (rebuild) — light, `id="outcomes"`
5. BarPulseProof (rebuild) — DARK `#0A1020`, `id="barpulse"`
6. Process (rebuild) — light, `id="process"`
7. Founder (rebuild) — light, `id="founder"`
8. FAQ (rebuild) — light
9. Contact (rebuild) — DARK `#0A1020`, `id="contact"`, contains triage picker
10. Footer (rebuild) — light

## Typography ruling (single source)

Heading token is already centralized at `.stm-marketing .font-display` (index.css line 513). Reported: heading font IS tokenized in one place — fix the token, don't chase per-component instances. Body font is at `.stm-marketing` (line 505) and `.font-body` (line 524).

Changes inside `.stm-marketing` only:
- `.stm-marketing` body font → `"Instrument Sans", ui-sans-serif, system-ui, sans-serif` (unchanged — it already is Instrument Sans).
- `.stm-marketing .font-display` → `"Inter Tight", ui-sans-serif, system-ui, sans-serif`, weights 700/800, `letter-spacing: -0.02em`.
- `.stm-marketing .font-body` → unchanged.
- `.stm-marketing .font-serif-accent` — left defined but unused by rebuild components (grep gate).
- `.stm-marketing .font-mono-label` — left defined; rebuild references it only inside the single BarPulseProof product view for tiny authentic metadata.
- `.stm-marketing .eyebrow` — restyled to small-caps sans, `letter-spacing: 0.06em`, `font-family: inherit`, prefixed with a 12px cobalt tick (existing `::before` retargeted from `hsl(var(--gold))` → `hsl(var(--stm-cobalt))`, width shortened).

Google Fonts: append a second `@import` line for Inter Tight (`?family=Inter+Tight:wght@600;700;800&display=swap`). Existing imports are untouched (Guard 1).

## Removed-from-render checklist (unmounted, files kept for rollback)
- [x] Hero stat box (metric strip inside old `Hero.tsx`) — old Hero not imported.
- [x] Hero triage card (`HeroTriage.tsx`) — mechanic ports to Contact.
- [x] Six-systems / `WhatIBuild.tsx`.
- [x] `LeadFollowUpShowcase`, `InsightsShowcase`, `AssistantShowcase`, `AutomationsShowcase`, `ContentShowcase`.
- [x] `ConnectiveLayer.tsx` (Before/After panels + "whole operation" band).
- [x] Old 5-phase / `Process.tsx` cards + 01–05 steps.
- [x] `TechStack.tsx` "WORKS WITH YOUR STACK" marquee.
- [x] `ChatMarquee.tsx`.
- [x] `Industries.tsx`.
- [x] `FinalCTA.tsx`.
- [x] `Proof.tsx` — includes the "$10K/MO" counter, tag pills row, four "IN FLIGHT" cards, "Phone & social — coming soon".
- [x] All serif-italic accents, gold-mono eyebrows, grain overlay div, and bone/green/rust/gold token usage on the rebuilt sections (enforced by grep gate on `rebuild/`).
- [x] `<div className="grain fixed inset-0 z-0" />` removed from `MarketingSite.tsx`.

## Triage prefill rewiring
`rebuild/Contact.tsx` includes the "Pick the one that stings" picker row above the form. Three buttons dispatch `CustomEvent("stm:contact-prefill", { detail: text })` and `sessionStorage.setItem("stm.contact.prefill", text)`. The controlled `message` textarea (already listening from Fix 1) fills instantly. No scroll behavior needed — picker sits beside the form. Homepage `HeroTriage` unmounted, so no orphan target hashes exist.

## Sections receiving custom graphics
- **Hero (`#hero-flow`)** — built React/SVG component (`rebuild/HeroFlow.tsx`).
  - Stage A: phone + web icons → three tool nodes (CRM / Schedule / Inbox), two dead-end paths ending in coral `NO REPLY` and `SEEN 3 DAYS LATE` chips.
  - Stage B: single cobalt→cyan drawn path: `ANSWERED IN SECONDS → QUALIFIED → BOOKED → OWNER NOTIFIED` → green completion dot.
  - IntersectionObserver triggers a scroll-in line-draw, slow A↔B loop; static Stage-B frame under `prefers-reduced-motion`.
  - Mobile: same component, path recomposes vertically via CSS; labels ≥14px.
- **Problem** — three inline SVG spot illustrations in the same line language (ringing phone at night, fading quote paper, late report page), ~180–220px wide.
- **Outcomes** — three asymmetric scene tiles with drawn cobalt→cyan connected paths + green completion checks.
- **Process** — one drawn cobalt path joining the three steps, echoing Hero.
- **BarPulseProof** — one large faithful product view (single dark card, white text ≥16px) with exactly three enlarged cobalt-ringed callouts: `What changed` · `What needs attention` · `Where it came from`. No mock browser chrome, no dots.

## Reduced-motion behavior
- Hero flow: static final frame (Stage B), no line-draw loop.
- Reveal / process path draw / spot illustrations: no transform, opacity 1.
- Enforced via `@media (prefers-reduced-motion: reduce)` inside the new keyframes block.

## Copy handling
Every string is typed verbatim from your prompt. Grep gates:
- Banned: `leak`, `audit` (outside `/free-audit` URL literal), `source-cited`, `AI-native` — zero in `src/components/marketing/rebuild/**` and rebuilt `FreeAudit.tsx`.
- Technical vocab (`dashboard`, `automation`, `workflow`, `integration`, `AI`) appears only inside the three tertiary labels under Outcomes.

## Files touched

Add:
- `src/components/marketing/rebuild/Nav.tsx`
- `src/components/marketing/rebuild/Hero.tsx`
- `src/components/marketing/rebuild/HeroFlow.tsx`
- `src/components/marketing/rebuild/Problem.tsx`
- `src/components/marketing/rebuild/Outcomes.tsx`
- `src/components/marketing/rebuild/BarPulseProof.tsx`
- `src/components/marketing/rebuild/Process.tsx`
- `src/components/marketing/rebuild/Founder.tsx`
- `src/components/marketing/rebuild/FAQ.tsx`
- `src/components/marketing/rebuild/Contact.tsx`
- `src/components/marketing/rebuild/Footer.tsx`
- `src/components/marketing/rebuild/icons/spot.tsx` (three spot illustrations)

Edit:
- `src/pages/MarketingSite.tsx` — swap all section imports to `rebuild/*`, drop the `grain` overlay div.
- `src/index.css` — add Inter Tight `@import` (Bricolage line kept, Guard 1); add `--stm-*` token block inside `.stm-marketing`; swap `.stm-marketing .font-display` family to Inter Tight; re-route existing shadcn semantic vars inside `.stm-marketing` from `--bone/--green/…` → `--stm-*`; retarget `.eyebrow` styling; keep all legacy token definitions and utility classes (`.font-serif-accent`, `.font-mono-label`, `.grain`, `.radial-gold`, etc.) intact for unmounted files and print renderers.
- `src/components/marketing/vertical/VerticalHero.tsx` — `accentVar` hex remap + spinner border color to cobalt.
- `src/pages/FreeAudit.tsx` — copy pass (H1, sub, button text, result headline pattern, unlock header, tab titles) + token pass (`--bone` → `--stm-bg`, `--green` → `--stm-cobalt`, `--rust` → `--stm-loss`, `--gold` → `--stm-warn`, `--ink` → `--stm-ink`).

Do not edit: `Contact.tsx` (old), `HeroTriage.tsx`, `Proof.tsx`, showcase files, `TechStack.tsx`, `ChatMarquee.tsx`, `WhatIBuild.tsx`, `Process.tsx` (old), `Industries.tsx`, `FinalCTA.tsx`, `ConnectiveLayer.tsx`, `Footer.tsx` (old), `ProposalRenderer.tsx`, `RecoveryReportRenderer.tsx`, both `print.css` files, `VerticalLanding.tsx` page shell.

## Gates before Publish
- Removed checklist verified via `rg` against `MarketingSite.tsx` imports.
- Banned-words grep across `rebuild/` and `FreeAudit.tsx` returns zero.
- Legacy-token grep in `rebuild/`: `rg 'var\(--(bone|green|rust|gold|line|surface|ink-soft)\b' src/components/marketing/rebuild` returns zero.
- Font grep in `rebuild/`: `rg 'Bricolage|Instrument Serif|IBM Plex Mono|font-serif-accent' src/components/marketing/rebuild` returns zero. `font-mono-label` allowed only in BarPulseProof.
- Print-renderer sanity: `rg 'Bricolage' src/components/proposals src/components/recovery-report` still returns the self-load line + print.css usage (unchanged).
- Hero graphic is inline SVG component, not `<img>`.
- `tsgo` clean.
- Playwright at 1280×800 + 390×844: nav anchors resolve, hero animation renders (or static under reduced motion), triage picker prefills textarea, `/free-audit` renders new copy + new tokens, vertical lander loads with cobalt spinner, `/approvals` proposal preview still renders in bone/green/rust/gold.

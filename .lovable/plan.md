# Homepage Visual Overhaul — Design System v2

Restyle the public marketing homepage (`/`, rendered by `src/pages/MarketingSite.tsx`) end-to-end against the new bone/green/rust/gold token system. Style-level + additive; no route, schema, wiring, or copy changes outside the 5 surgical edits.

## Scope confirmation

- **In scope:** `src/pages/MarketingSite.tsx` + every file under `src/components/marketing/**` (Nav, Hero, HeroTriage, TechStack, all `showcase/*`, ChatMarquee, Proof, ConnectiveLayer, WhatIBuild, Process, Industries, FAQ, FinalCTA, Contact, Footer, `site/primitives.tsx`, `site/Reveal.tsx`), plus token additions to `src/index.css`.
- **Out of scope:** internal app pages, `/work`, `/q/:slug`, Growth Audit reports, auth pages, RLS, edge functions.
- **Wiring preserved:** Quick Triage (`HeroTriage.tsx`) internal logic untouched; Contact form submit path untouched; all anchor IDs kept (`#top #lead-followup #ops-dashboard #assistant #automations #proof #contact`); routes untouched.

## Step 1 — Fonts + tokens (`src/index.css`)

- Add Google Fonts `<link rel="preconnect">` + `@import` for Bricolage Grotesque (800/700/600), Instrument Serif (400 italic), Instrument Sans (400/500), IBM Plex Mono (400/500). `display=swap`. Keep existing font @import (used by rest of app) — additive.
- Under the existing `.stm-marketing` scope, add v2 tokens as **new** custom properties (do not delete legacy ones — other marketing utilities read them):
  - `--bone:#F7F4EC`, `--bone-2:#EFEAE0`, `--surface:#FCFBF7`
  - `--ink:#15140F`, `--ink-soft:#57544A`
  - `--green:#0E5236`, `--green-deep:#0A3B27`, `--green-tint:#E7EFE9`
  - `--rust:#B5431E`, `--rust-tint:#F6E3DA`, `--rust-light:#E07A4F` (for dark-band alerts)
  - `--gold:#C9A24B`, `--gold-tint:#F3EAD6`
  - `--line:#E4DFD2`
- Remap the shadcn tokens **only within `.stm-marketing`** so `bg-background`, `text-foreground`, `border-border`, `bg-accent`, `text-accent-foreground` resolve to the new palette (background→bone, foreground→ink, accent→green, border→line). This lets existing className usage in the sections inherit the new palette without a full component rewrite.
- Add utility classes in `@layer components` under `.stm-marketing`:
  - `.font-display` → Bricolage Grotesque 800; `.font-serif-accent` → Instrument Serif italic; `.font-body` → Instrument Sans; `.font-mono-label` → IBM Plex Mono 12px uppercase 0.14em.
  - `.eyebrow` (redefine): mono 12px, gold, preceded by `::before` 24px×1px gold rule.
  - `.card-lift` → surface bg, 1px line border, rounded-2xl, transition; hover translateY(-3px) + shadow-lg + gold border.
  - `.mockup-frame` → green-deep bg, rounded-2xl, inner ring `rgba(201,162,75,.25)`, shadow-2xl, browser-chrome top bar (3 dots + mono label slot).
  - `.mockup-chip` → `rgba(247,244,236,.10)` bg, bone text.
  - `.grain` (update): SVG noise data URL, ~2.5% opacity, fixed, pointer-events:none.
  - `.radial-gold` / `.radial-green` washes for hero + case-study bands.
  - `.marquee` keyframes for 30s auto-scroll (pausable on hover), `@media (prefers-reduced-motion: reduce)` disables all motion utilities (`reveal`, `marquee`, `.count-up`).

## Step 2 — Shared primitives (`site/primitives.tsx`, `site/Reveal.tsx`, new `site/Marquee.tsx`, new `site/CountUp.tsx`, new `site/MockupFrame.tsx`)

- `Eyebrow`: rewrite to mono + gold rule per token spec.
- `Panel`: repoint to `.card-lift`.
- New `MockupFrame({ label, tilt, children })` — reusable dark inset for every product mockup (assistant chat, insights panel, lead follow-up, automation flow, "AFTER" panel). Renders browser chrome + mono label like `STM/LEADS.INBOX`.
- New `Marquee` (CSS-only, respects reduced-motion) — used by TechStack + hero footer strip.
- New `CountUp` — IntersectionObserver-triggered numeric animation for hero stat strip + case-study stats.
- `Reveal` kept; verify it disables when `prefers-reduced-motion: reduce` (add guard).

## Step 3 — Section-by-section restyle

**Global (`MarketingSite.tsx`)**: add site-wide `<div className="grain" />` overlay. Root gets `bg-bone text-ink font-body`. Alternate section backgrounds bone / bone-2.

**Nav** (`site/Nav.tsx`): sticky, `bg-bone/85 backdrop-blur`, 1px line bottom. Items `whitespace-nowrap`. Consolidate to: **Systems** (`#lead-followup`) · **Proof** (`#proof`) · **Process** (`#process`) · **FAQ** (`#faq`) · **Contact** (`#contact`) + Log in text link + green pill "Book a call". Wordmark stays; subtitle shrinks to mono 10px. Verify each anchor id exists in the target section; add `id` if missing (Process, FAQ) — additive only.

**Hero** (`sections/Hero.tsx`): display type + serif-accent — wrap "slipping" in `<span className="font-serif-accent text-[color:var(--rust)] relative">` with an inline SVG hand-drawn underline (rust stroke). Copy edits:
- CTA "Book a free AI systems audit" → **"Get your free Profit Leak Audit"**.
- Subline: append **" And the revenue leaking between them — recovered."** after "…connected."
- Secondary CTA → underlined text-link with sliding arrow.
- **Add stat strip** below CTAs: mono, rust numerals, ink labels: "1 missed call/day ≈ $108K/yr · 63% of leads buy from the first responder · <5s reply time" + footnote "industry estimates — your audit uses your numbers". Numerals use `CountUp`.

**HeroTriage** (`sections/HeroTriage.tsx`): visual only — `.card-lift` (surface, gold ring), mono header "STM/TRIAGE" + pulsing gold LIVE dot, options as full-width rows with green hover, OK button green pill. All state/handler logic preserved.

**TechStack** (`sections/TechStack.tsx`): replace "BUILT WITH" label + logo grid with a mono `Marquee`: **"WORKS WITH YOUR STACK — Toast · Square · QuickBooks · Google Workspace · Calendly · Twilio · HubSpot · 7shifts · + 200 more"**.

**LeadFollowUpShowcase / InsightsShowcase / ConnectiveLayer ("Always-on")**: light stages (bone or bone-2). Product mockups wrapped in `MockupFrame`. "Always-on" mini-cards → `.card-lift`, mono timestamps gold, icon chips in green-tint circles. **Fix invisible text A:** any text currently rendered as `text-foreground` on a formerly-dark background is now legible because the section bg flips to bone.

**AssistantShowcase** ("Custom AI Assistants"): light stage; headline + bullets in ink; bullets get gold square markers; chat mockup stays green-deep as `MockupFrame` inset. **Fix invisible text B:** headline moves from dark bg → ink on bone.

**ContentShowcase** ("Marketing copy that sounds like you wrote it."): light stage; headline in ink with **"you" set in Instrument Serif italic, color green**. **Fix invisible text C:** this headline currently reads bone-on-bone / accent-on-accent and is invisible — will be ink on bone with the italic green "you", explicitly verified after restyle.

**AutomationsShowcase**: light stage. Flow nodes (Trigger/Enrich/Decide/Action/Notify) become `mockup-chip` (bone/10 bg, bone text) inside a `MockupFrame`; connectors gold; run log text bone at **full opacity** (audit and remove every `opacity-*`/`text-*-foreground/70` inside dark mockups); timestamps gold. **Fix invisible text D:** run-log lines currently rendered at `opacity-40`/`opacity-60` will be forced to full-opacity bone.

**WhatIBuild** ("AI Systems I Build" → Bento): restructure grid to 6 cols. Featured (span 3) = "AI Lead Follow-Up Systems" + "AI Operations Dashboards" — each gets a tiny inline dark mockup strip. Remaining four span 2/2/2/2 on next rows (last spans balance to 6). Icons in green-tint circles, category chips gold-outline mono. Content strings untouched.

**Process**: horizontal scroll-snap row on mobile, 5-across desktop. Gold connector line through mono phase badges 01–05. Card hover lifts with gold border. Add `id="process"` for nav anchor.

**Industries** ("Who this is for"): chip pills gold-outline, hover fills gold-tint; headline gets display treatment.

**Proof** (BarPulse case study) — **dark band #1**: green-deep with grain + green radial wash, gold eyebrow "CASE STUDY", bone body text. **Add stats row** (three big Bricolage-800 count-ups):
- **8** venues (gold)
- **$10K/mo** engagement (rust-light `#E07A4F`)
- **LIVE** in production (gold, pulsing)
Serif-accent "production" in gold. Checkmarks gold. Tag pills bone/10. Placeholder "more case studies coming soon" cards → bone/5 dashed-border, mono "IN FLIGHT" gold.

**FAQ**: shadcn `Accordion` (already available in `components/ui/accordion.tsx`) — hairline dividers, mono gold +/– toggle glyphs, smooth height. Add `id="faq"`.

**FinalCTA + Contact**: split layout. Left: display headline + three mono reassurance lines (gold dots) — "Reply within 24h" / "15-minute first call" / "No obligation, ever". Right: elevated `.card-lift` form card, inputs with 1px line borders + green focus rings, labels mono 11px, Send = full-width green pill with arrow slide. Form submit handler untouched.

**Footer** — **dark band #2**: green-deep, gold 1px top rule, bone text, mono micro-links, add small line "Powered by Supreme Team OS". Existing links + email preserved.

**ChatMarquee**: already a marquee — restyle chips to bone/10 with bone text on green-deep or gold-outline on bone (whichever section it sits between); no logic changes.

## Step 4 — "Dark screen, light stage" verification checklist

Only these two sections remain full-width dark: **Proof (BarPulse case study)** and **Footer**. Every other formerly-dark section is now light with dark `MockupFrame` insets.

## Step 5 — Invisible-text fixes (explicit)

Confirming the four locations listed in the brief:

1. **ContentShowcase "Marketing copy that sounds like you wrote it."** — headline rendered near-invisible on current bg. Fix: light stage, ink headline, "you" italic green.
2. **AssistantShowcase headline + bullets** — currently muted on dark. Fix: light stage, ink text, gold bullet markers.
3. **AutomationsShowcase run-log + flow-node labels** — muted via `opacity-*` on dark. Fix: full-opacity bone inside `MockupFrame`, gold timestamps.
4. **InsightsShowcase source-chip text** (and any other dark-bg copy currently at reduced opacity) — Fix: audit every `opacity-*`/`/60`/`/70`/`text-muted-foreground` inside dark mockups, replace with full-opacity bone or gold per role.

I'll grep every `marketing/**` file for `opacity-[0-9]` and `/[567]0` classes inside dark mockups during the build and remove them.

## Step 6 — Motion

Reuse existing `Reveal` (already IntersectionObserver-based) for fade-up stagger. Add: `CountUp` (IO), `Marquee` (pure CSS keyframes), button arrow slide (Tailwind `group-hover:translate-x-[3px]`), logo/tech marquee 30s loop pausable on hover. Every animation gated by `@media (prefers-reduced-motion: reduce)`.

## Guardrails restated

- No new heavy deps (fonts via Google `<link>`; motion via existing Reveal + CSS + tiny IO hooks).
- No wiring, route, schema, or logic changes.
- Copy verbatim except the 5 surgical edits.
- `tsgo --noEmit` must stay clean.
- Only `.stm-marketing`-scoped CSS changes leave the marketing surface; app pages unaffected.

Awaiting approval to build.

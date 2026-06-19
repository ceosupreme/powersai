## Hero refinements — de-mono + widescreen

### 1) De-monospace the hero (and centrally)

**`src/components/marketing/site/primitives.tsx`** — repoint `MonoLabel` to a clean Inter uppercase letter-spaced label so any caller that imported it (and future sections) inherits the new treatment:
- Replace `font-mono-label` class with `text-[0.62rem] font-medium uppercase tracking-[0.18em]`. Keep the component name/API stable so no other files need editing.
- `Container` widened here (see §2).

**`src/components/marketing/sections/HeroTriage.tsx`** — remove `font-mono` everywhere:
- Header row "stm/triage" + "30s" chip → CUT both (cleaner per the brief's "remove entirely if cleaner"). Keep only the `HelpCircle` icon + small `"Quick triage"` label in Inter uppercase letter-spaced.
- "A/B/C" key chip → keep Inter (no font-mono); just `text-[0.7rem] font-medium`.
- Bottom metric labels (TOOLS / REPLY TIME / AUDIT LOG) → Inter `text-[0.55rem] font-medium uppercase tracking-[0.18em] text-muted-foreground`.
- "None of these → talk to a human" → Inter `text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground`.

**`src/components/marketing/site/Nav.tsx`** — tagline under "Supreme Team Media" is already Inter (good); no change unless it still reads mono — confirm and leave.

Eyebrow above the headline (`Hero.tsx`) is already Inter — confirmed clean, no change.

Net: zero `font-mono` in the hero subtree.

### 2) Widescreen container

**`src/components/marketing/site/primitives.tsx` → `Container`**: change `mx-auto w-full max-w-[1180px] px-6 md:px-10` → `mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-20`. This is the shared container, so all marketing sections inherit the wider canvas in this pass (expected; matches brief's "applied centrally").

**`src/components/marketing/sections/Hero.tsx`**:
- Keep grid 12-col, gap, vertical padding.
- Widen left column: `lg:col-span-7` → `lg:col-span-8` to push the headline closer to the left edge.
- Right column: `lg:col-span-5` → `lg:col-span-4` so the triage card sits toward the right edge.
- No other changes (colors, headline, subhead, CTAs, accents unchanged).

### Out of scope (untouched)
Lead-capture (`Contact`/`submit-inbound-lead`/`inbound_leads`), routing, `/auth` Log in, back-office, color tokens, other section internals.

### Verify
- `rg "font-mono" src/components/marketing/sections/Hero.tsx src/components/marketing/sections/HeroTriage.tsx` → empty.
- Preview screenshot: hero spans viewport with ~5% side padding; headline near left edge; triage card near right edge; no typewriter labels remain.
- tsc clean via auto-build.

### Files touched
- `src/components/marketing/site/primitives.tsx` (Container width, MonoLabel → Inter)
- `src/components/marketing/sections/Hero.tsx` (col spans)
- `src/components/marketing/sections/HeroTriage.tsx` (drop mono, drop stm/triage + 30s tags)

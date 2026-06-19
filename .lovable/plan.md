## Marketing site restyle — carbon / ivory / emerald + typography + dedupe

Visual restyle only. No changes to lead-capture (`Contact` → `submit-inbound-lead` → `inbound_leads` → CRM), routing, Log in, content/copy, or back-office.

---

### 1. Central color system (single source of truth)

All tokens are already scoped under `.stm-marketing` in `src/index.css` (lines 443–658). I'll rewrite ONLY that scoped block — the app/back-office tokens above it are untouched.

**Dark scope (`.stm-marketing` default):**
```
--background: 156 16% 7%    /* #0E1512 warm near-black */
--panel / --card: 152 16% 11%   /* #16201B */
--panel-elevated: 152 15% 13%
--border: 152 16% 17% / strong 152 16% 22%   /* #24332C */
--foreground: 150 12% 94%   /* #ECF1EE */
--muted-foreground: 152 10% 60%   /* #8FA39A */
--accent / --primary / --ring: 162 80% 40%   /* #14B88A emerald */
--accent-soft: 32 95% 58%   /* amber, kept ONLY for warn states */
```

**Light scope (`.stm-marketing .section-light`):**
```
--background: 42 25% 94%    /* #F4F1EA ivory */
--panel / --card: 0 0% 100% /* #FFFFFF */
--border: 40 20% 85%        /* #E2DDD1 */
--foreground: 30 12% 9%     /* #1A1714 */
--muted-foreground: 32 9% 39%   /* #6B6459 */
/* accent inherits emerald */
```

**Dead tokens removed:** `--electric` (199 89% 65%), `--violet` (265 89% 66%), and every hard-coded `217 91% 60%` / `265 89% 66%` / `199 89% 65%` HSL inside `.stm-marketing` utilities (`glow-ember`, `section-alt`, `hover-lift`, `glow-border`, `ring-gradient`, `live-dot` keyframes, `section-light-tint`). Each is replaced with the emerald token so there is no electric blue or violet residue anywhere.

**Hero gradient text** in `Hero.tsx` (`from-electric via-accent to-violet`) is the only component-level color override and will be swapped to a subtle emerald/ivory treatment — single edit, no copy change.

**Result:** every component reads `bg-background`, `text-foreground`, `text-accent`, `border-border`, etc. and inherits the new system. No per-component color edits needed beyond the one Hero gradient line.

---

### 2. Central typography

In the same `.stm-marketing` block (`src/index.css`):

- **Body / default** (`.stm-marketing { font-family: ... }`): Inter — already set, kept.
- **Headlines** (`.stm-marketing .font-display`): Space Grotesk — already set, kept and reinforced. All section headings already use `font-display`.
- **Mono labels** (`.stm-marketing .font-mono-label`, `.eyebrow` variants): JetBrains Mono — kept ONLY for small technical labels (eyebrows, "DAILY BRIEF", "OPERATION SCORE", timestamps, "4/4 CONNECTED").
- **Audit pass**: grep for `font-mono` usage inside `src/components/marketing/**` and downgrade any non-label usages (e.g. hero pill, brand lockup tagline). Specifically:
  - `Nav.tsx` brand lockup name → `font-display`; tagline → small Inter uppercase tracking (drops the blocky mono look). Currently uses mono — this is the only "brand lockup" edit.
  - Any `font-mono` on body paragraphs or large headlines gets removed.

Google Fonts import at the top of `index.css` already loads Space Grotesk + Inter + JetBrains Mono — no new requests.

---

### 3. Scorecard / "one live view" instances — KEEP/CUT audit

Every place I found that renders a scorecard, dashboard mockup, or "one live view" widget:

| # | Location | What it is | Decision |
|---|---|---|---|
| 1 | `Hero.tsx` → `HeroTriage` | Interactive "pick what hurts most" triage card | **KEEP** (routing element, unique) |
| 2 | `ConnectiveLayer.tsx` | Before/After "Disconnected tools → One live view" split | **KEEP** (most persuasive) |
| 3 | `showcase/OpsDashboardShowcase.tsx` | Standalone "Every tool…condensed into one live view" dashboard mockup section | **CUT** (duplicates #2's idea with a mockup) |
| 4 | `WhatIBuild.tsx` top Panel | "Weekly owner scorecard / What a week actually looks like" 4-metric strip above the service grid | **CUT** (duplicates #2; service grid below stays intact) |
| 5 | `Proof.tsx` | BarPulse case study — mentions "4-pillar weekly scorecard" in body copy, no widget | **KEEP** (text only, it's the case study) |

**Cut implementation:**
- Remove `<OpsDashboardShowcase />` import + usage in `src/pages/MarketingSite.tsx` (file itself left on disk, unreferenced — non-destructive).
- In `WhatIBuild.tsx`, delete the top `<Panel>…</Panel>` block (lines ~23–50) and its unused `LiveDot` import; service grid (`items.map(...)`) is preserved verbatim.

Net result: the "one live view" concept appears strongly **twice** — Hero triage + Before/After.

---

### 4. Files touched

- `src/index.css` — rewrite `.stm-marketing` token block + `.section-light` block + scoped utilities (single edit, central).
- `src/components/marketing/site/Nav.tsx` — brand lockup typography swap (mono → display + small sans tagline).
- `src/components/marketing/sections/Hero.tsx` — replace `from-electric via-accent to-violet` gradient with emerald treatment.
- `src/components/marketing/sections/WhatIBuild.tsx` — delete top scorecard Panel.
- `src/pages/MarketingSite.tsx` — remove `OpsDashboardShowcase` import + render line.

Untouched: `Contact.tsx`, contact-form plumbing, edge function `submit-inbound-lead`, `inbound_leads` table, `App.tsx` routing, Log in link, all back-office code, all other marketing section structure/content.

---

### Verify

1. Grep `src/components/marketing` and `.stm-marketing` block for `217 91% 60%`, `199 89% 65%`, `265 89% 66%`, `electric`, `violet`, `#3B82F6` → zero hits.
2. Grep `font-mono` inside marketing → only on small label classes (`font-mono-label`, eyebrow pills, timestamps).
3. `MarketingSite.tsx` no longer imports `OpsDashboardShowcase`; `WhatIBuild.tsx` no longer renders the scorecard Panel.
4. `Contact.tsx` unchanged (diff = 0 lines); routing in `App.tsx` unchanged.
5. `tsc` clean.
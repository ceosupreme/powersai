
# Vertical Landing Pages — /for/:slug

Additive build. No changes to existing routes, RLS, or internal pages. Everything below layers on top of the live marketing design system.

## Part 1 — Schema (single migration)

New table `public.vertical_landing_pages` with columns as specified in the brief:

- Identity: `id uuid pk`, `slug text unique not null`, `display_name text not null`, `status text check in ('draft','published') default 'draft'`, `sort_order int default 0`
- Link to type system: `project_type_id uuid null references public.project_types(id)` — when set, page appends up to 2 leak-vector cards from that type (via existing `project_type_leak_vectors` + override resolver already used by `useEffectiveLeakVectors`)
- Hero: `headline`, `headline_accent_word`, `accent_color text check in ('rust','gold','green') default 'rust'`, `subline`, `stat_value`, `stat_label`
- Body: `leaks jsonb` (array of `{title,line,dollar_note}`), `faq jsonb` (array of `{q,a}`), `proof_line`
- CTAs: `cta_primary_label`, `cta_primary_url`, `cta_secondary_label null`, `cta_secondary_url null`
- SEO: `meta_title`, `meta_description`, `og_image_url null`
- Timestamps + `update_updated_at_column` trigger

GRANTs (must be in the same migration):
- `GRANT SELECT ON public.vertical_landing_pages TO anon, authenticated;` (public read of published rows)
- `GRANT ALL ON public.vertical_landing_pages TO authenticated, service_role;` (admin writes gated by RLS)

RLS (mirrors `portfolio_items` public-read-published pattern):
- `enable row level security`
- Policy `"Public can read published landers"` FOR SELECT USING `status = 'published'`
- Policy `"Admins can read all"` FOR SELECT USING `has_role(auth.uid(),'admin')`
- Policy `"Admins can write"` FOR ALL USING/CHECK `has_role(auth.uid(),'admin')`

Seed the 5 rows verbatim from the brief (plumbing-hvac, auto, carpet-cleaning, moving-hauling, bars-restaurants), all `status='published'`, sort_order 10/20/30/40/50. Seeded via a follow-up insert call after the migration is approved.

## Part 2 — Route + Page

`src/pages/VerticalLanding.tsx` mounted at `/for/:slug` in `src/App.tsx` (public — no auth guard, wrapped in the same `.stm-marketing` shell + `Nav` + `Footer` used by `MarketingSite.tsx`).

Data: React Query fetches the row by `slug` where `status='published'`. 404 → `<Navigate to="/404" />`. When `project_type_id` is set, a second query pulls up to 2 effective leak vectors via the existing resolver (skips silently on empty/error).

SEO: sets `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image` (falls back to sitewide) via the same imperative pattern already in `MarketingSite.tsx` (no new dep).

### Sections (top to bottom, tokens identical to homepage)

a) **HERO** — bone bg with radial gold-tint wash, grain overlay. Mono gold eyebrow `[DISPLAY_NAME] · PROFIT LEAK RECOVERY`. H1 in Bricolage 800 with `headline_accent_word` swapped for `<span class="font-serif-accent" style="color:var(--{accent_color})">` + inline SVG underline stroke in the accent color. Subline in `--ink-soft`. Stat chip: rust mono, `stat_value` in Bricolage-800 rust, `stat_label` under it, footnote "estimated — your audit uses your numbers". Primary CTA green pill → `cta_primary_url` (with `?src=for-[slug]` appended, see Part 3). Secondary CTA rendered only when `cta_secondary_url` is non-null: underlined text-link with sliding arrow.

b) **HOW YOUR MONEY LEAKS** — bone-2. Three `.card-lift` cards from `leaks[]`: title Bricolage-600, line body, `dollar_note` in rust mono. Appends up to 2 additional cards from effective leak vectors when present (name → title, benchmark line → line, empty dollar_note styled as `—`); zero if absent.

c) **HOW IT GETS PLUGGED** — bone. Four-step row DETECT / DOLLARIZE / ASSIGN / VERIFY, gold dotted connector between mono phase badges, one line each. Kicker below in `--ink-soft`: "Nothing replaced. A human approves every send."

d) **PROOF BAND** — `--green-deep` bg, grain, gold radial wash (dark moment, matches the case-study band on homepage). `proof_line` in bone, any figures matching `/\$[\d,]+\/mo|\$[\d,]+K?/` wrapped gold via a small tokenizer. Row of three gold checks: "In production · Multi-location · Source-cited". Text link "See the work →" to `/work` in gold with arrow slide.

e) **FAQ** — bone. Reuses `components/ui/accordion` (already used by homepage FAQ) styled with hairline dividers + gold `+`/`−` glyphs, from `faq[]`.

f) **FINAL CTA** — bone-2. H2 "Let me run the free audit." body "Real money leaking → we talk. Nothing → I tell you straight, and you've lost nothing." Primary CTA repeated (same `?src=` handling).

Motion: reuses existing `Reveal`. No new deps. `prefers-reduced-motion: reduce` respected via the guards already in `src/index.css` under `.stm-marketing`.

## Part 3 — Personalization param (?biz + ?src)

Read `useSearchParams()` for `biz`. Sanitization (documented here as promised):

- Trim, collapse internal whitespace to single space
- Strip all HTML tags via `/<[^>]*>/g`
- Strip control chars and any char not in `[\p{L}\p{N}\s&'.\-]` (Unicode letters, numbers, and common business-name punctuation)
- Cap at 40 chars post-strip; empty result → treat as absent

When present + non-empty:
- Gold mono eyebrow ABOVE the H1: `A NOTE FOR [BIZ]` (rendered via `{biz}`, escaped by React — no `dangerouslySetInnerHTML`)
- Stat chip caption changes to `what this looks like for [BIZ]` (replaces the "estimated — your audit uses your numbers" footnote)

When absent: render nothing extra; footnote stays as spec'd.

`?src=for-[slug]` appended to every primary CTA URL (hero + final). Implementation: URL parse `cta_primary_url`; if relative (`/#contact`) rewrite to `/?src=for-[slug]#contact`; if absolute, append `?src=` or `&src=` depending on existing query. Fragment-only links become `/?src=for-[slug]#…`. Secondary CTA gets no `src` (per brief — primary only).

## Part 4 — Homepage wiring

Chip-link mapping confirmed (only where the chip label sensibly maps to a published lander):

- "Local service businesses" → `/for/plumbing-hvac`
- "Hospitality & restaurants" → `/for/bars-restaurants`
- "Real estate", "Fitness", "Coaches & creators", "Multi-location operators" → remain static text (no matching lander in the 5 seeded rows)

Implemented in `src/components/marketing/sections/Industries.tsx` by promoting matched chips from `<span>` to `<Link>` with the same visual class list; hover state adds `--gold-tint` (unchanged).

Footer (`src/components/marketing/sections/Footer.tsx`): new small mono column "FOR YOUR INDUSTRY", rendered data-driven from a `useVerticalLanders()` hook that selects `slug, display_name` from published rows ordered by `sort_order`. Column added as a fourth cell in the grid (grid becomes `md:grid-cols-4`), mono-labeled, gold hover to match existing link styling. Empty list → column hidden.

## Part 5 — Admin tab "Vertical Landers"

New tab added to `src/pages/Admin.tsx` following the existing Work/Portfolio tab pattern (`portfolio_items` admin surface is the reference). Contents:

- List view: table of rows with `slug`, `display_name`, `status` pill, `sort_order`, actions (edit, publish/draft toggle, "View page" link → `/for/[slug]` in new tab), "New lander" button.
- Editor dialog: fields for every column. `leaks` and `faq` rendered as repeatable row editors (add/remove/reorder) with per-row inputs (`title/line/dollar_note` and `q/a`). `project_type_id` as a select populated from `project_types`. `accent_color` as a segmented control (rust/gold/green). `status` as segmented (draft/published).
- All writes gated by `has_role(auth.uid(),'admin')` via RLS — no extra client-side guard beyond the existing Admin route protection.

## Part 6 — Files touched (all additive)

- Migration: creates `vertical_landing_pages` + GRANTs + RLS + updated_at trigger
- Data insert (separate call, after migration approval): 5 seeded rows verbatim
- New: `src/pages/VerticalLanding.tsx`
- New: `src/hooks/useVerticalLander.ts`, `src/hooks/useVerticalLanders.ts`
- New: `src/components/marketing/vertical/*` — Hero, LeaksGrid, Plugged, ProofBand, FaqBlock, FinalCta section components (self-contained, reuse `.card-lift`, `MockupFrame` not needed here, `Reveal`, `Container`, `Eyebrow`, `LiveDot`)
- Edited: `src/App.tsx` (add `/for/:slug` route)
- Edited: `src/components/marketing/sections/Industries.tsx` (chip → Link for 2 mappings)
- Edited: `src/components/marketing/sections/Footer.tsx` (add For Your Industry column)
- Edited: `src/pages/Admin.tsx` + new admin components under `src/components/admin/vertical-landers/`

## Out of scope

Existing routes, RLS, marketing homepage design tokens, `/qualify/*`, `/q/:venueSlug`, `/work` — untouched.

Awaiting approval to build.

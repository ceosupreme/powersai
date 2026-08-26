# Eleven-Section Vertical Landing Template

Extend `/for/:slug` from six sections to eleven, all driven by the database row plus an optional shared "family" row. Additive only: every new field is nullable and every new section renders only when its data exists, so the five published rows (plumbing-hvac, auto, carpet-cleaning, moving-hauling, bars-restaurants) look identical to today.

## Database

New table `public.vertical_landing_families`: `family_key` (text PK), `display_name`, `tour_features` jsonb, `included_features` jsonb, `how_it_works` jsonb, `live_in_line` text, `proof_line` text, `faq_base` jsonb, `guarantee_line` text, `math_config` jsonb, `created_at`, `updated_at`.

RLS mirrors the existing landing-page posture (verified on `vertical_landing_pages`): public/anon SELECT, plus admin-only ALL via `has_role(auth.uid(), 'admin')`. GRANTs: `SELECT` to `anon` and `authenticated`, `ALL` to `service_role`.

New nullable columns on `public.vertical_landing_pages` (no existing column touched): `family_key` (FK to the new table), `video_url`, `leaks_heading`, `tour_features`, `included_features`, `how_it_works`, `live_in_line`, `math_config`, `free_check_line`, `price_block`, `guarantee_line`.

No rows seeded, no family rows created, no defaults invented.

## Resolution rule

One resolver next to the hook: for `tour_features`, `included_features`, `how_it_works`, `live_in_line`, `proof_line`, `guarantee_line`, `math_config` — page value if not null, else family value, else null (section hidden). For FAQ — family `faq_base` items first, then page `faq` items. `useVerticalLanderBySlug` gains a sibling query that loads the family row when `family_key` is set. `?biz=` sanitizing and `src=for-<slug>` attribution stay exactly as they are.

JSON shapes are documented as a comment block in the hook file so future rows are authored consistently.

## Sections, top to bottom

1. **Hero** — unchanged, except when `video_url` exists and no secondary CTA is set: a "See it work" button that scrolls to the video anchor.
2. **Video** (new, `id="video"`) — responsive 16:9; YouTube/Loom render as an iframe, a direct `.mp4` renders as a native video with controls.
3. **Problem** — existing leaks grid; `leaks_heading` overrides the hard-coded heading when present.
4. **Product tour** (new) — one card per feature: large lazy-loaded screenshot first (especially on mobile), then title, body, and the caption as a short outcome line.
5. **Everything else included** (new) — compact list, two columns desktop / one mobile.
6. **How it works** — existing steps row; when resolved `how_it_works` exists, render those numbered steps plus `live_in_line` as an emphasized line; otherwise today's hard-coded steps.
7. **The math** (new) — client-side calculator. Per block: `formula_text` printed plainly, editable inputs seeded from defaults (percent shown as whole percent, computed as a fraction; currency formatted with the existing `formatDollars`), a block estimate, then a page total. Every dollar figure carries the word "Estimated" on the number itself. "Reset to benchmarks" restores defaults. No network calls, no writes.
8. **Proof** — existing proof band, reading resolved `proof_line`.
9. **The free check** (new) — one line plus a link to `/free-audit` carrying `src=for-<slug>` and the sanitized `?biz=` when present.
10. **Pricing** (new) — intro, tier cards (name, setup and monthly labels, includes list, optional badge, CTA), footnote, then resolved `guarantee_line` emphasized.
11. **FAQ** — existing accordion, reading the resolved FAQ list.

Final CTA and footer unchanged.

## Metadata

Per-route head logic in the page stays as-is. In `index.html` the root title, description, `og:title`/`og:description`, and `twitter:title`/`twitter:description` are replaced with the Revenue Recovery Systems copy provided. `og:image` / `twitter:image` left untouched.

## Admin

An editor already exists (`src/components/admin/VerticalLandersTab.tsx`). It gains inputs for the new scalar fields and raw-JSON textareas for the new jsonb fields (invalid JSON blocks save with an inline error), plus a minimal families editor for the new table.

## Technical notes

- Files changed: one migration; `src/hooks/useVerticalLander.ts` (family fetch + resolver + shape docs); `src/hooks/useVerticalLanders.ts` (types, families CRUD); `src/pages/VerticalLanding.tsx` (section wiring); `LeaksGrid.tsx`, `PluggedRow.tsx`, `VerticalHero.tsx` (optional props, backward-compatible defaults); new components under `src/components/marketing/vertical/` for Video, ProductTour, IncludedFeatures, MathBlock, FreeCheckLine, PricingBlock; `src/components/admin/VerticalLandersTab.tsx` and a new families tab card; `index.html`.
- Untouched: `/free-audit`, `run-public-audit`, `compute-leak-stack`, the leak stack page, all other RLS, the approval/send pipeline, and the route table (no second landing route).
- Verification: query `information_schema.columns` for both tables and `pg_policies` for the new table, typecheck clean, and screenshot all five published rows at desktop and 390px to confirm no new sections appear.

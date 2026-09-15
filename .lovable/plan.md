# Phase 2 — Work pages, filters, and the hiring page

Builds on the studio homepage from phase 1. Same paper/ink/cobalt art direction, same header and footer, no backend, auth, database, or deployment changes.

## What you'll be able to do

- Browse `/work` and filter by Websites & apps, Brand & creative, Marketing & growth, AI & systems, or All. The choice lives in the web address, so it can be shared and the browser back button restores it.
- Open any project page and read its classification, short brief, Sean's role, work delivered, and what it demonstrates — with the approved wording exactly as supplied.
- Visit a new public page at `/hire`: Sean's introduction for employers and contract work, with evidence across creative, marketing, and systems work, the advertising degree, 2002 start year, and the correct LinkedIn link.
- On `/hire`, "Discuss a role or contract" jumps to the homepage contact form with hiring context already selected.

## Work index (`/work`)

- Restyle with the existing studio header/footer and typography (already partly in place from phase 1; this phase adds filters and full case detail).
- Filter row rendered as real buttons, keyboard reachable, 44px targets, with a screen-reader status line reporting how many projects are shown.
- Filter state stored as `?category=websites-apps | brand-creative | marketing-growth | ai-systems`; anything unrecognised falls back to All. Back/forward restores the previous selection.
- A category button only appears when at least one real project belongs to it. No filler projects are invented.
- Distinct loading, load-failure, and genuinely-empty states. A failed load says so plainly instead of implying there is no work.

## Case pages (`/work/:slug`)

- Each case shows: name, classification/status, brief, Sean's role, work delivered, what it demonstrates, status note, and a media plate.
- Approved labels stay exactly as briefed: Sylina Renae — website project; Coastal Beauties — owned brand / historical work; BarPulse — historical eight-venue client implementation; Ritual Command Center — demonstration using labelled sample data. No present-tense "8 venues live" claims, no invented metrics or testimonials, no venue or staff names.
- Case body text from the content system keeps rendering as safe text, never raw HTML.
- "Visit website" or demo buttons appear only where an approved, configured destination exists. Today none is configured, so no external buttons render and each case stays fully usable without one.
- Unknown slug shows the real not-found page (already in place) with a link back to all work.
- Back link returns to `/work` preserving the filter you came from.

## Hiring page (`/hire`)

New route, public, same shell. Content:

- Title: "Sean Mayo — Strategy, creative work, and hands-on implementation."
- The supplied intro and the "for employers and teams" context line.
- Evidence grid drawing on the same project data: BarPulse (systems), Coastal Beauties (brand and marketing), Sylina Renae (web), Ritual (prototyping) — each with its accurate label, linking to its case page.
- Credentials: Bachelor's degree in Advertising, The Art Institute of California; Supreme Team Media founded 2002; LinkedIn profile link.
- Primary button: "Discuss a role or contract" → `/?intent=hiring#contact` (the form already reads that and preselects hiring context).
- Résumé: no approved PDF exists in the project, so the page shows "Request résumé" opening an email to ceosupreme@gmail.com with a suitable subject. A download button appears only if a real approved PDF is later added. No dead download, no external sandbox link.
- No personal financial, medical, or family content; no "all roles accepted" framing.
- Footer and header links to `/hire` are enabled in this phase (they were withheld in phase 1).

## Technical notes

- One shared adapter: `src/hooks/useStudioProjects.ts` is refactored to consume the retained `usePublishedPortfolioItems` / `usePublishedPortfolioItemBySlug` hooks rather than its own duplicate query, keeping published-only behaviour and the separate error/empty signalling. Homepage, work index, case pages, and `/hire` all read through it.
- Editorial fallbacks in `src/content/studioProjects.ts` merge only when the matching published slug is absent; published canonical slugs win; per-entry `enabled` flags remain. No seeds, no migrations, no draft/private queries, no admin overwrites.
- Filters use `useSearchParams` so history integration is native.
- New files: `src/pages/Hire.tsx`, `src/components/marketing/studio/WorkFilters.tsx`, `src/components/marketing/studio/CaseDetail.tsx`, and a small no-op analytics adapter `src/lib/studioAnalytics.ts` (events: service_selected, project_opened, inquiry_started, inquiry_submitted, hiring_interest, resume_download) that sends nothing anywhere and records no names, emails, or message text — tracking is documented as inactive because no analytics destination is installed.
- Edited: `src/App.tsx` (add `/hire`), `src/pages/Work.tsx`, `src/pages/WorkCaseStudy.tsx`, `src/hooks/useStudioProjects.ts`, `StudioHeader.tsx` / `StudioFooter.tsx` (enable `/hire`), `index.html` untouched apart from nothing — per-route titles handled by the existing head helper.
- Routes after this phase: `/`, `/work`, `/work/:slug`, `/hire`. All internal app routes, `/free-audit`, vertical, qualifier, and report routes untouched.

## Assets

- Required: none. Every case renders a finished typographic scope plate.
- Optional, addable later: project screenshots and the founder portrait via the single media registry `src/config/studioMedia.ts`; approved external project URLs; an approved résumé PDF; a social share image.

## Verification before reporting

Browser checks at 375, 390, 768, 1440px: homepage work links, each category deep link plus back/forward, case pages and back navigation, unknown slug, `/hire` buttons and mailto fallback, mobile menu on every route, `/free-audit` still loading. Production build and type check. No deployment.

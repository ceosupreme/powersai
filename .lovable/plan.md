# Supreme Team Media — Foundation and homepage plan

## Goal

Replace the signed-out homepage with the attached founder-led creative, marketing, and technology studio presentation while leaving the operating app, authentication, protected routes, backend, and integrations unchanged.

Pre-build checkpoint: Git revision `e1e3444113a784c4ac1f81a8bf220b84f1e19682` with a clean working tree. No production deployment.

## Build

1. **Create an isolated public studio system**
   - Add the new public components under `src/components/marketing/studio`.
   - Add a `.stm-studio`-scoped warm-paper, ink, cobalt, pale-blue, dark-band, lilac, sand, and green token set without altering the internal app theme.
   - Add shared layout, typography, buttons, focus states, reduced-motion behavior, anchor offsets, and finished no-image project plates.
   - Add one media configuration module for later image replacement; no generated or stock imagery now.

2. **Replace the signed-out homepage in the exact specified sequence**
   - Shared header and accessible mobile menu.
   - Typographic hero with the exact `Stand out. / Get chosen. / Work smarter.` copy and DESIGN / BUILD / GROW / CONNECT composition.
   - Compact scope strip.
   - Selected work with four approved, accurately labeled project plates.
   - Four numbered capability rows with contact preselection.
   - Dark BarPulse historical-implementation feature.
   - Three-step process and three engagement types.
   - Sean Mayo founder section with a typographic nameplate.
   - Six-item FAQ.
   - Restyled project inquiry using the existing real submission handler.
   - Shared footer with Work, capabilities, about, inquiry, hiring, free checkup, login, and the approved LinkedIn URL.
   - Preserve aliases for `#proof`, `#how-we-help`, and `#how-it-starts`, alongside `#work`, `#services`, `#process`, `#about`, and `#contact`.

3. **Add the shared public project-content adapter**
   - Continue querying only `portfolio_items` rows where `status = 'published'`.
   - Merge those rows with only the four approved editorial summaries: `sylina-renae`, `coastal-beauties`, `barpulse`, and `ritual-command`.
   - Prefer an existing published canonical slug, deduplicate by canonical slug, and apply the brief’s corrected historical / owned-brand / sample-data classifications in public presentation only.
   - Route every homepage plate to a real `/work/:slug` page. Do not seed or rewrite database records and do not expose draft/private work.
   - The current published query returns zero rows, so the four approved summaries will be the initial public set.

4. **Provide the minimum shared work-page presentation required by this phase**
   - Move `/work` and `/work/:slug` onto the same `.stm-studio` header, footer, content adapter, media config, and editorial visual language.
   - Ensure the four approved cases have usable detail pages with their exact supplied brief, role, work, demonstration, and status content.
   - Keep safe text rendering, approved external URLs only, and a proper not-found state for unknown slugs.
   - Full URL-backed filtering and expanded work-index refinements remain for the later work-page prompt.

5. **Preserve and harden the real inquiry path**
   - Reuse `submit-inbound-lead`; no fake success, backend change, migration, or new function.
   - Keep required name/email/message, optional business name, honeypot, validation, field preservation, and duplicate-submit blocking.
   - Submit general inquiries with no invented `project_type` or `captured_for_project_id`; use accepted `qualifier_data`, `conversation_channel: 'form'`, and `route_to: 'self'` where needed.
   - Treat success as confirmed only when there is no invocation error and the response contains `ok === true` plus an ID.
   - Adapt the section copy and appearance now; the expanded multi-select and budget/timing refinement stays with Prompt 3.

6. **SEO and route safety**
   - Preserve the homepage’s existing signed-in redirect to `/portfolio`.
   - Keep `/portfolio` internal and leave all protected and existing public routes unchanged.
   - Update root title, description, canonical, Open Graph text, and Twitter text to the supplied studio positioning; remove reliance on a nonexistent/new image asset.
   - Add route-specific metadata handling for the public work pages without changing internal access.
   - The `/hire` page itself is not built in this foundation prompt; its dedicated implementation remains for the later hiring-page prompt. Until then, avoid introducing a broken primary navigation path.

7. **Verification**
   - Run the production build and TypeScript check.
   - Test signed-out `/` at 375, 390, 768, and 1440px for layout, overflow, readable text, anchor offsets, keyboard focus, and mobile-menu Escape/focus behavior.
   - Verify the four homepage project links and unknown-case not-found behavior.
   - Smoke-test `/free-audit`, `/for/:slug`, `/qualify/:slug`, `/q/:venueSlug`, `/r/:token`, `/login`, and the signed-in homepage redirect without changing their behavior.
   - Perform one controlled real inquiry only if an owner-approved test submission is appropriate; otherwise verify validation and the request contract without creating a record, and report that limitation plainly.
   - Report changed files, checkpoint revision, preview behavior, and actual blockers. Do not publish.

## Confirmed implementation facts

- `/` currently renders `src/pages/MarketingSite.tsx` and redirects authenticated users to `/portfolio`.
- `/work` and `/work/:slug` already exist; `/portfolio` is a separate protected owner route.
- Public work hooks already constrain reads to `status = 'published'`; the current published result is empty.
- `submit-inbound-lead` accepts the current contact fields plus optional `qualifier_data`, `conversation_channel`, and `route_to`; successful inserts return `{ ok: true, id }`.
- No existing visitor analytics destination was found, so this phase will not install or claim analytics tracking.
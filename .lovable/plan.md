# Consolidated public-site refinement

## Build
- Create a complete `/pricing` decision page using the approved prices, existing checkout controls, ownership terms, questions, and attributed inquiry path.
- Replace homepage and Websites-page offer blocks with concise pricing links while keeping starting prices visible.
- Add `/startups` with a four-stage selector, client-side readiness diagnostic, immediate useful results, real portfolio work, and the existing attributed inquiry form.
- Rewrite code-owned public sales language for buyer clarity without changing prices, facts, database content, legal constraints, forms, or business logic.
- Correct About and Terms wording, remove legal links from the primary header, and retain legal links in the footer.
- Replace the generated map with an accurate accessible OpenStreetMap treatment and text fallback.
- Add the requested stable media slots and use each when supplied, preserving the existing native visuals when absent.

## Discoverability and rendering
- Add routes, shared metadata, sitemap entries, header-service and footer links for Pricing and Startups.
- Extend the post-build process to render usable public-page HTML for core marketing and published industry routes, while leaving a safe SPA fallback on individual render failures.
- Exclude private and authenticated application pages.

## Verification
- Run type-check and production build.
- Check signed-out desktop and phone views for `/`, `/pricing`, `/startups`, `/services/websites`, `/about`, `/terms`, and one industry page.
- Verify checkout attribution remains intact, startup results require no network write, and generated public HTML contains page content.
- Do not publish.

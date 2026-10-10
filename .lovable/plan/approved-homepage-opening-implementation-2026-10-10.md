# Approved homepage opening implementation

## Scope
- Replace the actual homepage header and hero only, then add the approved credibility strip and first Services section before the existing `AfterClick` section.
- Keep the signed-in redirect, hash-anchor behavior, attribution, all sections from `AfterClick` onward, footer, private HQ, auth, pricing, checkout, forms, database, and integrations unchanged.
- Keep `/_review/home-hero` intact and unpublished. Do not publish the site.

## Approved assets
- Upload the supplied desktop, 1280px, and mobile chess artwork, STM mark, five service icons, and three credibility icons to stable project media pointers.
- Use the approved JPG only as a visual reference. Do not ship the reference-only raster buttons or callout labels; rebuild their text and controls as accessible HTML/CSS.
- Register the production artwork through named public-site media entries so future replacements continue using the existing media convention.

## Homepage opening
- Add a homepage-only dark header using the supplied STM mark plus live company name and brand line.
- Preserve real links for Services, Industries, Work, Packages (`/pricing`), and About. Keep industry links database-driven. Since no public Blog route exists, retain Blog only as a disabled future configuration entry, not a clickable dead link.
- Make both Contact Us controls open one compact accessible contact panel. Use the verified `hello@supremeteammedia.com`; keep phone absent because no public business number is configured.
- Build the approved hero with the exact eyebrow, headline breaks, gold italic “income.”, short subhead, Contact Us action, and attributed `/free-audit` action.
- Place the responsive chess artwork, three live cyan-edged callouts, and SVG connector paths in one proportional scene. Use only restrained CSS/SVG motion, stop decorative animation within five seconds, and honor reduced-motion.

## Credibility and Services
- Add the compact three-item credibility row using supplied icons and live text. Keep the two unverified mockup metrics visibly labeled as sample figures and record that they must be approved or replaced before publishing.
- Add `#services` with the exact heading and five simple dark cards: Web Design, Marketing, Sales, CRM, Automation.
- Link Web Design to `/services/websites`, Marketing to `/services/marketing`, Automation to `/services/ai-systems`, and Sales/CRM to `/services/ai-systems` with `intent=sales` or `intent=crm`; never use private `/sales` or `/crm` routes.
- Scope all new styling to this homepage opening so shared headers, later homepage sections, service pages, and HQ remain visually unchanged.

## Responsive and accessibility requirements
- Preserve the hand, crown, king base, headline, and controls without overlap or horizontal overflow.
- Use the supplied mobile crop rather than shrinking the desktop composition; stack copy, scene, credibility, and service cards legibly at narrow widths.
- Keep text live, touch targets at least 44px, decorative layers non-interactive, and menu/contact focus, Escape, and focus return working.

## Documentation and verification
- Add a short scoped implementation note covering asset mappings, route/link mappings, the missing phone, and sample-figure publication blockers; update the roadmap with this completed opening only.
- Run one focused TypeScript check and one normal production build. Do not start a separate browser-testing pass, submit forms, activate contact links, test checkout, or publish.

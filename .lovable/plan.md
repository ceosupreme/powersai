# Publishing & Launch public service page

## Goal
Add a public `/publishing` service page and entry points that position publishing as a packaged combination of the existing DESIGN / BUILD / GROW / CONNECT disciplines, without altering the four-lane hero or Interactive Studio Map.

## What will change

### Navigation and homepage entry point
- Add **Publishing** after Capabilities and before Process in the shared desktop/mobile navigation, switching the desktop navigation breakpoint to `lg` if required to preserve readable labels and touch targets.
- Add **Publishing & Launch** to the footer while keeping **Hiring Sean?** out of the primary navigation.
- Add a distinct, unnumbered Publishing & Launch feature below the four existing capability rows with the supplied headline, body, format line, and `/publishing` link.

### Publishing page
- Add `/publishing` inside the existing public studio shell with matching header, footer, typography, tokens, spacing, focus treatment, and reduced-motion-safe reveal behavior.
- Build the supplied hero and an original decorative inline SVG/CSS composition showing a book/eBook, app screen, and release listing connected together; it will be non-interactive and accessibility-hidden.
- Add the two main publishing tracks, smaller digital-publications track, four-step process, inclusion list, four-discipline explanation, six-item FAQ, and three-option final action area using the supplied factual copy and caveats.
- Link the primary and final actions to `/?intent=publishing#contact`; keep the secondary hero action anchored to `#publishing-tracks`.

### Contact integration and metadata
- Extend the existing allowlisted service model with `publishing-launch`, labeled **Publishing / launch**, before **Not sure yet**.
- Treat `?intent=publishing` as a safe preselection only; it will not alter or erase the visitor’s project note.
- Keep the current `qualifier_data.services`, general-site routing, save behavior, and owner notification flow unchanged.
- Set the supplied title, description, and self-referencing canonical for `/publishing`.

## Technical details
- Add one focused page component and one decorative publishing illustration component under the existing studio scope.
- Reuse existing public primitives, Accordion, StudioReveal, navigation, footer, service-intent utilities, and route-head helper.
- Add only local studio presentation styles if the new visual needs them; no packages, backend changes, schema changes, analytics, or internal-app edits.
- Update the roadmap only to track this requested addition.

## Verification
- Run the TypeScript check and production build.
- Browser-check `/publishing` at 375, 390, 768, 900, 1024, and 1440px.
- Verify desktop/mobile navigation breakpoint behavior, menu focus and Escape, both page anchors, publishing contact preselection, visible focus, reduced motion, semantic heading order, and no horizontal overflow.
- Smoke-check `/`, `/work`, `/hire`, and `/free-audit`; do not submit the live inquiry form and do not publish.

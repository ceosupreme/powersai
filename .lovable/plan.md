# Homepage opening exact-match refinement

## Scope
- Refine only the existing real homepage opening: its dedicated header, chess hero, credibility strip, and first Services section.
- Preserve every homepage section from `AfterClick` onward, plus all current routes, inquiry flows, checkout, attribution, private HQ, authentication, backend data, and the unpublished review route.
- Keep the work unpublished.

## Visual recreation
- Keep the supplied chess artwork as the primary visual rather than replacing it with a less exact generated scene.
- Recreate the reference’s warm copper-gold pill actions, dark editorial header, denser hero details, cyan circuit lines, dimensional callouts, ivory credibility strip, and five-card Services presentation.
- Create supporting graphics as lightweight CSS, inline vector paths, and existing approved icons so they remain crisp, responsive, and theme-scoped. No baked-in text graphics.
- Add the reference-style micro-benefit row and handwritten visual accent while keeping all text live and accessible.

## Header and contact
- Add the `Resources` presentation only if it can point to an existing valid public destination; otherwise omit it rather than create a dead link.
- Keep Services, database-driven Industries, Work, Packages, About, and Contact Us connected to their current valid behavior.
- Restyle Contact Us as the copper-gold pill and retain the same accessible direct-contact panel.
- Do not add `(858) 503-1234`: the current project has no verified public phone, so the honest phone-pending state and configured email remain authoritative.

## Interactive 3D hero tiles
- Upgrade Marketing, Web Design, and AI Automation into detailed dimensional service tiles with approved icons, short supporting lines, satin/glass depth, and connected cyan paths.
- Track fine-pointer movement relative to the hero and animate each tile at a different depth using perspective, translation, and restrained tilt.
- Smooth movement with requestAnimationFrame interpolation and return tiles gently to rest when the pointer leaves.
- Keep connectors visually attached as the tiles move.
- Disable pointer movement on touch devices and whenever reduced motion is active; pause frame work while the hero or document is not visible.

## Credibility and Services
- Rebuild the credibility band in the reference’s six-part rhythm, but keep claims truthful: do not introduce “Trusted Since 2001,” nationwide service, or any other unsupported fact.
- Keep `500+ businesses` and `4.9 client satisfaction` visibly identified as unapproved sample figures, as required by the current implementation note.
- Expand the five service cards with the approved icons, concise customer-language descriptions, and existing public destinations. Add the reference-style Explore All Services action to the existing Services destination.
- Preserve Web Design, Marketing, Sales, CRM, and Automation ordering and never link to private `/sales` or `/crm` routes.

## Responsive and accessibility
- Match the reference composition on wide screens while maintaining clean reflow at 1024px, 390px, and 360px.
- Keep both Contact Us actions immediately available, all three hero tiles readable, all five Services cards unclipped, and the mobile page free of horizontal scrolling.
- Maintain 44px touch targets, keyboard operation, visible focus, accessible menus/dialogs, and reduced-motion behavior.

## Technical details
- Confine implementation to `HomeOpening.tsx` and its scoped stylesheet; update the opening documentation/roadmap only where the refined behavior or remaining claim blockers must be recorded.
- Reuse named `studioMedia` entries and supplied production assets. Add a new generated bitmap only if inspection proves the supplied source cannot achieve the approved composition; otherwise avoid unnecessary asset replacement.
- Run the focused TypeScript check and one standard production build, then inspect the rendered homepage opening at desktop and mobile sizes. Do not publish.

# Homepage hero card illustrations

## Scope
- Keep the current hero structure, copy, controls, four-card grid, card colors, spacing, and height unchanged.
- Replace only each card’s decorative artwork with a compact inline SVG: design composition, responsive screens, campaign pair, and connected-system diagram.
- Keep all SVGs decorative (`aria-hidden`) and preserve every existing text label as HTML.

## Implementation
- Add four small local illustration components beside the hero card configuration.
- Use a shared SVG geometry/stroke treatment and each card’s inherited palette, with no images, packages, links, hover-only content, or animation.
- Position the illustrations between the large card word and service description without changing the desktop/mobile card arrangement.

## Verification
- Check the rendered hero at 1440px and 390px.
- Check 375px specifically for overlap, clipping, broken layout, or horizontal overflow.
- Run the existing TypeScript and production build checks.

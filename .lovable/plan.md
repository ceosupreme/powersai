# Public studio showcase enhancements

## Goal
Add a restrained interactive proof layer to the existing Supreme Team Media public site while preserving the current hero, portfolio facts, inquiry flow, routes, backend, and internal app.

## What will change

### 1. Project cards and real work presentation
- Refine the shared project card used on the homepage and `/work` with a compact browser frame around each existing screenshot.
- Add a truthful **Live** status treatment only for projects whose existing status is “Live website” or “Live product site.”
- Keep the case link prominent as **View case** and add a visible **Visit site ↗** action only when the approved live URL already exists.
- Add compact category chips using the existing project categories.
- Apply a very small screenshot drift/scale on card hover and keyboard focus, with a static reduced-motion version.
- Preserve six homepage projects, all seven projects on `/work`, URL filters, back-state behavior, and editorial fallback plates.

### 2. Interactive studio map
- Add a new homepage section between Capabilities and BarPulse with the supplied heading and four service-family tabs.
- Implement real accessible tabs with correct roles/states, roving keyboard focus, Home/End support, and arrow-key selection.
- Each lane will show the approved starting point, concrete actions, deliverables, and links to the specified real case pages.
- Add a lane-specific contact action that uses the existing safe service-intent event and scrolls to the existing inquiry form without changing typed text.
- Use restrained CSS transitions only; the mobile control will use a stable 2×2 layout without page overflow.

### 3. BarPulse systems demonstration
- Keep the current careful historical wording and both existing calls to action.
- Add the existing real BarPulse screenshot in a polished browser frame on the right side of the dark band.
- Add a clearly labeled **Historical integration example** flow: Toast POS + 7shifts + Asana → BarPulse → Brief / Tasks / Insights.
- Integrate the existing Discovery / Integration / Refinement content into the same visual composition.
- Use a subtle traveling pulse only when reduced motion is not requested.

### 4. Restrained public-site motion
- Add a small reusable reveal treatment for major homepage sections using opacity and vertical movement only.
- Ensure content remains visible without JavaScript/observation support and becomes static under reduced-motion preferences.
- Keep motion local to the public studio scope and avoid new packages.

## Technical details
- Reuse `ProjectPlate`, `studioMedia`, project category data, the existing service-intent event, and the current warm-paper/ink/cobalt tokens.
- Add small focused presentation components for the browser frame, capability tabs, BarPulse flow, and reveal behavior.
- Use the existing design-system `Button` for tab controls and commands; keep links semantic for navigation.
- No changes to project copy/data, contact submission logic, notifications, auth, backend, database, analytics, routing, hero content, or internal screens.

## Verification
- Run the TypeScript check and production build.
- Browser-check `/`, `/work`, one case page, and `/hire` at 1440px, 390px, and 375px.
- Verify tab arrow keys and states, visible focus, reduced-motion behavior, real links, screenshot loading, filters/back navigation, and no horizontal overflow.
- Record any pre-existing warnings separately and do not publish.

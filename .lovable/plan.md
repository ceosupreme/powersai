## Why sidebar items are missing

The app is in "owner-only monitoring mode" (`src/config/ownerMode.ts → enabled: true`). That deliberately hides three sidebar sections in `PortfolioLayout` (the layout admins use) and trims `PortfolioBottomNav` on mobile:

- **Tools** — Tasks, Logs, Chat
- **Marketing** — Marketing, Social Media
- **Pillars** — Revenue, Labor, Operations, Guest Experience

`PortfolioLayout` reads the raw `ownerMode` flags, so even admins get the trimmed view. There is already a `useOwnerMode()` hook that opens every section when an admin is in **Preview** mode — we just need it to also open them whenever the current user is an admin (preview or not), and to thread that into the bottom nav.

## Fix (3 small edits)

1. **`src/hooks/useOwnerMode.ts`** — open all flags when `isAdmin` too.
   - Import `useAuth` and short-circuit with the same "all true" object whenever `isAdmin || isPreview || !ownerMode.enabled`.

2. **`src/components/layout/PortfolioLayout.tsx`** — stop reading `ownerMode` directly; use `useOwnerMode()`.
   - Replace `import { ownerMode } from '@/config/ownerMode'` with `import { useOwnerMode } from '@/hooks/useOwnerMode'`.
   - `const flags = useOwnerMode();` and swap the three `ownerMode.show*` checks for `flags.show*`.
   - Effect: admins now see Tools, Marketing, and Pillars sections in the desktop sidebar.

3. **`src/components/layout/PortfolioBottomNav.tsx`** — show the hidden routes to admins on mobile.
   - Add admin-only secondary items: Weekly Review (already conditional), plus Tasks, Logs, Chat, Marketing, Social Media, Sales, Labor, Operations, Guest Experience — appended into the existing **More** sheet so the bottom bar itself stays uncluttered.

## Notes / not changed

- **Routes are not blocked for admins today.** `ProtectedRoute` already bypasses role gating for admins, and the pillar/tools routes are registered globally — admins can already reach them by URL. This fix only restores them to navigation.
- **`ownerMode.enabled` stays `true`** so non-admin roles continue to see the trimmed executive view. We are *not* turning off owner mode globally; we are only making admin a full-access exception, consistent with how preview mode already works.
- **No DB / RLS / migration changes.** All gates downstream (`canAccessPage`, `user_can_access_page`, `user_has_bar_access`) already return `true` for admins.

## Verification

After implementation, hard-refresh the app as the admin user and check:
- Desktop sidebar shows MAIN + Tools + Marketing + Pillars sections.
- Mobile bottom nav's **More** sheet lists every hidden route.
- Navigating to `/tasks`, `/logs`, `/sales`, `/marketing`, etc. opens the page (not a redirect).

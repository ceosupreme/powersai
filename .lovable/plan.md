## Goal
Add a dark/light/system theme toggle button to the app UI so users can switch themes. The infrastructure (`next-themes`, CSS tokens, `user_preferences.theme` column, and `useUserPreferences` hook) already exists.

## Plan

1. **Create `ThemeToggle` component**
   - Uses `useTheme` from `next-themes` to read/set the active theme.
   - Syncs changes to the `user_preferences` table via the existing `useUserPreferences` hook.
   - UI: a compact button (Sun/Moon icon) in the header, or a dropdown for light/dark/system.

2. **Wire theme preference on app load**
   - In `App.tsx` (or a small wrapper), read the user's saved `theme` from `useUserPreferences` after auth loads and call `setTheme()` from `next-themes` so their preference is restored on login.

3. **Place the toggle in `GlobalHeader.tsx`**
   - Add the `ThemeToggle` to the right-hand cluster of header actions (next to Search / New Task / Notifications), so it appears across all app layouts that use `GlobalHeader`.

4. **Ensure `defaultTheme` respects user preference**
   - Keep `enableSystem` active so new users get their OS preference by default, but logged-in users with a saved preference override it.

## Out of scope
- No database schema changes (column already exists).
- No new dependencies (`next-themes` and `lucide-react` already installed).
- No changes to marketing-site scoped styles (`.stm-marketing`).

## Files to change
- `src/components/layout/ThemeToggle.tsx` (new)
- `src/components/layout/GlobalHeader.tsx` (add toggle)
- `src/App.tsx` (sync saved preference on load)

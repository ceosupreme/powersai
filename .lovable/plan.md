## Goal
When an owner/admin lands on `/portfolio` and their setup is incomplete, greet them with a clear "start here" surface that reuses existing components (SetupWizard, Launch Checklist, Build A venue onboarding). Stop nagging once they've progressed or dismissed.

## Approach
Add one new component — `PortfolioGetStartedCard` — rendered at the top of `PortfolioOverview.tsx`, gated by an `useGetStartedState` hook that aggregates the existing signals. No new onboarding framework, no new tables, no changes to staff/shift landing.

## Detection Signals (all reused)
Setup is considered **incomplete** when ALL of the following are true:
- `useHelpState().setupDismissed === false` (SetupWizard never completed or skipped), OR
- No venue has `useVenueLiveStatus().isLive === true` across `accessibleBars` (checked via per-venue `venue_onboarding_progress` rows), OR
- `useChecklist().completedKeys.length === 0` (Launch Checklist never touched)

User is **owner/admin only** (via `useRole()` / `useAuth()` role check — gm/staff/shift unchanged).

Dismiss signal: a new key `"portfolio_get_started"` written via `useHelpState().dismiss()` (reuses existing `dismissed_keys` array — no schema change).

The greeting auto-hides when ANY of the following become true:
- At least one venue is live, OR
- `setupDismissed === true` (wizard completed or skipped), OR
- User dismissed the card explicitly, OR
- Checklist has ≥1 completed item AND ≥1 venue exists

## Files

**New:** `src/hooks/useGetStartedState.ts`
- Aggregates signals above; returns `{ shouldShow, hasVenues, anyVenueLive, setupDone, checklistStarted, dismiss }`.
- Queries `venue_onboarding_progress` once for all accessible venue IDs (single supabase call) and computes `anyVenueLive` using the same step-key logic as `useVenueLiveStatus`.

**New:** `src/components/portfolio/PortfolioGetStartedCard.tsx`
- Friendly welcome card with heading "Welcome — let's get your first venue live".
- 3 primary CTAs:
  1. **Set up your first venue** → opens existing Build A venue wizard (navigates to `/portfolio` venue add flow / opens `VenueOnboardingWizard`)
  2. **Take the tour** → calls `useHelpState().relaunchSetup()` to re-open SetupWizard
  3. **View the launch checklist** → navigates to `/launch`
- Dismiss "×" button → calls `dismiss("portfolio_get_started")`.
- Shows tiny progress hint: e.g. "0 of N venues live · Tour not started · Checklist 0/X".

**Edit:** `src/pages/PortfolioOverview.tsx`
- Render `<PortfolioGetStartedCard />` at the very top of the returned JSX (above existing snapshot widget). Component self-hides when `shouldShow === false`. No other Portfolio content changes.

## Non-Goals / Constraints
- No new tables, no schema migration (reuses `user_help_state.dismissed_keys`).
- No changes to SetupWizard, Launch Checklist, Help Center, or Build A wizard.
- No auto-opening of SetupWizard (avoid double-modal on first login — SetupWizard already auto-shows for fresh users via its own gate). Card just provides a clear "Take the tour" re-entry.
- Staff/shift layouts untouched.
- Re-open paths from Help/guidance area preserved as-is.

## Verification
1. Fresh owner login → Portfolio shows welcome card with 3 CTAs.
2. Complete SetupWizard OR mark a venue live OR dismiss card → card disappears on next render.
3. Re-open SetupWizard + Launch Checklist still reachable from Help area.
4. gm/staff/shift landings unchanged.
5. `tsc --noEmit` clean.

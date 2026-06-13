## Why the screen is blank

This project was just remixed, which gave you a fresh, empty backend. I checked it:

- `auth.users`: 1 (just you)
- `user_roles`: 0
- `user_venue_roles`: 0
- `venues`: 0
- `weeks`: 0
- `weekly_core`: 0

The schema migrated fine, but **no data was copied over** (the original project's venues, roles, weekly scorecards, etc. don't transfer on a remix). The Dashboard renders nothing because there is no venue, no week, no role, and no scorecard to draw — so the page sits empty after the loader disappears.

On top of that, the new account you signed up with has **no role and no venue assignment**, so even once data exists the app doesn't know what to show you.

## Plan to get the app loading

### 1. Grant your account `owner` access
Insert one row into `user_roles` (`role = 'owner'`) and one row into `user_venue_roles` (`role = 'owner'`, `venue_id = NULL` — the portfolio-level owner role the `RoleContext` looks for). This unblocks the protected routes and makes the portfolio/dashboard layout resolve.

### 2. Seed one venue + venue assignment
Insert a single row into `venues` (name like "Demo Venue") and a matching row into `venue_assignments` for your user so `AppContext` can pick it as the "selected bar". Without a venue, `accessibleBars` stays empty and Dashboard has nothing to query against.

### 3. Seed one current week + an empty `weekly_core` row
Insert a `weeks` row for the current ISO week (Mon–Sun, PT) keyed to the new venue, plus a matching `weekly_core` row with nulls/zeros. This lets `useSupabaseWeeks` return a row so `selectedWeek` resolves and the Dashboard renders its score hero + pillar cards (showing "—" for missing metrics, per the project's data-integrity rules).

### 4. Confirm in the preview
Reload `/dashboard`. You should see the layout, score hero (0/—), four pillar cards with dashes, an empty alerts block, and the Toast widget. Real numbers will start filling in once the Toast / 7shifts / Asana sync crons run against the secrets you just set.

## What I will NOT do

- Backfill historical metrics, insights, or briefings — those require running the edge-function sync pipeline with real integration data, not SQL seeds.
- Touch the original project's data.
- Auto-confirm emails or change auth settings.

## Technical notes

- Seeding happens via a new `supabase/migrations/<timestamp>_seed_remix_bootstrap.sql` file so it's reproducible and audited.
- The migration is idempotent (uses `ON CONFLICT DO NOTHING` and looks up your user by `auth.users.email = 'ceosupreme@gmail.com'`, which I saw in the auth logs — confirm this is the right account before I run it).
- No app code changes; this is data-only.

## Confirm before I build

1. Is `ceosupreme@gmail.com` the account you want promoted to `owner`?
2. Do you want a single placeholder "Demo Venue", or should I create one venue per real location (in which case please paste the venue names)?

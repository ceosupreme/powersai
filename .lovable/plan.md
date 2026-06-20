# Build A — Client Onboarding Wizard (Plan)

Per-venue guided wizard that **assembles** existing admin panels into a phased, completeness-tracked flow. No panel logic is rebuilt; the wizard is pure orchestration over a new per-venue progress table, plus one data-driven fix to the qualifier slug.

---

## 1. Net-new schema (one migration)

### `venue_onboarding_progress`
```text
id                uuid pk
venue_id          uuid not null  (no FK if venues isn't safe to FK; mirror existing per-venue tables)
step_key          text not null
status            text not null check in ('not_started','complete','skipped')
auto_detected     boolean not null default false   -- true when a detector set it, false when user marked
notes             text
updated_at        timestamptz default now()
updated_by        uuid
unique (venue_id, step_key)
```
- GRANTs: `authenticated` + `service_role`.
- RLS: SELECT/INSERT/UPDATE/DELETE gated by `public.user_can_access_project(venue_id)` (mirrors existing per-venue tables).
- `updated_at` trigger via existing `handle_updated_at()`.

### `project_types.slug` (additive column)
- Add `slug text unique` to `project_types`.
- Backfill from existing rows: `slug = lower(regexp_replace(id::text, '_', '-', 'g'))` (e.g. `home_services → home-services`, matches the existing hardcoded slug).
- Nothing else changes on the table.

No other schema changes. All other surfaces continue writing to their existing tables via their existing panels.

---

## 2. Step registry (single source of truth, code-side)

`src/config/venueOnboardingSteps.ts` — declarative list. Each entry:
```text
{
  key: string,                    // stable, persisted in venue_onboarding_progress.step_key
  phase: 'identity' | 'go_live' | 'full_config',
  title, description,
  panelComponent: ReactComponent, // embedded existing panel
  detector: (venueId) => Promise<'complete' | 'not_started'>, // optional
  manualOnly?: boolean,           // skip auto-detection
  required?: boolean              // for phase gating
}
```

Steps registered (all reuse existing panels — wizard never recreates write logic):

**Phase 1 — Identity & Type (gating)**
- `identity` — embeds `EditBarDialog`'s field set (extracted as `<VenueIdentityForm>` reading the same submit handler EditBarDialog already uses). Detector: `venues.name` + `bar_code` + `project_type` not null.

**Phase 2 — Go-Live Essentials (gating for LIVE)**
- `qualifier_config` — embeds `ProjectQualifierOverridesPanel` + a read-only summary of the resolved `project_type_qualifier_fields` / `project_type_qualifier_config`. Detector: `fetchEffectiveQualifierFields(venueId)` returns ≥1 field AND `project_type_qualifier_config` row exists with `ready_definition` + `primary_channel`.
- `capture_channel` — embeds the new `/qualify/[slug]` link surface + a "test a lead" link. Detector: at least one `inbound_leads` row OR user manually marks complete.
- `owner_notifications` — embeds `NotificationPreferencesCard`. Detector: `notification_preferences` row exists for venue with at least one channel enabled.

**Phase 3 — Full Configuration (tracked, non-gating)**
- `pillars` → `ProjectPillarOverridesPanel`. Detector: `project_pillar_overrides` row exists OR template resolves cleanly (manual-mark allowed).
- `leak_vectors` → `ProjectLeakVectorOverridesPanel`. Detector: same pattern.
- `contacts` → existing contacts panel from EditBarDialog (Leaders + Contacts tabs). Detector: ≥1 `venue_contacts` OR `venue_leadership_contacts` row.
- `brand_kit` → `BrandKit` page embedded. Detector: `brand_kits` row exists for project.
- `targets` → `SettingsTargetsTab`. Detector: `bar_targets` or `period_config` row exists.
- `execution_adapter` → `VenueAdapterConfig`. Detector: `venue_execution_adapters` row exists.
- `programming_context` → `VenueProgrammingContextPanel`. Detector: row in `venue_programming_context`.
- `asana_log_sources` → `AsanaLogSourcesEditor`. Detector: ≥1 active `venue_asana_log_sources` row.
- `gbp_mapping` → `GbpPlaceMappingPanel`. Detector: `gbp_place_mappings` row.
- `map_pack` → `MapPackKeywordsPanel`. Detector: ≥1 `map_pack_keywords` row.
- `ai_search` → `AISearchQueriesPanel`. Detector: ≥1 `ai_search_queries` row.
- `website_mapping` → `WebsiteMappingPanel`. Detector: `website_mappings` row.
- `auto_approve` → `AutoApproveSettingsCard`. Detector: config row OR manual mark.
- `daily_flash` → `DailyFlashSettingsCard`. Detector: config row OR manual mark.

Steps with no clean DB signal are `manualOnly` (user toggles complete/skip).

---

## 3. Hooks (orchestration only)

- `useVenueOnboardingProgress(venueId)` — loads `venue_onboarding_progress` rows, exposes `{ status[stepKey], setStatus(stepKey, status), markComplete, skip }`. Single Supabase upsert per write.
- `useVenueOnboardingDetectors(venueId, steps)` — runs each step's detector in parallel (batched, not deep-instantiation-prone), updates `venue_onboarding_progress` with `auto_detected = true` only when the detector flips a `not_started` row to `complete`. Never overwrites a user-set `skipped` or `complete` status.
- `useVenueLiveStatus(venueId)` — derives `{ isLive, phase1Complete, phase2Complete, phase3Pct }` from progress. `isLive = phase1 && phase2 all required steps complete`.

These hooks are the only new state machinery. They do not write to any existing setup tables.

---

## 4. UI

- `src/components/onboarding/VenueOnboardingWizard.tsx` — built on top of `SetupWizard.tsx` shell pattern (reuses its Dialog + progress chrome by extracting a generic `<WizardShell>` if needed, otherwise composes the same primitives). Accepts `venueId`. Renders three phase tabs with per-step rows: status pill, embedded panel inline (accordion) or "Open" → Sheet on mobile, "Mark complete" / "Skip" buttons.
- `src/components/onboarding/VenueLiveBadge.tsx` — "LIVE — capturing leads" badge + "X% configured" meter.
- Entry points (re-openable):
  - Admin → Venues list: per-row "Set up" button → opens wizard for that venue. Also auto-opens once after a new venue is created in `EditBarDialog` (without modifying EditBarDialog internals — wrap its `onSaved` at the parent).
  - Venue detail page header: "Continue setup" button when `phase3Pct < 100`, "Setup ✓" when complete.
- Mobile: phase tabs scroll horizontally (existing `.no-scrollbar` pattern); each step opens as a Sheet on `<md`.

---

## 5. Data-driven qualifier slug

- Add `project_types.slug` (migration above) + backfill.
- `src/pages/QualifyLanding.tsx`: delete `SLUG_TO_TYPE`. Replace with a lookup hook `useProjectTypeBySlug(slug)` that queries `project_types` by `slug`.
- `supabase/functions/qualifier-session/index.ts`: accept slug OR project_type id; resolve via `project_types.slug`.
- Result: adding a vertical = one row in `project_types` (with slug). No code change for the URL to work.

---

## 6. Edits to existing files (minimal, additive)

- `EditBarDialog.tsx`: no internal changes. Parent that opens it gets a small wrapper that, on first-save of a new venue, opens the wizard for `venueId` — keeps EditBarDialog unchanged.
- `QualifyLanding.tsx`: swap hardcoded map for data lookup (above).
- `qualifier-session` edge function: slug-aware resolver.
- `App.tsx`: nothing new — entry points are inside existing admin pages.

Everything else (existing SetupWizard, LaunchChecklist, useChecklist, useVenueOnboarding, Build 0 resolution, RLS on existing tables, all integrations) is untouched.

---

## 7. Phase gating logic

```text
isLive =
  step.identity.status === 'complete' &&
  step.qualifier_config.status === 'complete' &&
  step.capture_channel.status in ('complete','skipped') &&
  step.owner_notifications.status === 'complete'

configuredPct = phase3.completedOrSkipped / phase3.total
```
The wizard surfaces both: a prominent "LIVE" gate state and a secondary "X% fully configured" meter.

---

## 8. Verification

1. Open Admin → Venues → click new venue → wizard opens scoped to that venueId; phase tabs render with detector-driven statuses.
2. Fill Phase 1 identity + Phase 2 qualifier/notifications → `useVenueLiveStatus` flips `isLive = true`, badge shows "LIVE — capturing leads".
3. Each embedded panel writes to its existing table (verified by reading the same row after the step closes); `venue_onboarding_progress` only ever stores `{venue_id, step_key, status}` — no parallel config writes.
4. Detectors flip steps to `complete` after panel saves; user can manually `skip` or `mark complete` for manual-only steps.
5. Visit `/qualify/<new-slug>` after inserting a new `project_types` row with that slug → qualifier loads without any code change.
6. `tsc --noEmit` clean. Existing SetupWizard / LaunchChecklist / EditBarDialog / Build 0 resolution / RLS / integrations behave identically (smoke check).

## Out of scope

- Templated automation deployment (Build C).
- Recovery report (Build D).
- Intake-answers → config pre-population (Build B).
- Any change to Build 0 template resolution or to the existing onboarding/checklist systems.
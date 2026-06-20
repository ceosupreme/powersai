# Build 0 — Vertical = Project Type + Config Template

Additive only. Replicates the `pillar_templates` → `project_pillar_overrides` pattern. No changes to scoring, dashboard branching, RLS on existing tables, or integrations.

## Part 1 — `project_types` lookup table

Single migration:

- `CREATE TABLE public.project_types (id text PK, label text NOT NULL, description text, sort_order int NOT NULL DEFAULT 0, is_vertical boolean NOT NULL DEFAULT false, created_at, updated_at)`. `id` matches the enum string value (text — enum values can't be FK'd).
- GRANTs + RLS: read for `authenticated`; write for admins only (`has_role(auth.uid(),'admin')`), mirroring `pillar_templates` policy shape.
- Seed 5 existing values: `client` "Client", `content_channel` "Content Channel", `internal_brand` "Internal Brand", `app_build` "App Build", `service_offer` "Service Offer". `is_vertical=false`.
- `updated_at` trigger via existing `handle_updated_at()`.

Frontend wiring (after migration approval + types regen):

- Add `src/hooks/useProjectTypes.ts` — small react-query hook returning `{id,label,is_vertical,sort_order}[]`.
- `SettingsPillarsTab.tsx`: replace local `PROJECT_TYPES` const with hook data.
- `EditBarDialog.tsx`: replace inline `<SelectItem>` literals with mapped hook data.
- Same UI, same selected values (still write the enum string into `venues.project_type`).

## Part 2 — Typed per-type config (mirror pillar pattern)

Same migration (or a sibling — single batch). Each pair = template + override with identical shape/policies to `pillar_templates`/`project_pillar_overrides`.

### 2a. `project_type_leak_vectors` (template)
Columns: `id uuid PK`, `project_type project_type_enum NOT NULL`, `name text NOT NULL`, `detect_signal text`, `dollarize_formula text`, `benchmark text`, `severity text CHECK (severity IN ('headline','supporting'))`, `sort_order int`, timestamps. `UNIQUE (project_type, name)`.

### 2b. `project_leak_vector_overrides` (per-project, REPLACE-if-any)
Same columns but `project_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE` instead of `project_type`. `UNIQUE (project_id, name)`.

### 2c. `project_type_qualifier_fields` (template)
Columns: `id uuid PK`, `project_type project_type_enum NOT NULL`, `field_key text NOT NULL`, `field_label text NOT NULL`, `field_type text CHECK (field_type IN ('text','select','number','boolean'))`, `is_shared boolean NOT NULL DEFAULT false`, `channel text CHECK (channel IN ('web_voice','phone','chat','sms','form'))`, `sort_order int`, timestamps. `UNIQUE (project_type, field_key)`.

### 2c-bis. `project_type_qualifier_config` (per-type singleton)
`project_type project_type_enum PRIMARY KEY`, `ready_definition text`, `primary_channel text`, timestamps. Per-type editable metadata for the vertical's "ready" rule.

### 2d. `project_qualifier_field_overrides` (per-project)
Same shape as 2c but keyed by `project_id`. `UNIQUE (project_id, field_key)`.

### GRANTs + RLS (identical pattern to pillar tables)
- Templates (2a, 2c, 2c-bis): SELECT for `authenticated`; INSERT/UPDATE/DELETE admin-only via `has_role`.
- Overrides (2b, 2d): all CRUD gated by `user_can_access_project(project_id)` — exact mirror of `project_pillar_overrides`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated; GRANT ALL ... TO service_role;` on every new table.

### Read logic (mirrors `fetchEffectivePillars`)
New `src/lib/effectiveLeakVectors.ts` and `src/lib/effectiveQualifierFields.ts`:
```ts
fetchEffectiveLeakVectors(projectId, projectType):
  const overrides = await select * from project_leak_vector_overrides where project_id = projectId
  if (overrides.length) return overrides
  return select * from project_type_leak_vectors where project_type = projectType
```
Same shape/REPLACE semantics for qualifier fields. Hooks: `useEffectiveLeakVectors(projectId)`, `useEffectiveQualifierFields(projectId)` that internally `useProjectType` to get the type then call the lib fn — identical structure to `useEffectivePillars`.

## Part 3 — `home_services` vertical + seed

**Two-migration sequence** (required: `ALTER TYPE ADD VALUE` must commit before any seed using that value):

Migration A (combined with Parts 1+2):
- `ALTER TYPE public.project_type_enum ADD VALUE IF NOT EXISTS 'home_services';`
- Create all new tables above + RLS + GRANTs.
- Seed `project_types` with 5 existing rows (NOT yet home_services — enum value not yet visible to a same-tx insert that references it via FK… text column is fine, so we CAN include home_services here as a text row).

Migration B (separate, after A commits):
- Insert `pillar_templates` rows for `'home_services'`:
  - Demand Capture (30), Sales & Estimates (25), Capacity & Dispatch (20), Retention & Membership (15), Reputation (10).
- Insert `project_type_leak_vectors` for `'home_services'`:
  - Missed calls (headline), Unsold estimates (headline), Lapsing memberships (supporting) — with detect_signal / dollarize_formula / benchmark text.
- Insert `project_type_qualifier_fields` for `'home_services'`:
  - Shared (`is_shared=true`): contact, location, urgency, budget_signal, timeline.
  - Vertical (`is_shared=false`): trade, job_type, service_area, emergency_vs_scheduled, property_type.
  - All `channel='phone'`.
- Insert `project_type_qualifier_config`: ready_definition = "in-area job of a type the operator wants, with urgency + contactable"; primary_channel = "phone".

Because `ALTER TYPE ADD VALUE` cannot run in the same transaction as a statement that uses the new value, splitting into two migrations is the safe path.

## Part 4 — Admin surface (reuse existing patterns)

Extend `SettingsPillarsTab.tsx` into a tabbed editor (Pillars | Leak Vectors | Qualifier Fields) for the selected project type. Each tab is a near-clone of the existing pillar table-of-rows editor — same add/edit/delete row UX, same admin gating. Plus a small `ready_definition` + `primary_channel` form bound to `project_type_qualifier_config`.

Extend `ProjectPillarOverridesPanel.tsx` (or add sibling `ProjectLeakVectorOverridesPanel` / `ProjectQualifierOverridesPanel` following the same shape) so a project can "Customize for this project" / "Reset to default" on leak vectors + qualifier fields. Same bulk-copy-from-template / delete-all semantics.

No new admin framework. New components mirror existing files line-for-line on structure.

## Files

New SQL:
- One migration for Part 1 + Part 2 schema (enum ADD VALUE + project_types + 5 new tables + RLS + GRANTs + seed of 5 existing project_types + updated_at triggers).
- Second migration for Part 3 data seed (home_services pillar_templates + leak vectors + qualifier fields + qualifier_config row + project_types row for home_services).

New TS:
- `src/hooks/useProjectTypes.ts`
- `src/lib/effectiveLeakVectors.ts`, `src/hooks/useEffectiveLeakVectors.ts`
- `src/lib/effectiveQualifierFields.ts`, `src/hooks/useEffectiveQualifierFields.ts`
- `src/components/admin/SettingsLeakVectorsTab.tsx` (or merged into SettingsPillarsTab as sub-tabs)
- `src/components/admin/SettingsQualifierFieldsTab.tsx`
- `src/components/admin/ProjectLeakVectorOverridesPanel.tsx`
- `src/components/admin/ProjectQualifierOverridesPanel.tsx`

Modified TS:
- `src/components/admin/SettingsPillarsTab.tsx` — read project types from hook; wrap in tabs.
- `src/components/admin/EditBarDialog.tsx` — read project types from hook.
- `src/pages/Admin.tsx` (or wherever SettingsPillarsTab mounts) — render new tabs if it doesn't already container them.

Untouched: `effectivePillars.ts`, `useEffectivePillars.ts`, `Dashboard.tsx`, `NonClientPillarsDashboard.tsx`, scoring engine, all RLS on existing tables, all integrations.

## Verify

1. `select * from project_types` returns 6 rows; both dropdowns render them (same UI).
2. New tables exist, RLS on, GRANTs present, override read logic returns template when no overrides and override rows when present (mirrors `fetchEffectivePillars`).
3. Create a venue with `project_type='home_services'` → Dashboard `isCanonicalClientSetup` returns false → renders `NonClientPillarsDashboard` with 5 seeded pillars; effective leak vectors + qualifier fields load from template; inserting a `project_leak_vector_overrides` row REPLACES the list for that project.
4. Admin can CRUD leak vectors / qualifier fields per type and override per project, using the cloned patterns.
5. `tsc` clean. No edits to scoring, fetchEffectivePillars, Dashboard branching, RLS on existing tables, or integrations.

Awaiting approval before running migrations.

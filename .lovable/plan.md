
# Feature A — Service Catalog (build plan)

Builds against the recon. Two reality deltas worth flagging up front:

- **Company → venue link EXISTS today.** `crm_companies.linked_project_id uuid REFERENCES venues(id) ON DELETE SET NULL` (indexed). Part 5 keeps your "deal names the package, no auto-assign" scope as requested, but `won_at + linked_project_id` would already let a later build wire this without new schema. Flagged, not built.
- **All four bundle names match exactly.** Existing bundles: `Lead Catcher`, `Reactivation`, `Reviews Engine`, `Tier 2 — Missed Money Recovery`. Every Part-2 row that references a bundle will resolve; no nulls expected.

---

## Part 1 — Schema (one migration)

Single migration creates the enum + 3 tables + 1 column + RLS + indexes.

- `CREATE TYPE service_subscription_status AS ENUM ('active','paused','ended');`
- `service_packages` exactly as spec'd. `fulfillment_bundle_id uuid REFERENCES automation_bundles(id) ON DELETE SET NULL`. `updated_at` trigger via `handle_updated_at()`.
- `service_package_items` exactly as spec'd. CASCADE on package delete.
- `venue_service_subscriptions` exactly as spec'd; **no** uniqueness on `(venue_id, package_id)` or on `(venue_id) WHERE status='active'` — multiple active rows allowed.
- `ALTER TABLE crm_deals ADD COLUMN package_id uuid REFERENCES service_packages(id) ON DELETE SET NULL;`
- Indexes: `venue_service_subscriptions(venue_id)`, `service_package_items(package_id)`, `service_packages(fulfillment_bundle_id)`, `crm_deals(package_id)`.
- GRANTs (required — public-schema rule): `service_packages` + `service_package_items` → `SELECT` to authenticated, `ALL` to service_role; `venue_service_subscriptions` → `SELECT,INSERT,UPDATE,DELETE` to authenticated + `ALL` to service_role.
- RLS:
  - `service_packages` / `service_package_items`: mirror `automation_bundles` — `SELECT USING(true)` for authenticated, `INSERT/UPDATE/DELETE USING(has_role(auth.uid(),'admin'))`.
  - `venue_service_subscriptions`: mirror `venue_foundation_item_status` — `SELECT/INSERT/UPDATE/DELETE USING(user_can_access_project(venue_id))` (admins covered by `has_role` inside that function).

No touch to `service_offers`, `/offers`, or `Offers.tsx`.

## Part 2 — Seed

Single `INSERT` of 17 `service_packages` rows + the `service_package_items` rows listed for the 10 Tier-1/Tier-2 packages. Bundle FKs resolved by name subquery `(SELECT id FROM automation_bundles WHERE name = '<exact>' LIMIT 1)`; rows with `(none)` set `fulfillment_bundle_id = NULL`. `sort_order` assigned per row position. Run via the data-insert tool (not the migration).

Expected resolution (all 4 will hit):

```text
Lead Catcher Setup            → Lead Catcher
Embedded Lead Catcher Widget  → Lead Catcher
Never Miss a Lead             → Lead Catcher
Reactivation Campaign         → Reactivation
Customer Reactivation System  → Reactivation
Review Engine                 → Reviews Engine
Missed Money Recovery System  → Tier 2 — Missed Money Recovery
```

If any subquery returns NULL, the row still inserts (FK is nullable) and we report it.

## Part 3 — Admin "Service Catalog" tab

- New `src/components/admin/SettingsServiceCatalogTab.tsx`.
- Wire as a new `<TabsTrigger value="service-catalog">` + `<TabsContent>` in `SettingsTab.tsx`, slotted next to the existing `bundles` tab. Icon: `Package2` or `Layers`.
- New hooks file `src/hooks/useServicePackages.ts` (mirrors `useAutomationBundles.ts` shape: list with nested items, mutations for create/update/delete/reorder for both `service_packages` and `service_package_items`).
- UI: groups list **by `tier`** (Tier 0 / 1 / 2 / 3 / 4). Each row → name, price summary (`price_note` shown verbatim), bundle badge, active toggle, edit drawer.
- Edit drawer: name, tier, primary_channel (select), one_time_price, monthly_price, currency, price_note, description, `fulfillment_bundle_id` dropdown sourced from `useAutomationBundles({includeInactive:false})` with a "None" option, drag-reorderable line-items list (label + sort_order).

## Part 4 — "Current Packages" panel on the project

- New `src/components/services/VenueSubscriptionsPanel.tsx`.
- Mounted in the **same project surface that already renders `AutomationEnrollmentPanel`** (Build A's `VenueOnboardingWizard`/project view), placed adjacent to it.
- New hook `src/hooks/useVenueSubscriptions.ts`: list by `venue_id` ordered `status='active' first, started_at desc`; mutations: `assign`, `updatePrices`, `pause`, `resume`, `end` (sets `status='ended'` + `ended_at=now()`), `delete`.
- Display: package name + tier badge + bundle badge, agreed one-time + monthly (formatted with currency), status pill, started date, notes (inline edit).
- "Assign package" action: dialog → select from `is_active=true` packages → form pre-fills `one_time_price_agreed`/`monthly_price_agreed`/`currency` from the package, both editable → insert. Multiple active allowed; no client-side dedupe.
- Per-row menu: Pause / Resume / End / Delete.

## Part 5 — Deal → package

- In `src/components/crm/CompanyDetail.tsx`, extend the inline deal quick-create row (currently `title + value`) with an optional Package `<Select>` populated from active `service_packages`. Selecting one auto-fills `title` (if blank) with the package name and `value` with `one_time_price` — both stay editable. Persists `package_id` on the new `crm_deals` row.
- Also surface package in the existing deal display (small badge on each deal card) so the chosen package is visible.
- Update `src/hooks/useCrm.ts` `useDeals`/`createDeal` to read/write `package_id`.
- **Won-deal → auto-assign:** NOT wired this build. Honest scope respected even though `crm_companies.linked_project_id` would technically allow it — flagged above so you can choose to add it as a one-line follow-up later.

---

## Verification

- tsc clean; existing Offers/Service-Offers screen unchanged.
- Migration applies; new RLS policies match the mirrored references.
- Seed inserts 17 packages with 4 bundle FKs resolved; report any nulls.
- Admin Service Catalog tab renders grouped by tier, CRUD works, bundle dropdown lists all active bundles.
- On a project, Current Packages panel lists/assigns/pauses/ends subscriptions; multiple actives allowed.
- New deal in CompanyDetail can attach a package, defaulting value from the package.
- `service_offers` / `/offers` untouched; no policy or column change there.

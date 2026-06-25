
# Business Foundation Audit

A per-project, vertical-varying scored audit of real-world business readiness. Engine clones Growth Audit (`deriveScores.ts` + analyzer registry). Config clones Build 0 (template-per-type + per-project overrides + REPLACE resolver). State is its own per-venue table. No writes into Build A / launch checklist tables — only reads.

---

## 1. Schema (one migration, additive)

### Config (Build 0 mirror)
- `foundation_category_templates` — `project_type`, `category_key`, `label`, `weight numeric`, `sort_order`, timestamps. Unique `(project_type, category_key)`.
- `foundation_item_templates` — `project_type`, `category_key`, `item_key`, `label`, `description`, `detection_signal text` (e.g. `gbp.verified`, `website.live`, `manual`), `is_manual_only bool`, `severity` (`low|medium|high|critical`), `sort_order`. Unique `(project_type, item_key)`.
- `project_foundation_category_overrides` — `project_id`, `category_key`, `label`, `weight`, `sort_order`, `is_hidden`. Unique `(project_id, category_key)`.
- `project_foundation_item_overrides` — `project_id`, `category_key`, `item_key`, `label`, `description`, `detection_signal`, `is_manual_only`, `severity`, `sort_order`, `is_hidden`. Unique `(project_id, item_key)`.

### State
- `venue_foundation_item_status` — `venue_id`, `item_key`, `status` (`satisfied|missing|partial|unknown|not_applicable`), `evidence_url`, `detected_at`, `source` (`auto|manual`), `notes`, `updated_by`. Unique `(venue_id, item_key)`.
- `foundation_audit_runs` — clone of `growth_audit_runs` (`venue_id`, `status`, `started_at`, `completed_at`, `inserted`, `updated`, `resolved`, `skipped`, `errors jsonb`, `ms`, `triggered_by`).

### RLS / grants
Every table: GRANT to `authenticated` + `service_role` (no anon). Policies = admin OR `user_can_access_project(venue_id)` for project-scoped tables; templates readable by any authenticated user, admin-write.

### Seed — `home_services`
Categories (weights): Legal/Admin (1.5), Brand Identity (1.0), Web Presence (1.2), Google/Local (1.5), Reviews (1.2), Social (0.8), Offers/Channels (1.0), Collateral (0.6).
Items per category with `detection_signal` or `is_manual_only=true` (LLC, EIN, bank, insurance, licenses, trademark, privacy/ToS, accounting, payment processor → manual; logo/colors/tagline → brand_kit auto; live site/SSL/mobile → website_snapshots; GBP claimed/verified/hours/photos → gbp_*; review count/rating → online_reviews; IG/FB linked → brand_kit_links + social_media_posts; service offers present → service_offers; primary contact → venue_contacts).

---

## 2. Resolver (Build 0 mirror)

`src/lib/effectiveFoundation.ts`
- `fetchEffectiveFoundationCategories(projectId, projectType)`
- `fetchEffectiveFoundationItems(projectId, projectType)`
- REPLACE rule: if ANY override row exists for that project, return overrides ∪ non-overridden hidden=false templates? Match the exact semantics used in `effectivePillars` (full replace when any override exists). Hooks: `useEffectiveFoundationCategories`, `useEffectiveFoundationItems`.

---

## 3. Scoring (Growth Audit clone)

`src/components/foundation-audit/deriveFoundationScores.ts`
- Severity weights map (e.g. critical=4, high=3, medium=2, low=1).
- Per category: raw = Σ(severityWeight × satisfiedFactor) / Σ(severityWeight) over items with a known state (`satisfied=1`, `partial=0.5`, `missing=0`, `unknown|not_applicable` excluded).
- If a category has 0 scored items → `unscored: true`, excluded from overall (honest unscored — no fake 100s).
- Overall = weighted average across scored categories using template weights.
- Returns `{ overall, categories: [{ key, label, score, unscored, items, gaps }], topGaps, recommendedActions }`. Recommended actions = top-N missing items by `severity × categoryWeight`.

---

## 4. Refresh engine (growth-audit-refresh clone)

`supabase/functions/foundation-audit-refresh/index.ts` — dispatcher: insert `foundation_audit_runs` row, iterate checks registry, aggregate counters, mark complete.

`supabase/functions/_shared/foundation-checks/` — registry of `{ id, itemKey, run(supabase, venueId) → { status, evidence_url?, detected_at } | null }`. One module per signal:
- `gbp.ts` — claimed/verified/hours/photos from `gbp_place_mappings` + latest `gbp_snapshots`.
- `website.ts` — live/ssl/mobile from `website_mappings` + `website_snapshots`.
- `reviews.ts` — has reviews / rating ≥ X from `online_reviews` / `review_snapshots`.
- `brand.ts` — logo/colors/tagline from `brand_kits`, `brand_kit_assets`, `brand_kit_colors`, `brand_kit_taglines`.
- `social.ts` — IG/FB linked from `brand_kit_links` + activity from `social_media_posts`.
- `offers.ts` — at least one `service_offers` row (+ channel coverage from `channel_products`).
- `contacts.ts` — primary contact from `venue_contacts` / `venue_leadership_contacts`.
- `build-a-bridge.ts` — for items that overlap Build A onboarding, READ `venue_onboarding_progress` (no writes).

Each check upserts into `venue_foundation_item_status` with `source='auto'`. Manual rows are only ever written with `source='manual'` (auto checks never clobber manual).

Trigger paths: button on FoundationAudit page (`supabase.functions.invoke`) and a weekly pg_cron job.

---

## 5. UI (Growth Audit page clone)

`src/pages/FoundationAudit.tsx` modeled on `GrowthAudit.tsx` — same tabbed shell, same `PrimaryMetricsRow`, same `CategoryScoreCard`, same data-sources sub-view shell.

`src/components/foundation-audit/`
- `useFoundationScores.ts` — resolves templates+overrides+state, returns `deriveFoundationScores` output for selected project.
- `FoundationOverview.tsx` — overall readiness gauge, category grid (reuses `CategoryScoreCard`), top gaps, recommended actions, "Refresh audit" button.
- `FoundationCategoriesView.tsx` — per category, list of items. Auto items show detected status + evidence link + last-detected timestamp; manual items render `Checkbox` (`satisfied`/`missing`) + optional `evidence_url` input + notes.
- `FoundationGapsView.tsx` — flattened gap list with severity badges and recommended-fix copy.

`src/hooks/useFoundationItemStatus.ts` — mutations for manual checkbox/evidence upserts (source='manual', `updated_by=auth.uid()`).

### Nav + routing
- Add route `/foundation-audit` in `src/App.tsx`.
- Add nav item to `AppSidebar.tsx` in **GROWTH & MARKETING** group next to Growth Audit; `PageKey='foundation_audit'` added to `src/types/permissions.ts`.
- Add help key + article entry (consistent with last build).

---

## Verification

1. tsc clean.
2. Templates fetch returns home_services categories+items; adding an override row flips resolver output (REPLACE behavior matches `effectivePillars`).
3. Invoking `foundation-audit-refresh` for a venue with GBP/website/brand data populates `venue_foundation_item_status` rows with `source='auto'`; manual rows untouched.
4. `deriveFoundationScores` returns `unscored:true` for a category with all-unknown items; overall excludes it.
5. Foundation Audit page renders overall score, category grid, gaps, and lets a manual item be checked + evidence saved.
6. No writes to `user_checklist_progress` or `venue_onboarding_progress` (only reads in `build-a-bridge.ts`).
7. RLS: anon cannot read any `*_foundation_*` or `venue_foundation_*` table.

---

## Out of scope (explicit)

- Public/shareable lead-magnet view (token+edge-function pattern) — not in this build.
- Verticals beyond `home_services` — config is data; add via seed later.
- Changes to Growth Audit, Build 0, Build A, RLS on existing tables, integrations.

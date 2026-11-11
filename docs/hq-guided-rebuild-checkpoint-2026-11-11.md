# HQ Guided Rebuild — Milestone 0 Control Record

Date: 2026-11-11 (America/Los_Angeles)

## Scope and release controls

- Project: STM HQ; source repository: `ceosupreme/powersai`.
- Baseline main SHA: `cf89753fedd26b540056576c439009abc8be7b7b`.
- Isolated working branch: `hq-guided-workflows-2026-11-11`.
- **Do not merge or publish until backup, authorization, regression, and workflow checks pass.**
- Lovable project/database connector currently errors internally, therefore NO production database export, RLS verification, or mutation has been performed during this run.
- Lovable and the public marketing website share a publish boundary. Recheck public routes before any release.
- The branch is not a database sandbox; production data is live if credentials point to it.

## Verified source inventory

- `src/context/AuthContext.tsx`: reads `user_roles`, `user_bar_assignments`, role page defaults; admin has all pages.
- `src/context/RoleContext.tsx`: reads `user_venue_roles`; client role takes precedence; historic bar/GM/shift roles.
- `src/hooks/usePagePermissions.ts`: individual page permissions; reconcile with role defaults rather than relying on client-side guards alone.
- `src/components/brand-workspace/BrandWorkspace.tsx`: nine tabs, setup, channels, money lanes, products, production cards, knowledge documents.
- `src/components/brand-workspace/SetupTab.tsx`: starts a setup job and exposes the plan mostly in a disappearing toast.
- `src/components/pipeline/CreatePipelineDialog.tsx`: create flow navigates to job after creation; default destinations are seeded from every live/dormant/planned channel.
- `src/pages/PipelineJob.tsx`: action steps and Claude handoff, including `Queue` action that explicitly does not start execution.
- `src/components/content/ProductionItemCard.tsx` and `src/hooks/useContentProduction.ts`: stage transition updates `content_items.stage`; it does not call a scheduler.
- `src/config/venueOnboardingSteps.ts`: client/bar-specific setup, should not appear on personal brand pages.
- `supabase/migrations/`: 220 tracked migration files at inspection.
- `supabase/functions/`: 121 top-level function/shared directories at inspection.

## Production backup gate — targeted snapshots exported and verified

Required BEFORE applying ANY database migration or RLS change:
1. Export tables used by the upgrade to a secured independent backup, including `user_roles`, `user_venue_roles`, `user_bar_assignments`, `role_page_defaults`, `user_page_permissions`, `venues`, `production_jobs`, `action_items`, `content_items`, `content_placements`, `channel_products`, `channel_product_channels`, `knowledge_base`, `brand_channels`, `venue_foundation_item_status`, and all other dependent tables found by schema inspection.
2. Export current RLS policies, grants, functions, triggers, constraints, indexes, and relevant schema definitions; include secrets-references metadata but **do not commit secrets**.
3. Record row counts for all backed-up tables, compare to production counts at the same snapshot, and perform a sample restore into a nonproduction database.
4. Save a clear database restoration procedure, not just backups of copies in the same production instance.
5. Ensure a brand manager can read/write only authorized brand records and that other brand and admin records are refused by RLS.
6. Store backups outside the public GitHub repository, with access restricted to the operator.

## Recovery references
- Restricted source schema: `hq_recovery_20261111` (public-table metadata and targeted operational rows; excludes secrets and auth passwords).
- Independent private backup: Google Drive folder `STM HQ - Recovery snapshots` (folder ID `1S8KMrBC9xJGMljmaktmWEmL6x412Sl-k`; owner-only). Manifest includes exact sorted JSONL row counts and MD5 values.
- All 16 Google Drive backup files were verified by raw document readback. Do not share backup links publicly or put their data in this public repository.
- Restore-format check: `role_page_defaults` deserialized as native typed records in read-only SQL and matched its original MD5 for 59 rows.

## Execution and automation compatibility

- Inventory automation dependencies by exact table, status names and source field names before schema changes.
- Do not rename existing stored status enum values or silently interpret "Scheduled" as a confirmed platform booking.
- Distinguish manually scheduled, external scheduler accepted, platform confirmed, and published with verified evidence.
- Preserve client approval portal, Bar Pulse staff surfaces, scheduled runs, and public STM website behavior.
- Never mark a revenue source as earned based solely on a toggled setup state or forecast.
- Never treat a queued AI step as actually executing unless verified by a worker.
- Assign work to the authenticated user when they take a step; do not hard-code the account owner.

## Initial 13 end-to-end acceptance journeys

1. Brand manager signs in and lands on assigned brand's Today screen.
2. Opens brand-linked product and can start/resume allowed production plan.
3. Starts account setup and lands in the first actionable step.
4. Creates, saves and returns to a post's script, caption and assets.
5. Schedules with platform/date/time and an accurate external scheduling state.
6. Completes a step; its persisted state and next-eligible-step are correct.
7. Reports blocked work; admin receives linked brand, job, step and note.
8. Opens the current document contents.
9. Requests another brand's record; RLS refuses read and write.
10. Admin's portfolio, client flows and other functioning pages remain intact.
11. Client approvals portal and bar staff logins retain their original access.
12. Existing scheduled runs work against the agreed status and schema contract.
13. The public STM marketing site functions before and after release.

The detailed 37-action inventory remains the baseline checklist in `HQ_Brand_Pages_Fix_Plan.pdf` (supplied in the planning conversation). Each row needs action -> expected backend effect -> resulting screen -> saved evidence -> pass/fail.

## Milestone 1 authorization execution — live database (2026-11-11)

- Applied the reviewed SQL migration `20261111190000_guided_brand_manager_rls.sql` after a successful transaction that rolled back. Grants scoped owner-role access to production jobs, linked products, content placements and brand channels; restricts owner exposure to global manager-only knowledge docs. Existing client and staff role policies were not changed, nor was the broadly readable product-link policy (deferred pending regressions).
- Jenna's owner role was pre-existing; added membership to her named internal brand in two assignment tables only. No other brand memberships were granted.
- Verified under a simulated real PostgreSQL `authenticated` role + Jenna JWT identity: Jenna brand visible (1); STM and Coastal Beauties not visible (0); brand-specific docs (8); global company docs (0); brand-linked product rows and production jobs visible.
- Full pipeline creation test succeeded under Jenna's authenticated role, with transaction ROLLBACK; same attempted operation for STM was denied. Updating Jenna's brand-channel rows succeeded (6), while STM updates affected zero; all testing writes were rolled back.
- Frontend access and mobile workflows remain on the draft branch and **are not live**. The admin-route global-role guard is committed but not deployed. Content-placement UPDATE test on Jenna returned zero because none exist; later INSERT/scheduling tests required.
- This is not a guarantee of full end-to-end production readiness. Client/staff portal regressions and runtime tests remain required.

## Change log

- `src/components/brand-workspace/BrandWorkspace.tsx`: plain-language labels and descriptive text for nine tabs. Existing tab keys preserved; source-only, isolated branch, not deployed. Full runtime smoke test still required.
- `src/components/brand-workspace/SetupTab.tsx`: created setup plans open directly instead of relying on expiring toast links; source-only, not deployed.
- `src/components/pipeline/CreatePipelineDialog.tsx`: product plans no longer preselect every brand channel. Explicitly chosen selling outlets determine destination steps; only live channels prefill non-product jobs. Unwritten/draft guides are labeled unavailable instead of generating placeholder plans through this dialog; source-only, not deployed.
- `src/App.tsx` and `src/components/auth/ProtectedRoute.tsx`: require verified global administrator role for admin routes; source-only, not deployed.
- `supabase/migrations/20261111190000_guided_brand_manager_rls.sql`: applied to production after backup and rollback dry run; committed as the auditable migration for code sync.

## Blockers / decisions

- [RESOLVED] Lovable connector restored. Backed up 33 operational tables (including the discovered `venue_assignments` membership table) and six schema-definition datasets to restricted `hq_recovery_20261111` within Supabase and to a private Google Drive recovery folder.
- [CHECKED] Independent private Google Drive export: 16 documents (one manifest and 15 data/schema parts), each verified against its source text, with folder confirmed owner-only. Tested typed read-only deserialization of role_page_defaults: 59 rows and MD5 match. This is a targeted rollback archive, NOT a full disaster-recovery backup of auth credentials, storage objects or secrets. Full nonproduction data restoration remains untested.
- [VERIFIED] Jenna assigned to Jenna Banks internal brand only in both venue_assignments and user_bar_assignments, with exact profile/project prechecks. Coastal Beauties and STM remain unassigned.
- [OPEN] Confirm Big Paws email list setup, Amazon Associates status and paid-call booking/payment decision before data cleanup.
- [OPEN] Approve exact overdue-task changes before editing any dates or statuses.
- [OPEN] Confirm whether GitHub branch changes will be merged/published by the active Lovable sync path.

## Milestone gate

Milestone 0's code baseline, targeted data snapshot, external export and schema/RLS capture are **complete and verified**. Automated-run dependency inventory, read/write RLS simulations, and a complete nonproduction restore are still open before any live permission migration, merge or publish. No migration, authorization change, production data cleanup, merge or publish is authorized by this control record.

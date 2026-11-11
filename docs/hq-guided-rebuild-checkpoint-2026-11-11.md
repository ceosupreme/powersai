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
- Independent private backup: Google Drive folder `STM HQ - Recovery snapshots` (owner-only; access reference retained outside this public repository). Manifest includes exact sorted JSONL row counts and MD5 values.
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

## Current rebuild reconciliation (2026-11-11)

- Draft branch now includes a four-item brand-manager layout, RLS-backed brand discovery, guided Today / My Plan / Posts & Videos / Files screens and a dedicated step execution view. Its routes are integrated through AppLayout and OwnerDashboard; admin, client and bar-staff route selection remains unchanged.
- Current live RLS verification: Jenna's owner role can see her brand's 24 product links, none from STM; a restricted client sees none; admin retains the full 159. This change was intentionally applied and matched by `20261111192500_scope_product_link_reads.sql`.
- Existing live brand-manager functions and policies were reconciled to `20261111190000_guided_brand_manager_rls.sql`. A redundant follow-up migration was removed from the branch.
- The 28 legacy "Emily" steps within the Jenna Banks brand were linked to Jenna's existing verified user ID, without changing titles, dates, status, or completion history. A new Today screen can now find them by ID.
- The current Start Here HQ document has readable text including the wine lane. However some old task instructions still reference retired navigation and an older Google Doc; clean up this content before release.
- Source CI completed TypeScript typecheck and production build successfully on the draft branch. Subsequent commits must be checked again. The app is NOT merged or published.
- Targeted off-database recovery documents were verified; one typed read-only restore-format check matched 59 rows and the snapshot MD5. A complete staging restore and real browser sign-in test are still outstanding.

## Milestone gate

Milestone 0's code baseline, targeted data backup, independent export, SQL/RLS snapshot, and basic restore-format check are complete. Milestone 1 has verified read isolation and basic brand-manager policies, but a true interactive logged-in write test, client/staff regression checks, and complete staging restore remain open. Milestone 2's guided interface is implemented in an isolated source branch and passes its initial build checks; real end-to-end tests are not yet complete. No GitHub merge or public-site Publish has occurred. Do not report the rebuild as production-ready until user acceptance and client/staff checks pass.


## Continued rebuild — 2026-11-11 12:30 PT, after chat handoff

- The existing draft PR is #7 at https://github.com/ceosupreme/powersai/pull/7; continue on `hq-guided-workflows-2026-11-11`. It remains DRAFT and unmerged. Do not publish, merge, or mark ready until the release gates have passed.
- Lovable project `dc01aa48-8dd7-400a-b397-110a5d357bc1` and its database were reachable during this continuation. Lovable's project commit was still the original main baseline, not the protected GitHub draft branch.
- Corrected success reporting: task completion and product status mutation now confirm an updated row; Waiting on Me approvals and PipelineJob reassignment also refuse silent zero-row success. The brand manager task query invalidates after a completion.
- Connected the weekly scorecard to production jobs by the already-existing `goal_pillar_key` and `goal_kpi_key` columns. A person may open linked plans from each manually reported KPI, but the interface does not confuse a targeted metric with actual results. New plans invalidate that read.
- Exact audited live correction #1: `Big Paws Club` job `42525503-2b20-4d36-b076-699aec198d07`, title `Big Dog Energy: A Guided Journal`, kind product, with exactly 26 steps and zero marked Done, was set from `running` to `parked`; all action rows were preserved. No other job was touched.
- Exact audited live correction #2: `Big Paws Club` content item `2fe85c98-a043-4a4c-bd25-90e3ab9e24c0` (Short B), which had stage `scheduled` without scheduled_at, publication or external scheduling confirmation, was moved to last pre-scheduling stage `thumbnail`. Its existing approved_at, quality score 82, and draft TikTok placement remain in place. Nothing was posted externally.
- Both changes have an idempotent, precondition-guarded source-controlled migration: `20261111211000_correct_audited_brand_workflow_state.sql`. A single live SQL operation returned 1 archived job and 1 corrected content item.
- Closed an important archival-visibility gap in source: open steps belonging to parked or finished jobs are filtered out of Next 10, portfolio work summaries and Waiting on Me. Brand managers retain archived plan history in My Plan but cannot mark its steps done. This will not affect the live frontend until deployment.
- Added an explicit What happens next explanation to the brand manager step view. Its completion mechanism still relies on the existing `advance_production_job` database trigger, which was inspected rather than replaced.
- A new review of the baseline found no post-change workflow run at the latest commit, as expected: `.github/workflows/hq-rebuild-check.yml` runs on `workflow_dispatch` or when the draft PR becomes ready for review. The user requested deferring noncritical testing until the feature work is complete.

### Follow-up content and approval verification

- The Start Here guide is **not stale anymore**: Google Drive document `1D9-HJeVA1k6AEag9xVMrESf3y8USpDsnRWMmFoe32GA` was fetched through the connected Drive source, and the in-HQ `knowledge_base` row `07110e45-6816-5759-918d-d4e0dcc54264` was fetched from live Supabase. After normalizing the document heading, separators and list markers, their content text is identical (4,477 normalized characters), including the wine-course section. The guide's direct external link can be retained.
- The first onboarding task `443e2140-c242-5159-94b3-d633b3c416d6` already instructs Jenna to open Today, My Plan, Posts & Videos and Files, and to read Start Here **inside HQ**. No task content, date, completion state or document was modified. The retired Start Here navigation and missing wine-section concern is closed for this record.
- Inspecting 96 live owner-kind tasks showed owner approvals only as Approved (64, including completed) or Blocked (32). The brand manager's next-step selection, completion action, and next-candidate logic now require explicit Approved and dependency completion. Previously proposed/unreviewed steps could appear actionable.
- No changes to client/bar portal or public marketing pages in this follow-up.

### Still open before release

1. Continue targeted review of other legacy Jenna instructions only if a concrete outdated reference is found; the Start Here / wine and four-screen guide itself has now been verified current. Preserve dates and completion.
2. Complete repair/review of all 37 actions in `HQ_Brand_Pages_Fix_Plan.pdf`, then run the combined plan's 13 acceptance journeys with saved evidence, including an actual brand-manager login, admin, restricted account and bar/client regression.
3. Confirm publishing/scheduling records and scheduled-run dependencies without treating a draft or a manual confirmation as independently verified publication.
4. Confirm the exact release/sync method, run production build/typecheck at the appropriate gate, inspect public STM marketing routes, and perform fuller nonproduction database restore verification.
5. Do not automatically change the approved-task-date list. Outstanding questions remain on the Big Paws email-list plan, Amazon Associates, paid-call booking/payment and the proposed overdue-task rescheduling. Preserve them until expressly resolved.

### Safe continuation constraints

- Use GitHub source edits and scoped SQL directly; reserve paid Lovable agent messages for work it does materially better.
- New database changes should be additive or tightly preconditioned, source-controlled, and recoverable. Do not broaden membership or RLS merely to make an interface work.
- No full acceptance testing or release until implementation is complete; a crucial build/dependency check may be performed earlier if needed. User does not need repeated "continue" prompts while a task is being actively handled.

### Action readiness and setup-save safety follow-up

- The audit's 37-action list was read directly from `HQ_Brand_Pages_Fix_Plan.pdf` pages 3–4. Continue mapping each action to real handling before the final acceptance gate. Existing Next Ten lane/product controls already link to setup/product workflows instead of ticking a misleading checkbox.
- The shared `useCompleteNextTenRow` action mutation now rereads the scoped live task, requires `approval_status='Approved'`, rejects Done/Claude-owned tasks, verifies any predecessor is Done, checks the production plan is not parked/finished, and scopes the final update by project and approved status. Any failed/zero-row update reports an error instead of success.
- The project-level `NextTenSection` no longer displays a mark-Done checkbox for unapproved action rows; it shows approval required instead.
- In `SetupTab`, the generic async helper returns whether a save actually succeeded. The Have It, Skip, Brand type and Top 3 setup dialogs now stay open on errors rather than silently closing when an underlying save failed.
- These are protected-branch source changes; full checks will run at the planned release gate. No feature build was merged or published here.

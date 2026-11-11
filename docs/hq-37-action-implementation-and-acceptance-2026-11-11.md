# HQ Guided Rebuild — 37-Action Source Inventory and Acceptance Plan

Updated November 11, 2026. Source baseline: draft PR #7, `hq-guided-workflows-2026-11-11`.
Source: the agreed `HQ_Brand_Pages_Fix_Plan.pdf` pages 3–4 and `HQ_Combined_Rebuild_Plan_v2.pdf`.

**Status rules:** Implemented = the intended source path or scoped database policy now exists, **not** a runtime pass. Partial = a dependency or missing capability remains. Every row below is **Acceptance: NOT RUN** until its actual button is exercised as the intended login and its saved effect is checked. Never claim full coverage based on source review alone. Retain the production database backup and do not publish before the release gate.

| # | Screen & action | Intended saved result / next screen | Current source path | Source status | Acceptance |
|---|---|---|---|---|---|
| 1 | Today — Done (task) | Persist Done and open the next eligible task | `BrandManagerPortal`, `PipelineJob`, `useCompleteNextTenRow` | Implemented | NOT RUN |
| 2 | Today — Open (task) | Open exact step instructions, not just the plan top | `pipelineHref(...,stepId)`, `PipelineJob`, `BrandManagerPortal` | Implemented | NOT RUN |
| 3 | Today — Done (post) | Open post first and require quality approval | `BrandWorkspace` / `ContentWorkflowDialog`, `useApproveItem` | Implemented | NOT RUN |
| 4 | Today — Open (post) | Open selected post script, caption, files, next action | `BrandWorkspace` / `ContentWorkflowDialog` | Implemented | NOT RUN |
| 5 | Today — Number tiles | Accurate metrics and manual weekly-number entry | `BrandWeeklyNumbers`, `useProjectKpis` | Implemented | NOT RUN |
| 6 | Today — Setup wizard/Continue | Client/bar wizard only on client projects | `ProjectHome`, `BrandWorkspace` | Implemented | NOT RUN |
| 7 | Accounts — Set up top 3 | Create needed plans, open the first, retain others | `SetupTab`, `BrandAccountSetup` | Implemented | NOT RUN |
| 8 | Accounts — Set up one account | Create/resume account plan and open its first step | `startSetup`, `SetupTab`, `BrandAccountSetup` | Implemented | NOT RUN |
| 9 | Accounts — Logo/fonts/colors setup | Open brand kit or relevant files; add logos and images to the assigned brand | `SetupTab`, `BrandAccountSetup`, `BrandManagerFileUpload` | Partial: brand manager can now upload files; changing brand-kit fonts and colors remains in the dedicated editor | NOT RUN |
| 10 | Accounts — Copy setup brief | Copy useful brand/setup guide with clear label | `SetupTab`, `BrandAccountSetup`, `buildSetupBrief` | Implemented | NOT RUN |
| 11 | Accounts — Owner use of controls | Scoped account confirmation, later, skip, undo, brand type, stats | `BrandAccountSetup`, `useBrandSetup`, scoped RLS migration 214500 | Implemented; assigned-brand INSERT and cross-brand denial checked in rollback | NOT RUN |
| 12 | Social accounts — Set up | Create/resume channel setup plan | `BrandWorkspace.ChannelDrawer` | Implemented | NOT RUN |
| 13 | Social accounts — Level/cadence/scheduler/method | Plain descriptions of each setting | `BrandWorkspace.ChannelDrawer`, `ChannelEditor` | Implemented | NOT RUN |
| 14 | Ways to make money — Mark on | Require confirmation and evidence; do not infer earnings | `RevenueLaneCard.markAlreadyRunning` | Implemented | NOT RUN |
| 15 | Ways to make money — Turn on | Real setup plan and first step | `RevenueLaneCard.startPlan` | Implemented | NOT RUN |
| 16 | Ways to make money — $/hour, 90-day est, priority | Explicit estimates distinct from recorded income | `RevenueLaneCard` | Implemented | NOT RUN |
| 17 | Products — Start production | Two primary choices: product type, chosen selling outlets; no fake methods | `CreatePipelineDialog`, `pipelineComposer` | Implemented; advanced options hidden behind disclosure | NOT RUN |
| 18 | Products — Pipeline | Open production plan | `BrandProductPlans`, `BrandWorkspace.ProductsTab` | Implemented | NOT RUN |
| 19 | Products — Owner product list | Read brand-linked products independent of creator; edits scoped | `useProjectProducts`, `channel_products`/product link RLS migrations | Implemented; read isolation previously verified by simulated auth | NOT RUN |
| 20 | Posts & videos — Open card | Open script, caption, assets, destination and history | `ProductionItemCard`, `ContentWorkflowDialog` | Implemented | NOT RUN |
| 21 | Posts & videos — Move to next step | Real saved production work; scheduling requires record, publication live link | `ContentWorkflowDialog`, `useAdvanceStage` | Implemented, manually confirmed scheduling distinguished from API verification | NOT RUN |
| 22 | Posts & videos — Approve | Quality ≥80 and zero hard failures, identify failures | `useApproveItem`, `ContentWorkflowDialog` | Implemented | NOT RUN |
| 23 | Audience — Make this | Generate useful content plan for audience question | `BrandWorkspace.IntelTab.makeAnswerPost` | Implemented | NOT RUN |
| 24 | Audience — Profile, briefs, dimension names | Plain explanations, “Formats that work in this niche” | `BrandWorkspace.IntelTab` | Implemented | NOT RUN |
| 25 | Files — Document rows | Read current HQ document text in-screen, original link when exists | `BrandWorkspace.DocRow`, `BrandManagerPortal` | Implemented; Start Here Google Doc/HQ text verified equivalent | NOT RUN |
| 26 | Plan — Recipe, Level, Money, Time | Admin detail only; clear text | `PipelineJob` | Implemented | NOT RUN |
| 27 | Plan — View instructions | Inline current step instructions | `PipelineJob`, `BrandManagerPortal` | Implemented | NOT RUN |
| 28 | Plan — Done | Persist completion and navigate to next available step | `PipelineJob`, `BrandManagerPortal` | Implemented | NOT RUN |
| 29 | Plan — Hand to Claude | Honest assignment and real next execution context | `PipelineJob.handToClaude` | **Partial / BLOCKED**: assignment is saved but Friday runner has not been verified; UI does not claim execution or date | NOT RUN |
| 30 | Plan — Queue | Remove button that only toggled a flag | `PipelineJob` | Implemented | NOT RUN |
| 31 | Plan — Take this step | Assign to the actual signed-in user | `PipelineJob.reclaim` | Implemented | NOT RUN |
| 32 | Plan — Copy prompt | Only admins can copy Claude starter prompt | `PipelineJob` | Implemented | NOT RUN |
| 33 | Plan — Cancel pipeline | Confirm stop; park plan and preserve history | `PipelineJob` | Implemented | NOT RUN |
| 34 | Next 10 — Mark on lane | Go to income opportunity setup; requires confirmation | `NextTenSection`, `AllProjectsNextTen`, `RevenueLaneCard` | Implemented | NOT RUN |
| 35 | Next 10 — Mark done product | Open product and production plan, no blind status advance | `NextTenSection`, `AllProjectsNextTen` | Implemented | NOT RUN |
| 36 | Next 10 — Mark done step | Verify actual update, refresh and show new highest priority | `useCompleteNextTenRow`, `NextTenSection`, `AllProjectsNextTen` | Implemented; dashboard refreshes next items (does not auto-open their detail) | NOT RUN |
| 37 | Admin Users — Assigned Bars | “Brands this person can manage,” hide prospects, require assignment | `CreateUserDialog`, `EditUserDialog`, `UsersTab` | Implemented | NOT RUN |

## Additional repaired paths not on the original button inventory

- The brand-manager Files page has a focused upload control for logo, images and documents, using existing project-scoped Supabase object storage and brand_kit_assets RLS; it has no destructive delete/archive controls. Full kit font/color editing stays in the dedicated owner/admin kit editor.
- Admin brand page can create and open an individual `content_items` draft in the same post editor.
- Production Board has a Published tab and reports a count from records with a saved live URL rather than a stage label alone.
- Manual posting plans cannot overwrite existing confirmed schedules. Duplicate manual schedule records for the same account/time and duplicate live links are blocked at the guided-editor level.
- The shared content approval mutation rejects already-approved items, verifies quality and saved row, and surfaces quality hard failures.
- Brand manager Today and My Plan exclude unfinished work from archived/finished production plans; archived work remains in history.
- Inactive plans are excluded from brand portfolio summaries and Waiting on Me.
- Revenue attribution uses real entries; estimated opportunity returns do not become reported revenue.

## Required acceptance evidence

Use the agreed 13 end-to-end journeys, then all 37 actions. For each: role (admin, Jenna brand manager, restricted client/bar staff as appropriate); project ID; route and button; initial state; observed UI; expected database row/table/status (or correctly no write); follow-up route; pass/fail; screenshot or query evidence; rollback or clean test data. **Test cross-brand reads and writes as authenticated, never just by hiding a component.** Verify responsive phone experience and public STM marketing routes after source validation, before merge/publish.

Do not silently reschedule overdue steps or assume a Claude Friday run, external scheduling integration, stored income, or staged disaster-recovery restoration without evidence.

## Read-only publication integrity snapshot — November 11, 2026

After the approved Big Paws Short B correction, live data contained **zero** content items at stage `scheduled` and **zero** content placements with status `scheduled`. Four content items were marked `published`; each had a corresponding published placement with a recorded live URL. **One historical published entry**, `Big dog, small back seat (the guide)`, has no content approval timestamp but does have a September 18, 2026 blog live URL and a saved public-verification run receipt. Preserve that historical record; do not retroactively invent approval or remove a real published link. At release, distinguish legacy publications from future content subject to the new approval gate.

This was a read-only inspection; no additional publication statuses were edited.

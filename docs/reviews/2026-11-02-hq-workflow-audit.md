# Supreme Team HQ workflow audit and repair

Review branch, 2 November 2026. These changes are prepared for review; they have not been deployed to the live website or database.

The strongest issue across the supplied screenshots and guide is the gap between what the interface appears to promise and what actually happens. Examples include a successful-looking promotion without a deal, capture items labeled routed without a destination, Queue implying a worker run, and absent audit data looking like a low revenue opportunity. This patch addresses those gaps and adds the requested readability, dashboard, navigation, and brand-scope improvements.

## Evidence and scope

Reviewed the 13 supplied screenshots, the supplied HQ Guide, repository source at `121b6604e1e38fedc03bbb2f9cc40c6c0fea5d58`, and selected live database schema through read-only Lovable queries. Screenshot content reflects the captured moment; it does not establish current delivery, revenue, or background-worker health.

- Repository: https://github.com/ceosupreme/powersai
- Lovable project: https://lovable.dev/projects/dc01aa48-8dd7-400a-b397-110a5d357bc1
- Guide source: `src/content/guide`; the in-app guide and downloadable guide are built from this source.
- No production rows, credentials, delivery settings, schedules or deployments were changed. No customer messages were sent.

## Requested issues

“Implemented” means implemented on this review branch, not confirmed in production.

| # | Issue | Result on the branch |
|---|---|---|
| 1 | Missing client lead notifications / emergency SMS | Partial: client captures now dispatch owner notifications; dispatch is awaited; emergency email fallback and truthful provider status added. A live SMS adapter, configuration and delivery test remain outstanding. |
| 2 | Inbound details missing | Implemented: phone, qualifier answers and transcript are visible. |
| 3 | Log-only customer email unclear | Implemented: prominent OFF warning; live mode requires a configured provider. This does not activate email delivery. |
| 4 | Industry clients using brand layout | Implemented: Project Home uses the shared project grouping rule. |
| 5 | CRM promotion and follow-up limitations | Implemented: promotion creates company, contact and Lead-stage deal in one transaction; stage selector, record editors and follow-up completion added. |
| 6 | Product project links lost | Implemented: picker includes accessible project types; existing links must load before Save. |
| 7 | Uploaded logos not recognized | Implemented: explicit Brand logo upload purpose and Use as logo action. |
| 8 | Strategy and avenue estimates not editable | Implemented: content pillars, mix targets and avenue estimates can be edited. |
| 9 | Duplicate avenue / channel pipelines | Implemented: repeated creation reuses an active job for the same target. Existing duplicates are not deleted. |
| 10 | Make this leaves orphan ideas | Implemented: content is created only with a successful pipeline; usage is derived from jobs without rewriting research. |
| 11 | Pipeline approval lacks quality gate | Implemented: UI and database require score >= 80 with no hard failures. |
| 12 | Cannot cancel or reclaim | Implemented: reversible cancel/resume and Take this step; paused jobs reject step updates. |
| 13 | Queue does not start or prioritize worker | Partial: copy now states that Queue only saves a marker. External worker scheduling and queue-first selection are not controlled by this repository and remain to be updated and verified. |
| 14 | Missing product playbooks silently skipped | Implemented: missing product methods and Written methods without steps block creation; Planned methods remain explicit prerequisites. |
| 15 | Audit setup links lead nowhere useful | Implemented: project-scoped admin website, Map Pack and AI search editors appear under Data Sources, with checklist anchors. |
| 16 | Sample campaign results / status requires Asana | Implemented: analysis requests live mode and surfaces errors; campaign detail has a manual status selector. Previously stored demo results are not rewritten. |
| 17 | AI failures silently return sample content | Implemented: live errors stay errors. Deliberately selected Mock mode remains available and labeled. |
| 18 | Capture routing only labels several types | Implemented: all six types create actual destinations and a durable link; destination creation and routing are atomic. Brand assets require a single file URL or direct upload in Brand Kit. |
| 19 | Backup omissions, truncation and hidden errors | Implemented: broader listed-table coverage, ordered paging, row counts and a partial-export manifest. Files, authentication, logs, chat and unlisted tables are not a complete system backup. |
| 20 | Client economics lack editor | Implemented: average sale and close rate in project settings; recovery estimates read these values before fallbacks. |
| 21 | Static task assignees | Implemented: current HQ profiles and linked Asana identities replace the fixed list. |
| 22 | Outreach placeholder names an unrelated venue | Implemented: neutral Business name placeholder. |
| 23 | Editing a user with no role reports success | Implemented: missing role rows are inserted; related write errors are checked. The legacy multi-table user editor is still not an atomic transaction; reopen after any save error. |
| 24 | Chat shows oldest messages / hides channels by name | Implemented: latest 100 messages, displayed in order; membership/access governs visibility; query cache is scoped to the signed-in identity. |
| 25 | Log intent is discarded | Implemented: the selected intent is persisted. Older entries are not backfilled. |
| 26 | Password minimums conflict | Implemented: existing passwords are accepted at login; signup/reset require eight characters. |
| 27 | Login defaults to first project | Implemented: no saved selection + multiple projects defaults to All projects. |
| 28 | Competing Help Center content | Implemented: old Help Center route redirects to Guide. |
| 29 | Brand users land on restaurant reports | Implemented: brands have dedicated Weekly Review and Insights views; Team points to Tasks/Chat. Client-location reports remain available. |

## Readability and navigation update

The local review includes the requested backend usability changes. The public site and production data have not been changed.

- Shared HQ styling uses an 18px base, darker text, clearer borders, stronger selected states, visible focus outlines, colored section dividers, and readable disabled controls. Display offers 18, 20, or 22px text plus light/dark appearance. These styles are scoped to authenticated HQ.
- Navigation has a searchable sidebar and a separate Content & Production group. Help explanations collapse, long tab lists wrap, and the main lists have labeled search, sorting, and filters.
- Owner sign-in opens Dashboard at /workspace. It includes relevant shortcuts, recorded activity, shared owner-work lists, and workspaces. Brand and client scopes are explicit.
- Brand cards use stable colors, large initials, and full names. Portfolio explains that every brand has a project workspace and that client businesses also have projects.
- Both the homepage's dedicated header and the shared public header have visible login links.
- Brand Weekly Review and Insights have dedicated views for saved scores, missing data, current activity, and next steps. Weekly reports use the selected week exactly; missing records are not silently replaced with a different week. Clients retain their operating reports, with useful empty and error states.
- Offers gains project assignment, backed by a migration and caller-visible project validation. Existing offers remain unassigned in an explicit shared library. The main selector filters assigned offers. No historical offer is guessed into a brand.
- Products, Production Board, Playbooks, and Marketing Hub follow the main selection. Product deep links still apply their linked brand. Account-wide CRM and Capture Inbox retain explicit scope descriptions.
- Marketing Hub shows an actionable first-campaign state, surfaces read errors, scopes new drafts to the selected workspace, exposes sorting, and limits upcoming campaigns to the next seven days. Drafts remain in Needs attention. This does not configure integrations or create campaign data.

## Verification

- Clean dependency install succeeds after repairing the stale package lock. The existing locked Supabase SDK version, 2.89.0, is retained.
- TypeScript app check passes.
- 173 frontend, security and database tests pass. Coverage includes promotion, routing, rollback, denied access, pause/resume, quality approval, brand filtering, login routing, brand-color contrast, and offer assignment under row access rules.
- Guide structure, routes and plain-language formatting checks pass.
- Vite production compilation and metadata generation complete. Optional full public-page prerendering falls back to route-specific SPA metadata because Python Playwright is unavailable in this environment.
- An isolated browser preview of the actual editor components verifies the visible empty-audit state, disabled Save for an invalid 90% content mix, and the company-edit save/close interaction. It uses synthetic data and a mocked save hook, not production persistence. The actual-component readability preview also verifies Dashboard, brand reports, scoped Offers, and Marketing empty states at desktop and phone widths. Extra-large text and dark mode are checked in the isolated preview. A full authenticated staging smoke test remains required.
- Database tests use a focused PostgreSQL fixture. They are not proof that every historical migration can rebuild the entire live schema from zero.

## Rollout and remaining work

1. Review this branch and apply `20261102010000_hq_workflow_integrity.sql` and `20261102020000_hq_offer_projects.sql` to staging against the current schema. The live production-job schema was confirmed, but its original creation migration is absent from this checkout; validate migration lineage before a fresh-environment install.
2. Deploy the database migration before the frontend that calls the new functions. Deploy the changed intake, notification, emergency-alert and recovery-report functions together. The migration uses caller permissions and existing row-access rules.
3. Run authenticated staging checks: promote a New and a Reviewed lead; verify phone and deal; route each capture type; save/reopen a product with non-channel links; save a logo and strategy; create the same pipeline twice; reject approval at 79 or with failures; cancel/resume and reclaim; edit a roleless test user; verify a long chat and a >1,000-row export.
4. Verify a real owner-email receipt and client capture alert using an authorized test recipient. Check provider acceptance separately from delivered status. Configure the SMS provider and a real adapter before promising SMS. No live delivery was tested in this review.
5. Update the external production worker to prioritize eligible manually queued steps, then priority and age; preserve dependency gating, active-brand checks, paused-job exclusion and output-link requirements. Observe a real run and its resulting records.
6. Review previously stored demo campaign results, old captures marked routed without a linked record, and existing duplicate jobs manually. This patch intentionally does not rewrite or delete historical business data.
7. Confirm a full authenticated desktop/mobile smoke pass before merge and release. If a frontend rollback is needed, the migration is additive and can remain while the old frontend is restored.

The branch is suitable for review and staging validation. It is not a certification of live delivery, complete database recoverability or background-worker execution.

## Release preflight, 2 November 2026

The production schema check found that content creation must set created_by explicitly to satisfy the existing insert policy. Capture routing and pipeline content creation now set the authenticated creator, with a regression test using that policy. Both migrations and owner-role checks for promotion, all six capture types, pipeline retry/advance/pause/resume, content approval, and offer assignment succeeded in one rolled-back transaction against the current live schema. No test records or schema changes from that preflight were retained. This check does not replace a signed-in browser check or external delivery verification.

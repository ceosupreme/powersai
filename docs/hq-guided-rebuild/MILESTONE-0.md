# Guided brand rebuild — execution checkpoint

Baseline: `cf89753fedd26b540056576c439009abc8be7b7b` on `main` (2026-11-11).

This branch is **not published**. The baseline SHA is the source-code rollback point; the branch is *not* a database backup.

## Scope

Improve the existing brand workspace without changing published site behavior, deleting data, renaming persisted workflow statuses, or giving brand operators admin rights.

Milestone gates:
0. Capture baseline, audit database/permissions, independently restore-capable backup, automation dependencies, and click-through inventory.
1. Verify brand membership and record-level read/write permissions in production-like authenticated test sessions; preserve client/staff access.
2. Brand-manager Today/My Plan/Post/Files and guided step execution with useful errors.
3. Make every labelled action real: setup plan navigation, content details, scheduling confirmation, appropriate product recipes, evidence-based revenue status.
4. Test 37 action paths, 13 user journeys, scheduled jobs and public pages; publish only after explicit review.

## Current protection status

- GitHub branch created from the baseline; code changes can be reviewed before merge.
- Lovable API connector for database/project inspection returned internal errors. **No database snapshot has been verified**.
- Do **not** apply RLS, schema, user assignments, cleanup or production data changes without an independently recoverable snapshot.
- Do **not** merge or publish these code changes until data authorization and live integration tests pass.
- Keep existing persisted status identifiers unchanged for existing scheduled jobs.
- Browser role preview is a UI simulation, not proof of row-level authorization.

## Initial test inventory

- Login: admin/brand-manager/contributor/client/staff separation.
- Authorization: assigned brand read/update/create; cross-brand read/update/create denied.
- Content: open, edit, stage, proof of scheduling and publication.
- Plans: create and immediately open; route to individual steps; completion persists and next step appears.
- Money lanes: manual running confirmation separated from actual earnings and forecasts.
- Documents: current version opens, without leaking shared internal documents.
- Jobs: no fake 'queue started' messaging; preserve existing agent cadence.
- Production site smoke check after code release.

This file is a working implementation log, not evidence that these tests have passed.

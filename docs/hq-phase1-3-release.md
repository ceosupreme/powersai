# Supreme Team HQ — Phase 1–3 implementation and activation record

Plan of record: `Supreme-Team-HQ-Audit-and-Upgrade-Plan-v1-1-merged-2026-10-28.pdf`.
Work resumes from Claude's commit `c80197992684a6387b461a1f918b2e930a5f3019`.
This release preserves that commit and the live cleanup already completed by Claude.

## Release boundaries

The owner authorized continuation of the interrupted Phase 1–3 fixes. This release
includes the Phase 2b automation prerequisites identified in the merged plan. It
does not implement the Phase 4 redesign, Phase 5 dependency/backup cleanup, or a
rewrite of the root README or Lovable project knowledge. No Lovable AI build
messages, real customer messages, test purchases, or paid API test requests are
part of validation.

## Activation status

| Component | Status | Evidence / remaining step |
| --- | --- | --- |
| Claude's initial Phase 1 changes and data cleanup | Preserved | Base commit above; live inspection confirmed cleanup and removal of the two ineffective cron jobs |
| Phase 2 database prerequisites | Live | Migration `20261029010000` applied and recorded transactionally after a real-schema rollback preflight |
| Phase 2b database prerequisites | Live | Migration `20261029020000` applied and recorded in the same transaction |
| Frontend continuation | Published and public smoke check verified | Release commit `d3d708ee43a4023b8582e7aae89d66b68078353c`; production loads verified `index-B97P0J7V.js`; signed-out `/workspace` redirects to `/auth` |
| Protected server functions and Phase 2b workers | Code ready; not deployed | Deploy all 119 handlers and matching shared modules/config through authenticated backend deployment |
| Secret-column removal and scoped scheduler credentials | Pending coordinated deployment | Apply exact migration `20261029011000` only after the corresponding functions and frontend are live |
| Internal numbers collector | Live and initial run verified | Migration `20261029030000`; 127 definitions checked, 15 supported measurements, 112 explicitly unsupported, no source failures |
| Verified external observations | Live; Big Paws Shopify mapping activated | Migration `20261029040000`; one real month-to-date net-sales observation ingested with its receipt and trial-store status |
| Weekly collection | Created and enabled in ChatGPT | Supreme HQ numbers, Sunday nights Pacific, starting November 1; first unattended run not yet observed |
| Remaining external measurements and KPI targets | Source-specific activation required | 106 targets remain unset; Stripe/Metricool access and further mappings remain outside the active collector |

GitHub source synchronization and Lovable frontend publishing do not deploy
Supabase server functions. Therefore a merged commit, successful frontend build,
or database migration is not evidence that the new edge authorization, public
rate limits, reply handling, or final-send checks are active in production.

## What this continuation fixes

### Attention, permissions and measurement display

The continuation preserves Claude's priority/ranking/snooze/weighting fixes, then
closes the remaining failure-state and session-boundary gaps. Completed or rejected
actions leave attention queues, open actions with NULL status remain visible,
approved execution stays in Next 10, and Waiting on me contains decisions. Shared
work is deduplicated across projects. Due dates use calendar days.

The Next 10 distinguishes healthy zero, partially checked sources, and no available
sources; nested Money Lane failures propagate to that distinction. Data failures
are also disclosed in exports. Task mutations refresh task lists and badges.
The Sculpture upload hook-order failure is corrected.

Sign-out and identity changes clear private query state and remount dependent
providers. Non-admin permissions start empty and failed/missing permission lookups
remain closed. The client approvals route remains explicitly assigned.

Scores show reporting week, measured/total coverage, missing targets, and input
age. Completed reporting periods retain their original dates. Automatic KPI
sources do not create weekly manual-entry prompts.

### Security

The live database prerequisites close the invitation-metadata role-spoofing path,
scope role helpers, separate client review from project management, restrict queue
field changes, and require admin for brand-kit writes. Anonymous and authenticated
callers cannot execute the arbitrary HTTP/advisory-lock helpers or private worker
RPCs. New internal tables have RLS and explicit grants.

The undeployed edge implementation classifies every current handler. Its shared guard validates
real user sessions and server-owned roles, restricts project operators, accepts
only exact service credentials or function-scoped job credentials, and fails
closed when authorization dependencies fail. Public funnels retain bounded,
durable admission rules. Audit unlock is atomic and replay-safe. Provider
kill-switch configuration failures stop governed integrations rather than
silently enabling them.

The public signup provider setting still requires verification through an
authorized Auth settings surface. The database trigger denies roles to public
self-signups in the meantime. Existing users were not removed or downgraded.

### Automation follow-through

New worker code stops follow-up on a matched incoming reply, rechecks approval,
recipient suppression, enrollment, project and run state immediately before
sending, and retains stable provider idempotency keys. An ambiguous outcome is
unconfirmed and requires reconciliation rather than an automatic duplicate send.

Approval state and delivery evidence are separate. Logging, provider acceptance,
delivery, failure and bounce are distinct. Verified provider receipt events survive
arrival before the send-result write; bounces also suppress future sends. The
Resend webhook requires its actual signing secret and appropriate event
subscriptions before deployment. Until a receipt arrives, provider acceptance is
not called delivery.

Inbound forwarding retries have durable leases and bounded backoff. The client
approval digest resolves actual assigned clients and deduplicates sends. Report
regeneration preserves edited/reviewed/sent narratives, including concurrent edits.
Checkout reconciliation paginates with a fixed window and durable cursor.

## Deployment order and operating checks

See [the security deployment guide](../scripts/security/README.md) for the exact
staged sequence and endpoint inventory. Do not run a blind `supabase db push` or
`--include-all`: the existing live migration history differs from repository
history, and the cutover is deliberately held until the code is deployed.

1. Preserve and verify already applied prerequisite migrations.
2. Verify provider secrets, especially `RESEND_WEBHOOK_SECRET`, through the backend
   secret store; never put a secret in git, the browser, or this document.
3. Deploy all guarded handlers with their matching configuration and shared code.
   Never apply `verify_jwt=false` independently of the in-handler guards.
4. Release the matching frontend and verify actual administrator, assigned-client,
   assigned-manager, unrelated-manager and signed-out behavior.
5. Apply and record only the approved cutover migration. Preserve cron active flags;
   do not reactivate paused jobs. The cutover aborts if either formerly empty secret
   column contains data.
6. Confirm actual scheduler outcomes and signed webhook receipts before a client
   sequence goes live. Use a separately authorized safe test recipient for any
   delivery test. Local mocks do not prove provider delivery.

## Numbers collected and remaining measurement limits

The initial internal run checked all 127 definitions. It wrote seven flow
measurements for the week of October 19 and eight snapshots for the observed week
of October 26. There were no source-query failures. Unsupported definitions were
logged explicitly, all 106 missing targets remained unset, and no revenue ledger
rows were invented. The current 21 configured targets were preserved.

The Big Paws store association was confirmed by its Lovable project knowledge and
the exact connected Shopify domain. A complete ungrouped ShopifyQL query in USD,
with an explicit Pacific month-to-date window, supplied the separate store-sales
observation. Its private receipt stays in the HQ observation table. The business
value is not copied into this public repository. The mapping uses Shopify
`sales.net_sales`; coverage is that store only, and its trial status remains
explicit. Other brand income and paid-store readiness are not inferred.

Big Paws monthly visitors remain missing: Lovable returned different totals for
the same requested month-to-date interval with hourly and daily grouping, and its
boundary buckets did not establish the requested distinct monthly count. A sum
of buckets is not substituted for the configured visitor KPI.

The scheduled task refreshes internal measurements and the verified Shopify
metric, preserves manual values, logs missing sources, and leaves targets and
the revenue ledger alone. See [the collector contract](../ops/hq/collector-contract.md),
[task instructions](../ops/hq/weekly-collector-task.md), and
[target review](../ops/hq/kpi-target-review.json). The private Claude Project
Scorecards document was not accessible, so proposed replacement targets were not
represented as its approved contents.

## Verification record

The final combined frontend TypeScript check and production Vite build passed.
[Pull request #1](https://github.com/ceosupreme/powersai/pull/1) was merged, Lovable
synchronized the exact merge commit, and the frontend was published. A live browser
loaded `https://supremeteammedia.com/` with the same `index-B97P0J7V.js` bundle as the
verified local production build. A signed-out visit to `/workspace` redirected to
the rendered `/auth` login screen. This is a public/signed-out smoke check, not an
authenticated owner/client browser verification.
The public-route metadata build completed. Full local browser prerender remains
unverified: the environment initially lacked Playwright and the isolated browser
runtime subsequently failed to launch. Public-data network fetches also used the
existing metadata fallback. This does not count as a successful browser check.
Auth, frontend attention, provider send-adapter, automation state, and real
PostgreSQL migration behavior have local regression coverage. The live SQL
preflight rolled back successfully, then the applied prerequisites were checked
for invitation provenance, private RPC privileges, queue policy separation,
delivery metadata and RLS. The internal collector was also executed against real
source records inside a rollback preflight before live application. One transient
lock timeout left no migration or data behind; a subsequent transactional retry
and the first live collection completed successfully. The external ingress passed
its own live-schema rollback preflight before application.

Local verification includes all 119 handler classifications/guard placements,
41 security boundary cases, 24 frontend regressions, 29 automation behavior cases,
and 21 collector/ingress PostgreSQL cases. The webhook also rejects oversized
chunked bodies while preserving the exact bytes for signature verification.

No authenticated owner/client browser session or newly deployed worker has yet
been verified. Those limits must remain explicit in any handoff or completion
message. The live voice endpoint's harmless OPTIONS response confirmed the
existing disabled state, so the new private voice handshake can wait for the
matching server deployment without re-enabling the paused integration.

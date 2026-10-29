# Phase 2 security deployment and verification

## Deployment status on 2026-10-29

The coordinating agent executed both prerequisites (`20261029010000` security and
`20261029020000` automation) in a real-schema transaction with ROLLBACK, verified
that preflight left no tables or migration records, then applied and recorded both
transactionally. Those database protections and supporting RPCs are live.

The matching frontend is published from commit
`d3d708ee43a4023b8582e7aae89d66b68078353c`; its production bundle and signed-out login
boundary were checked in a live browser. The guarded edge code, provider secret
verification and `20261029011000` cutover remain pending. The available connections
do not provide an authenticated backend deployment capability. A passing local build or these database
migrations alone does not establish that all public endpoints are secured. Existing
public handlers still need the code deployment for durable admission, atomic unlock,
and mandatory webhook signature behavior to take effect.

Remote migration history has versions/names that diverge from repository history.
**Do not run a blind `supabase db push` or `--include-all`.** Apply only the exact
approved pending cutover SQL after functions/secrets/frontend are ready, and record
its version and statements deliberately. Do not replay already applied prerequisites.

## Entry-point contract

`supabase/functions/_shared/edge-policies.ts` explicitly classifies all 119 current
edge handlers. There is no permissive default. `auth-guard.ts` runs before each
handler performs its business work.

- 99 privileged handlers require a user validated by Supabase Auth with an actual
  admin role, the exact server service credential, or a function-scoped job token.
- Five operations accept an assigned project manager: applying a bundle, computing
  a leak stack, undoing a content automation, drafting a review request, and drafting
  a reactivation run. Resource IDs are resolved to projects on the server before
  `user_can_manage_project` is checked with the real caller's JWT.
- Transcription, metric interpretation and the private voice interview accept real
  non-client team members and are limited per user. Private voice carries its session
  in the `hq-auth.<jwt>` WebSocket subprotocol; only `hq-realtime` is selected by the
  server. The token is never added to the URL.
- Eleven public handlers retain the public funnel, checkout, token-protected shared
  report, and public voice experience. They use durable rate limits (below).
- The Resend webhook requires a valid raw-body Svix signature. A missing secret fails
  closed; a service bearer does not substitute for a provider signature.

A publishable key is not a user. Human authentication calls Auth's user endpoint;
role claims are not trusted through local JWT decoding. Role/service dependency
errors return 503; a disallowed caller returns 401/403. OPTIONS remains a harmless
preflight. Unknown handlers fail closed until added to the manifest.

`config.toml` explicitly sets `verify_jwt=false` for these handlers because the
in-handler gate supports human sessions, private WebSocket subprotocols, scoped
jobs and provider signatures. **Never deploy this config without the corresponding
protected handlers.** Some legacy handlers also retain a stricter human admin check
for user-management actions; the shared gate does not weaken those checks.

## Database stages

### Prerequisites: `20261029010000_phase2_security.sql`

This prerequisite is already applied and recorded live. It intentionally makes no HTTP requests.
It revokes anonymous/authenticated arbitrary HTTP and advisory-lock helpers, but
preserves service/postgres execution. RLS-used role helpers retain EXECUTE and are
caller-scoped instead of being blanket revoked.

The signup trigger creates a profile but grants no role to self-signups, even if
raw user metadata claims `invited_role=admin`. Role creation requires Auth's real
`invited_at` provenance and a recognized invited role. Existing users are not
deleted or downgraded. The new, undeployed administrator create/invite endpoint code always
upserts the requested role using the existing `user_roles(user_id)` unique key.
Also disable public signup in the Auth dashboard/provider settings; the trigger
is a second boundary, not a reason to keep unwanted account creation enabled.

The broad project helper excludes clients. Dedicated approval policies check the
actual assigned project and enrollment's `approval_mode=client`. Clients can
review pending messages but cannot insert/delete queue rows, change recipients,
or mutate delivery fields. Approval provenance is stamped from the caller.
Managers need both membership and a management role; they cannot forge receipts
or reset an unconfirmed/bounced message to force a retry. Brand-kit writes,
including its storage bucket, require admin. Three internal template libraries
exclude clients and accounts without an assigned role. The designated client
approvals page remains enabled in role defaults.

The migration also creates the durable rate-limit counter, atomic audit unlock
RPC, and scoped job verifier. Existing handlers continue using their previous
intake/cron behavior until the new code is deployed. Applying this stage alone
therefore does **not** activate public rate limits, replay-safe intake, mandatory
webhook signatures, or all edge authorization gates.

### Automation prerequisites: `20261029020000_phase2b_automation.sql`

The automation agent's prerequisite is already applied and recorded live. Its
worker state, delivery evidence and final-send RPCs are service-only. It does not
send messages. Review its own behavioral tests and implementation notes.

### Coordinated code deployment

From a checkout of the reviewed release, an authorized operator with the Supabase
CLI installed can authenticate and deploy the complete functions directory:

```bash
supabase login
supabase functions deploy --project-ref llanezccussjtzzrbrtq
```

The project reference is fixed to this HQ. The deploy command intentionally omits
a function name so all 119 handlers and their configuration are included. Follow
the staged checks below before and after that command; it does not run database
migrations. See the [official deployment guide](https://supabase.com/docs/guides/functions/deploy).

1. Verify the already applied prerequisite versions and grants/functions; do not replay them.
2. Arrange the function deployment and a short scheduler maintenance window if
   needed. Record existing cron active flags; avoid enabling previously disabled jobs.
3. Deploy all 119 guarded edge handlers and their shared modules/config together.
   Set/verify the real `RESEND_WEBHOOK_SECRET` through the provider's secret store.
   Do not put it in git or a browser. Verify service environment variables exist.
4. Verify the already published frontend uses the private voice subprotocol and no
   longer reads or submits the removed secret fields. Verify actual admin, assigned client,
   assigned manager, unrelated manager, and signed-out sessions.
5. Apply the cutover migration below promptly so the scheduler and DB triggers send
   the newly accepted scoped job credentials. A legacy anon-key cron is deliberately
   rejected by the new guard until this cutover.
6. Confirm a scheduled run records its expected outcome. Verify rejected requests
   do not spend credits or mutate rows. Check public flows with synthetic data and
   approval/send controls with a safe test recipient; do not infer external delivery
   from an HTTP 200 or an internal `sent` label.

### Cutover only: `20261029011000_phase2_deployment_cutover.sql`

The numeric filename precedes the automation prerequisite for historical grouping;
apply the **named stages above**, rather than blindly applying every pending file.
This migration is still pending. Hold it until the corresponding handlers/frontend and provider secrets are ready; then apply this exact file and record version 20261029011000.

It aborts rather than discarding data if `venues.toast_client_secret` or
`venue_profiles.safe_combo` has acquired a nonempty value. Only then are the
formerly empty columns removed. Toast handlers now use server environment secrets.

It creates random function-scoped credentials in Supabase Vault and stores only
hashes/references in the private job table. The service-only dispatcher accepts
registered function names and builds a fixed project URL; it is not an arbitrary
HTTP proxy. Existing queue, stop-condition, recovery and checkout schedules retain
schedules and active flags while their commands change. Deleted/disabled duplicate
jobs are not recreated. Content publication and Asana-source backfill DB triggers
use the dispatcher too. The existing checkout token remains supported by the guard.
Applying the cutover itself does not invoke the dispatcher or send messages.

### Private voice remains paused during this deployment gap

Live configuration already includes `openai_voice` in `integrations_disabled`.
Keep that existing flag until both the frontend subprotocol and guarded server
proxy are deployed and their handshake is verified. Publishing the frontend before
the proxy must not be accompanied by re-enabling private voice. There is no
compatibility flag or tokenless fallback. Unknown/error flag reads also keep the
frontend controls paused. Public voice qualifier is a separate endpoint and still
needs its own guarded code deployment for the newly added admission/lifetime caps.

## Public admission and spend bounds

Limits are declared alongside the explicit endpoint policies. The edge hashes
addresses/recipient emails with an HMAC before using the database counter; raw
IP addresses and emails are not stored by that counter. Each accepted public
request consumes both its address allowance and its global daily budget.

| Endpoint | Per-address window | Global daily maximum |
| --- | ---: | ---: |
| Run public audit | 5/hour | 100 |
| Poll public audit | 180/minute | 20,000 |
| Unlock public audit | 12/hour | 500 |
| Submit inbound lead | 5/minute | 500 |
| Create checkout | 10/hour | 500 |
| Verify checkout | 60/minute | 5,000 |
| Qualifier chat | 30/hour | 1,500 |
| Qualifier configuration | 120/minute | 10,000 |
| Public venue resolver | 60/minute | 5,000 |
| Shared recovery report | 60/minute | 5,000 |
| Public voice qualifier | 3 connections/hour | 100 |

The inbound form also limits acknowledgments to three submissions per recipient
per day, preventing a caller from rotating addresses to repeatedly email one
recipient. The public body limit is 128 KiB. Qualifier messages/transcripts have
item/length caps, chat has a bounded output request, and public voice has a five
minute lifetime, bounded inbound bytes, and server-owned session policy. The
client cannot replace the model/tools/session through the voice proxy.

Address throttling uses the rightmost forwarded peer with a fallback; verify the
actual ingress forwarding behavior during deployment. The independent global
budget limits spend even if an address header is spoofed or addresses rotate.
Shared networks may reach address limits; adjust only the declared budgets after
measuring real traffic. These controls do not claim to solve distributed abuse or
serve as an application firewall. Anonymous direct `site_events` analytics inserts
(S7, expressly optional in the plan) remain unmodified; analytics is not a trusted
security or billing record.

Audit unlock takes a database row lock and inserts its one lead plus capture
marker in the same transaction. Replays return the existing result without a
second lead/owner notice. A failure rolls back the capture marker so a real retry
can succeed. Owner notification is dispatched only for a newly committed capture;
a process crash after commit but before the notification can still lose that
notification. It cannot multiply owner emails through repeated unlocks.

## Final frontend boundary review

Realtime chat keys include both channel and user identity. Subscription cleanup
aborts pending lookups and deactivates callbacks that were already awaiting a
response, so they cannot refill the cleared cache after an identity change.
Brand-kit mutations invalidate/refetch with the current session instead of placing
an old mutation response into the shared cache. Verified global clients retain the
client layout and approvals home even when a legacy venue role is present.
The existing frontend integration flag query fails closed while loading or on an
error, so a paused provider cannot start briefly before its flags arrive. The
role/page gate remains fail closed when role/default lookups fail or return empty.

## Integration configuration failures

The shared provider kill-switch now checks Supabase query errors, missing rows and
malformed values. With no trustworthy configuration it returns a typed unavailable
state that the guard turns into 503. A previously known disabled integration stays
off during an outage. A stale previously enabled state cannot reopen a provider.
A successful configuration is cached for 60 seconds. The capture classifier now uses
the response guard too, so configuration errors stop it before any AI request.

## Local tests (no live services)

Use Node 24+ and an installed `@electric-sql/pglite` module for the PostgreSQL suite.
No package dependency changes or lockfile updates are required just for this audit
runtime. `HQ_PGLITE_MODULE` can be an absolute path to its `dist/index.js`.

```bash
node scripts/security/check-edge-guards.mjs
node scripts/security/auth-guard.test.mjs
node scripts/security/public-intake.test.mjs
node scripts/security/integration-disabled.test.mjs
node scripts/security/frontend-boundaries.test.mjs
HQ_PGLITE_MODULE=/path/to/pglite/dist/index.js node scripts/security/database-security.test.mjs
```

The checks cover all 119 classified/guarded handlers, twelve auth/role/project/job
boundary cases, six actual mocked intake/voice cases, five provider configuration
failure/cache cases, four frontend identity/availability boundary cases, and fourteen PostgreSQL
cases executing the actual migrations. PostgreSQL tests include RLS restrictions,
protected queue fields, role spoofing, concurrent/repeated capture, rollback on
lead insert failure, grant revocation, real generated scoped token behavior,
scheduler preservation and aborting a populated-column drop. Vault, cron and
network extensions are local test stubs; their live integration still requires
post-deployment verification. The automation agent adds its own send/worker tests.

`check-edge-guards.mjs --apply` is an idempotent integration helper; the default
mode is read-only. It requires a manifest classification for every handler and
checks that the shared guard is the first handler operation. The manifest is the
reviewable inventory; generated application code must not silently gain an open
endpoint in the future.

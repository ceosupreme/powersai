# HQ numbers collection contract

The SQL collector measures supported HQ records, keeps source dates, and logs every active own-brand KPI it can or cannot fill. It changes no targets, writes no revenue ledger rows, and makes no external requests. The Sunday-night ChatGPT collection task is enabled; its first unattended run has not yet occurred.

Both migrations below were applied and recorded live after rollback preflights, in this order:

1. `20261029030000_hq_numbers_collector.sql`: internal measurements, run/check logs, provenance, manual ownership guard.
2. `20261029040000_hq_external_observations.sql`: optional verified mapping and observation ingress for provider reads performed elsewhere.

Both entry points require a verified admin, the service role, or a trusted direct database-owner session. Anonymous callers cannot execute them. Authenticated staff and client roles fail the explicit guard. Logs and mappings are readable only by admins and service callers. The migrations do not change deployed edge functions or cron jobs.

## Internal collector

```sql
SELECT public.collect_hq_numbers(
  p_week_start => NULL,
  p_run_key => 'hq-internal-initial-2026-10-29'
);
```

`p_week_start=NULL` collects flow events in the last completed Pacific Monday–Sunday week. A supplied date must be a Monday no later than the current Pacific week. All timestamps are calculated with `America/Los_Angeles`, including daylight-saving changes. End timestamps are exclusive.

Snapshot metrics use the actual observation instant and the current Pacific week, even when the requested flow period is the preceding week. The initial run must not claim that today's catalog or waiting queue existed at the preceding Sunday's close.

For a Sunday-night collection, derive the intended Sunday so a delayed Monday retry still belongs to the correct flow week:

```sql
WITH period AS (
  SELECT (now() AT TIME ZONE 'America/Los_Angeles')::date
    - extract(dow FROM now() AT TIME ZONE 'America/Los_Angeles')::integer AS sunday
)
SELECT public.collect_hq_numbers(sunday-6,'hq-weekly-internal:'||sunday::text) FROM period;
```

A run performed before Sunday midnight stops at the actual observation time and returns `period_complete=false`; a delayed run after the period closes uses the true closed window. It does not count future minutes through midnight. The following completed-week display may use that dated partial report; its exact end remains in provenance. A later completed-period refresh must use a new run key. Never invent a midnight timestamp or copy values into the following week.

Reusing a run key returns the original result with `replayed=true` and performs no new reads or writes. Reusing a key for another reporting week is rejected. With no explicit key, the default key combines the requested flow week and current Pacific date; use an explicit new key for a fresh same-day measurement. Advisory locks prevent concurrent retries from duplicating the run. A new run updates an existing collector-owned value for that same project/week/KPI rather than appending another value.

### Supported initial mappings

The reviewed set has 127 definitions. Fifteen have a defensible internal mapping: seven flow metrics and eight snapshots. Actual writes can be fewer when source data is incomplete or a manual observation is protected.

| Project | Mapped definitions | Meaning |
| --- | ---: | --- |
| Allmighty Supreme | 2 | Short-form publications; listed books |
| Big Paws Club | 4 | Listed products; verified videos/reels; verified repurposed content; oldest owner decision |
| Coastal Beauties | 1 | Oldest owner decision |
| Kario Voss | 1 | Verified short videos |
| Supreme Survival | 2 | Listed products; oldest owner decision |
| Supreme Team Media | 3 | Verified content posts; trade-attributed audit starts; scoped inbound leads |
| Supreme Wellness | 2 | Recorded live listings; listed KDP titles |

A Squared Media, BarPulse and DJ Redlite have no sufficiently supported internal mappings in this version. Their unsupported definitions remain recorded as blocked checks. Exact project IDs, formats and source references are in `collector-config.json`.

**Verified publications:** a published content item must have an actual publication timestamp inside the requested window and a published placement for the same project with a verification timestamp and a live URL or platform post ID. A shared item counts once across multiple placements. If publication records exist but none has a verified receipt, the collector records unavailable proof instead of asserting zero. Where some items are verified, coverage reports the excluded unverified count. These are HQ-verified records; external platform reconciliation is not implied.

**Catalog snapshots:** only `product_listings.status='listed'` rows joined through `channel_product_channels` count. Product counts are distinct by product; listing counts are distinct by listing. Book/KDP mappings currently recognize the explicit `Amazon KDP` and `Kindle` outlets. Other book classifications remain outside that count. Listing status is the HQ catalog's record, not a new remote marketplace verification.

**Oldest waiting decision:** open Proposed, Pending, Unreviewed or null-approval items qualify, using both legacy project-reference columns. Completed, approved, rejected and future-snoozed work does not qualify. The value is elapsed whole days from the oldest qualifying creation timestamp. An empty checked queue is a real zero.

**STM audit requests:** only `audit_start` events attributed through `src='for-'+vertical` with matching safe vertical, or a `/for/{vertical}` path, qualify. Internal/fixture sources are excluded. Sessions are distinct; home-page and unknown attribution are excluded and counted in coverage. Audit starts are not audit completions. If qualifying starts lack session IDs and no valid sessions can be counted, the collector does not assert zero.

**Inbound leads:** `captured_for_project_id` selects the project. Unassigned site leads belong only to Supreme Team Media. Explicit fixture flags, test/fixture/smoke source markers and reserved email domains are excluded; ordinary names containing “test” are not automatically discarded. The collector counts lead records, not inferred qualified opportunities.

### Results and coverage

`hq_number_collector_runs` stores the requested flow window, observation time, completion flag, status and summary. `hq_number_collector_checks` stores one check per active definition with `value_week_start`, `measurement_kind`, status, source reference, scope and reason. Unmapped definitions have no invented period or measurement kind.

Useful verification queries:

```sql
SELECT id,run_key,status,observed_at,summary
FROM public.hq_number_collector_runs
ORDER BY started_at DESC LIMIT 5;

SELECT value_week_start,measurement_kind,status,count(*)
FROM public.hq_number_collector_checks
WHERE run_id = '<returned run_id>'::uuid
GROUP BY value_week_start,measurement_kind,status
ORDER BY value_week_start,measurement_kind,status;

SELECT project_id,pillar_key,kpi_key,status,reason,coverage
FROM public.hq_number_collector_checks
WHERE run_id = '<returned run_id>'::uuid AND status <> 'collected';
```

The global definition count is not one week's coverage denominator when flow and snapshot periods differ. Read `coverage_by_period` or group checks by `value_week_start` and `measurement_kind`.

Missing external observations are blocked, not filled with zero. An existing manual or other-provider value is retained; the candidate internal count appears only in the check's coverage metadata. The database's existing KPI-to-pillar trigger recomputes scores on accepted measurements. A definition becomes `source='auto'` only after a successful automatic write. Targets remain unchanged; actuals can exist without a score while target approval is pending.

## Verified external observation ingress

The ingress accepts observations from completed provider reads. It does not contact a provider, prove a receipt's remote authenticity, or infer that a connector's existence makes a business operational. The invoker must first verify the exact account, project, KPI meaning and source reference against real evidence.

Create or update one explicit mapping:

```sql
SELECT public.verify_hq_external_metric_mapping(
  p_project_id => '3561a251-f669-4d5e-a34b-6c8479e034fa',
  p_pillar_key => 'revenue',
  p_kpi_key => 'store_sales',
  p_provider => 'shopify',
  p_account_ref => 'big-paws-tested-zoi7f-uamjq3d2.myshopify.com',
  p_source_ref => '<exact verified provider query/metric reference>',
  p_measurement_kind => 'flow',
  p_window_basis => 'month_to_date',
  p_verification_ref => '<reference to account, project and metric verification>',
  p_currency => 'USD',
  p_enabled => true
);
```

This example names the known Big Paws account and existing USD KPI but contains deliberate evidence placeholders. It is a contract example, not an instruction to register an unverified financial source. Mapping verification does not write any KPI value. Each mapping revision increments `mapping_version`; a prior receipt cannot silently be reused under a changed mapping.

Accepted providers are `shopify`, `stripe`, `metricool` and `lovable`. `window_basis` is `week`, `month_to_date` or `snapshot`; the latter requires `measurement_kind='snapshot'`, and the others require `'flow'`. A KPI with an explicit currency unit must use that currency.

Submit a measurement with real timestamps and a receipt:

```sql
SELECT public.ingest_hq_external_observation(
  p_mapping_id => '<returned mapping id>'::uuid,
  p_week_start => '<Monday of the proper reporting week>'::date,
  p_actual => <verified numeric actual>,
  p_observed_at => '<actual source observation timestamp>'::timestamptz,
  p_window_start => '<verified query window start>'::timestamptz,
  p_window_end => '<verified query window end>'::timestamptz,
  p_receipt_ref => '<unique reference to this completed source read>',
  p_evidence => '{"query_complete":true,"source_status":"trial","currency":"USD","query_scope":"<exact filters and pagination completion>"}'::jsonb,
  p_idempotency_key => '<stable key for retries of this exact observation>'
);
```

Required evidence includes boolean `query_complete=true` and `source_status` of `active`, `trial`, `development` or `unknown`. Currency must match a monetary mapping. Record source counts, query filters and completed pagination as appropriate; keep credentials and customer details out of the receipt evidence. A trial-store zero may be a valid dated observation from a completed read, but neither it nor the ingress sets any paid-operation or launch status.

Weekly windows must exactly match the Pacific week, capped at the observation. Month-to-date windows must start at the current Pacific month's midnight and end at the observation; their KPI row belongs to the observed week. Snapshots must use the same observed timestamp for start/end and belong to the observed week. Future timestamps, incomplete queries, unknown/disabled mappings, invalid windows and conflicting receipt reuse are rejected.

Replaying the same receipt/payload is idempotent even if a caller supplies another retry key. Reusing a receipt or key with different numbers, dates or evidence is rejected. Existing manual values, other providers/accounts and newer automatic observations are retained. Accepted data records `source_provider`, `source_ref`, `observed_at`, window, kind and external-observation ID. `hq_external_observations` records the receipt, declared account/source and result.

**No `channel_revenue` records are created by either API.** A future ledger ingestion requires actual scoped monetary receipts and its own reconciliation contract. Verified KPI observations do not substitute for an accounting ledger.

## Target approval and display

The existing configuration contains 21 targets and 106 null targets. The referenced private Project Scorecards document could not be read, so this work does not invent replacements or claim prior approval. `kpi-target-review.json` lists the complete current definitions and approval status, with all new targets unset.

Portfolio, Project Home and Today use the latest measured completed reporting week, with current-week setup as a fallback when there is no completed data. Current snapshots are not backdated to force them into that display. Score metadata uses the source observation and flow-window end when available, falls back to legacy update timestamps when necessary, labels snapshots and flags stale data after eight days. Collection can operate while target decisions remain pending; the display should continue showing a dash for unscorable measurements.

## Local verification

```sh
HQ_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node scripts/hq/numbers-collector.test.mjs

node scripts/frontend/hq-regressions.test.mjs
```

The SQL suite executes both production migrations against an isolated PostgreSQL engine with synthetic source records and the captured existing pillar-score trigger. It covers authorization and RLS, idempotence, manual protection, source failure, missing vs zero, dates/DST, source attribution, mapping/receipt validation, trial-source labeling and the absence of revenue writes. No provider calls or production mutations are made by these tests.

## Active collection scope

The Big Paws Shopify store-sales mapping is verified and enabled, and its first real observation was accepted. It uses `ShopifyQL sales.net_sales`, USD, month-to-date in America/Los_Angeles, with Shopify-only coverage and the observed trial status. Exact private result values remain in HQ receipt records, not this repository. Monthly Lovable visitor counts remain unconfigured because aggregation granularity changed the reported total for the same interval.

The enabled ChatGPT task is **Supreme HQ numbers**, Sunday nights Pacific starting November 1, 2026. It refreshes these supported internal sources plus the verified Shopify metric. See `weekly-collector-task.md`; do not duplicate it in Claude or replace the Morning Operator.

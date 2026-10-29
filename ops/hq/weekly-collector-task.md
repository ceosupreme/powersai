# Supreme HQ numbers — scheduled collection

Created and enabled in ChatGPT on October 28, 2026 Pacific. Runs Sunday nights in America/Los_Angeles, with an approximate 10 p.m. schedule and a flexible one-hour window, starting November 1. Its first unattended run has not yet occurred. Do not create another copy in Claude or replace the Morning Operator.

The internal collector and Big Paws Shopify ingestion were both run successfully during setup. A provider failure must preserve old observations and produce an explicit partial result. This task does not activate the held server-function cutover or set KPI targets.

## Task prompt

Update Supreme Team HQ's supported automatic measurements using the existing Lovable database and the connected Big Paws Shopify store.

HQ Lovable project: dc01aa48-8dd7-400a-b397-110a5d357bc1. Repository: ceosupreme/powersai. The operating contract is ops/hq/collector-contract.md. The installed SQL migrations are 20261029010000, 20261029020000, 20261029030000 and 20261029040000. Use the existing collection APIs; do not replay migrations.

1. Run the internal collector through Lovable query_database. Derive the most recent Sunday in America/Los_Angeles, including when this invocation is delayed until Monday, and use that Sunday's Monday as the flow week:
WITH period AS (
  SELECT (now() AT TIME ZONE 'America/Los_Angeles')::date
    - extract(dow FROM now() AT TIME ZONE 'America/Los_Angeles')::integer AS sunday
)
SELECT public.collect_hq_numbers(sunday-6,'hq-weekly-internal:'||sunday::text) FROM period;
The key is stable for retries of this invocation. Reusing it returns the original run. A Sunday collection is partial through its observation time; snapshots keep their real current week. Never claim a full closed week if period_complete=false.

2. Refresh the already verified Big Paws store-sales KPI with a completed Shopify month-to-date aggregate. First confirm the connected shop still has exact domain big-paws-tested-zoi7f-uamjq3d2.myshopify.com and currency USD. Do not switch, create, claim or activate stores. Read the existing enabled mapping c56c3e18-79a0-4143-b09b-3593d73aaff1 from hq_external_metric_mappings: project 3561a251-f669-4d5e-a34b-6c8479e034fa, pillar revenue, KPI store_sales, provider shopify, source_ref "ShopifyQL sales.net_sales", month_to_date, USD. If it has changed, report the mismatch without remapping.

3. Obtain one fixed current UTC observation timestamp rounded to a second and its Pacific month-start and Monday from the HQ database. Use the corresponding exact Pacific local timestamps in the connected Shopify run_analytics_query:
FROM sales SHOW orders, gross_sales, discounts, returns, net_sales, total_sales WITH CURRENCY 'USD', TIMEZONE 'America/Los_Angeles' SINCE <Pacific month-start YYYY-MM-DDT00:00:00> UNTIL <fixed Pacific observation YYYY-MM-DDTHH:MM:SS>
Require a successful complete ungrouped aggregate, one result row, the exact expected shopDomain, USD and finite values. Missing/failed reads are unavailable, never zero. Do not substitute pageviews, product counts or daily visitor sums. The store was trial at setup; preserve the currently observed source status and never interpret a trial zero as commercial readiness.

4. Pass the verified net_sales value to public.ingest_hq_external_observation using the existing mapping ID, Monday of the observed Pacific week, actual observation timestamp, exact Pacific month-start converted to UTC and observation as window end. Supply a unique receipt reference and stable retry key built from domain, metric, month-start and observation timestamp. Evidence must include query_complete=true, source_status, currency=USD, exact query, echoed shop domain, row count, the returned aggregates and Shopify-only coverage. Preserve the same timestamp/payload when retrying. The API protects manual, other-account and newer observations. It must not write channel_revenue, change targets or imply other brand income was measured.

5. Read back the run and external observation results. Summarize actual measurements written, source failures, dated coverage and meaningful changes. Keep unsupported measurements explicitly missing. At setup 106 targets were missing; read the current count and current approved values instead of assuming that count remains unchanged. Do not invent or activate targets. Stripe and Metricool were declined for this request; do not request/install them or fabricate their data. Lovable's Big Paws "visitors" totals varied by hourly versus daily bucketing during setup, so do not treat those sums as monthly unique visitors without resolving that metric first.

Only perform these approved measurement reads and HQ measurement writes. Do not send customer messages, run outbound automation workers, create purchases, change billing, deploy code, publish content, alter schedules or activate integrations. If one source becomes unavailable, preserve previous observations and report partial completion with the concrete reason. Do not duplicate the Supreme Morning Operator or another collector.

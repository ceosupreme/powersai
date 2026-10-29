// Runs the production migration in an isolated PostgreSQL engine. All source
// records and identities below are synthetic; no external services are called.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TYPE app_role AS ENUM('admin','owner','gm','staff','client');
CREATE TABLE user_roles(user_id uuid,role app_role);
CREATE FUNCTION has_role(who uuid,wanted app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=who AND role=wanted) $$;
CREATE TABLE venues(id uuid PRIMARY KEY,name text,project_type text NOT NULL DEFAULT 'internal_brand',is_active boolean DEFAULT true,is_prospect_shell boolean DEFAULT false);
CREATE TABLE project_kpis(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid REFERENCES venues(id),pillar_key text,kpi_key text,kpi_label text,
  target numeric,direction text NOT NULL DEFAULT 'higher',unit text,weight numeric DEFAULT 1,source text NOT NULL DEFAULT 'manual',is_active boolean DEFAULT true,sort_order integer DEFAULT 0,
  UNIQUE(project_id,pillar_key,kpi_key));
CREATE TABLE project_kpi_values(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid REFERENCES venues(id),week_start date,pillar_key text,kpi_key text,actual numeric,score numeric,note text,
  updated_by uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(project_id,week_start,pillar_key,kpi_key));
CREATE TABLE project_pillar_scores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,week_start date,pillar_key text,score numeric,note text,
  updated_at timestamptz DEFAULT now(),UNIQUE(project_id,week_start,pillar_key));
CREATE TABLE content_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,title text,format text,stage text,published_at timestamptz,is_repurposed boolean DEFAULT false);
CREATE TABLE content_placements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_item_id uuid,project_id uuid,status text,verified_at timestamptz,live_url text,platform_post_id text);
CREATE TABLE channel_product_channels(product_id uuid,project_id uuid,PRIMARY KEY(product_id,project_id));
CREATE TABLE product_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid,outlet text,status text);
CREATE TABLE action_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bar_id uuid,venue_id uuid,status text,approval_status text,created_at timestamptz,snoozed_until timestamptz);
CREATE TABLE site_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_type text,is_internal boolean,session_id text,created_at timestamptz,src text DEFAULT 'for-hvac',vertical text DEFAULT 'hvac',path text DEFAULT '/free-audit');
CREATE TABLE inbound_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),captured_for_project_id uuid,email text,source text,qualifier_data jsonb DEFAULT '{}',created_at timestamptz);
CREATE TABLE channel_revenue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,amount numeric);
GRANT SELECT,INSERT,UPDATE ON project_kpi_values TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
await db.exec(await readFile(new URL('./fixtures/kpi-score-trigger.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261029030000_hq_numbers_collector.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261029040000_hq_external_observations.sql',import.meta.url),'utf8'));

const ids = {
  stm:'34cb1836-6ead-4478-915c-0a9dc552a554', paws:'10000000-0000-4000-8000-000000000001', survival:'10000000-0000-4000-8000-000000000002',
  client:'10000000-0000-4000-8000-000000000003', inactive:'10000000-0000-4000-8000-000000000004',
  admin:'20000000-0000-4000-8000-000000000001', staff:'20000000-0000-4000-8000-000000000002', approver:'20000000-0000-4000-8000-000000000003',
  post:'30000000-0000-4000-8000-000000000001', unverified:'30000000-0000-4000-8000-000000000002', product:'40000000-0000-4000-8000-000000000001',
};
let reporting;
const scalar = async (sql,args=[]) => {
  const value=(await db.query(sql,args)).rows[0]?.value;
  return typeof value==='string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
};
const isoDate=value=>new Date(value).toISOString().slice(0,10);
async function identity(role='postgres',user='') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user,role]);
  if(role!=='postgres') await db.exec(`SET ROLE ${role}`);
}
async function collect(key='fixture-run',week=null) {
  return scalar('SELECT collect_hq_numbers($1::date,$2) AS value',[week,key]);
}
async function seed() {
  await identity();
  await db.exec(`TRUNCATE hq_number_collector_checks,project_kpi_values,project_pillar_scores,hq_number_collector_runs,
    project_kpis,venues,user_roles,content_items,content_placements,channel_product_channels,product_listings,action_items,site_events,inbound_leads,channel_revenue CASCADE;
    INSERT INTO user_roles VALUES('${ids.admin}','admin'),('${ids.staff}','staff'),('${ids.approver}','client');
    INSERT INTO venues(id,name,project_type,is_active) VALUES
      ('${ids.stm}','Fixture STM','internal_brand',true),('${ids.paws}','Fixture Paws','content_channel',true),('${ids.survival}','Fixture Survival','content_channel',true),
      ('${ids.client}','Client','client',true),('${ids.inactive}','Retired','internal_brand',false);
    INSERT INTO project_kpis(project_id,pillar_key,kpi_key,target,direction) VALUES
      ('${ids.stm}','marketing','content_posts',3,'higher'),('${ids.stm}','marketing','audit_requests',NULL,'higher'),('${ids.stm}','pipeline','inbound_leads',5,'higher'),
      ('${ids.paws}','catalog','products_live',3,'higher'),('${ids.paws}','foundation','oldest_waiting_days',7,'lower'),
      ('${ids.survival}','content','videos_reels',NULL,'higher'),('${ids.stm}','revenue','mrr',1000,'higher'),('${ids.stm}','proof','case_studies',1,'higher'),
      ('${ids.client}','catalog','products_live',1,'higher'),('${ids.inactive}','catalog','products_live',1,'higher');
    INSERT INTO content_items(id,project_id,format,stage,published_at) VALUES
      ('${ids.post}','${ids.stm}','post','published',(SELECT window_start+interval '1 hour' FROM hq_numbers_reporting_window())),
      ('${ids.unverified}','${ids.stm}','post','published',(SELECT window_start+interval '2 hours' FROM hq_numbers_reporting_window()));
    INSERT INTO content_placements(content_item_id,project_id,status,verified_at,live_url) VALUES
      ('${ids.post}','${ids.stm}','published',now()-interval '1 hour','https://fixture.invalid/post'),
      ('${ids.post}','${ids.stm}','published',now()-interval '1 hour','https://fixture.invalid/repost');
    INSERT INTO channel_product_channels VALUES('${ids.product}','${ids.paws}'),('${ids.product}','${ids.survival}');
    INSERT INTO product_listings(product_id,outlet,status) VALUES('${ids.product}','Amazon KDP','listed'),('${ids.product}','Own store','listed'),
      ('40000000-0000-4000-8000-000000000099','Own store','listed');
    INSERT INTO action_items(bar_id,status,approval_status,created_at,snoozed_until) VALUES
      ('${ids.paws}','Todo','Pending',now()-interval '10 days',NULL),
      ('${ids.paws}','Done','Proposed',now()-interval '40 days',NULL),
      ('${ids.paws}','Todo','Approved',now()-interval '30 days',NULL),
      ('${ids.paws}','Todo','Rejected',now()-interval '35 days',NULL),
      ('${ids.paws}','Todo','Pending',now()-interval '50 days',now()+interval '1 day');
    INSERT INTO site_events(event_type,is_internal,session_id,created_at) SELECT 'audit_start',false,'visitor-1',window_start+interval '1 hour' FROM hq_numbers_reporting_window();
    INSERT INTO site_events(event_type,is_internal,session_id,created_at) SELECT 'audit_start',false,'visitor-1',window_start+interval '2 hours' FROM hq_numbers_reporting_window();
    INSERT INTO site_events(event_type,is_internal,session_id,created_at) SELECT 'audit_start',true,'internal-1',window_start+interval '1 hour' FROM hq_numbers_reporting_window();
    INSERT INTO site_events(event_type,is_internal,session_id,created_at,src,vertical,path) SELECT 'audit_start',false,'home-1',window_start+interval '1 hour','home-start-band',NULL,'/free-audit' FROM hq_numbers_reporting_window();
    INSERT INTO inbound_leads(captured_for_project_id,email,source,qualifier_data,created_at)
      SELECT x.project::uuid,x.email,x.source,x.flags::jsonb,w.window_start+interval '1 hour' FROM hq_numbers_reporting_window() w
      CROSS JOIN (VALUES(NULL,'buyer@fixture-business.org','public_site','{}'),('${ids.paws}','other@fixture-business.org','public_site','{}'),
        (NULL,'fixture@example.com','public_site','{}'),(NULL,'smoke@fixture-business.org','smoke_test','{}'),(NULL,'marked@fixture-business.org','public_site','{"is_test":true}')) x(project,email,source,flags);`);
  reporting = (await db.query('SELECT * FROM hq_numbers_reporting_window()')).rows[0];
  reporting.week_start=isoDate(reporting.week_start);
  reporting.current_week_start=isoDate(reporting.current_week_start);
}
test.beforeEach(seed);
test.after(async()=>db.close());

test('collector ACL rejects anon, ordinary staff and client approvers',async()=>{
  assert.equal(await scalar("SELECT has_function_privilege('anon','collect_hq_numbers(date,text)','EXECUTE') AS value"),false);
  await identity('anon');
  await assert.rejects(()=>collect(),{code:'42501'});
  for(const user of [ids.staff,ids.approver]) {
    await identity('authenticated',user);
    await assert.rejects(()=>collect(),{code:'42501'});
  }
});

test('admin and service callers collect; run/check logs remain admin-only',async()=>{
  await identity('authenticated',ids.admin);
  const result=await collect();
  assert.equal(result.status,'partial');
  assert.equal(result.collected,6);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_number_collector_runs'),1);
  await identity('authenticated',ids.staff);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_number_collector_runs'),0);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_number_collector_checks'),0);
  await identity('service_role');
  assert.equal((await collect('service-run')).collected,6);
});

test('verified content is deduplicated across placements; unknown publication proof stays in coverage',async()=>{
  await collect();
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),1);
  assert.equal(await scalar("SELECT (coverage->>'unverified_publications_excluded')::int AS value FROM hq_number_collector_checks WHERE kpi_key='content_posts'"),1);
  assert.equal(await scalar("SELECT score AS value FROM project_pillar_scores WHERE project_id=$1 AND pillar_key='marketing'",[ids.stm]),33.33);
});

test('last-completed flow week and observed current-week snapshots never share a false period',async()=>{
  const result=await collect();
  assert.equal(result.flow_week_start,reporting.week_start);
  assert.equal(result.snapshot_week_start,reporting.current_week_start);
  assert.equal(await scalar("SELECT week_start::text AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),reporting.week_start);
  const snapshot=(await db.query("SELECT week_start::text,measurement_kind,observed_at,window_start,window_end,note FROM project_kpi_values WHERE kpi_key='products_live'")).rows[0];
  assert.equal(snapshot.week_start,reporting.current_week_start);
  assert.equal(snapshot.measurement_kind,'snapshot');
  assert.equal(String(snapshot.observed_at),String(snapshot.window_start));
  assert.equal(String(snapshot.window_start),String(snapshot.window_end));
  assert.match(snapshot.note,/not a historical/);
  assert.deepEqual(result.coverage_by_period.map(x=>[x.measurement_kind,x.mapped_checks]),[['flow',4],['snapshot',2]]);
  assert.equal(result.unmapped_definitions,2);
});

test('zero internal observations are valid, while missing external sources never become zero or revenue',async()=>{
  await collect();
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='videos_reels'"),0);
  assert.equal(await scalar("SELECT count(*)::int AS value FROM project_kpi_values WHERE kpi_key='mrr'"),0);
  assert.equal(await scalar("SELECT status AS value FROM hq_number_collector_checks WHERE kpi_key='mrr'"),'blocked');
  assert.equal(await scalar('SELECT count(*)::int AS value FROM channel_revenue'),0);
});

test('targets remain untouched and only successfully collected KPI definitions become automatic',async()=>{
  const before=(await db.query('SELECT id,target FROM project_kpis ORDER BY id')).rows;
  await collect();
  assert.deepEqual((await db.query('SELECT id,target FROM project_kpis ORDER BY id')).rows,before);
  assert.equal(await scalar("SELECT count(*)::int AS value FROM project_kpis WHERE source='auto'"),6);
  assert.equal(await scalar("SELECT source AS value FROM project_kpis WHERE kpi_key='mrr'"),'manual');
  assert.equal(await scalar("SELECT score AS value FROM project_kpi_values WHERE kpi_key='audit_requests'"),null);
});

test('same run key replays without duplicate rows or repeated measurement updates',async()=>{
  const first=await collect('idempotent');
  const before=(await db.query('SELECT id,updated_at,collector_run_id FROM project_kpi_values ORDER BY id')).rows;
  const repeated=await collect('idempotent');
  assert.equal(repeated.replayed,true);
  assert.equal(repeated.run_id,first.run_id);
  assert.deepEqual((await db.query('SELECT id,updated_at,collector_run_id FROM project_kpi_values ORDER BY id')).rows,before);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_number_collector_runs'),1);
  await assert.rejects(()=>collect('idempotent','2020-01-06'),{code:'22023'});
});

test('fresh run keys update existing automatic values rather than append duplicates',async()=>{
  await collect('first');
  await db.exec(`INSERT INTO product_listings(product_id,outlet,status) VALUES('40000000-0000-4000-8000-000000000002','Own store','listed');
    INSERT INTO channel_product_channels VALUES('40000000-0000-4000-8000-000000000002','${ids.paws}');`);
  await collect('second');
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='products_live'"),2);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM project_kpi_values'),6);
});

test('existing manual values are never replaced, including edits to a previously automatic row',async()=>{
  await db.query("INSERT INTO project_kpi_values(project_id,week_start,pillar_key,kpi_key,actual,note) VALUES($1,$2,'catalog','products_live',99,'Owner measurement')",[ids.paws,reporting.current_week_start]);
  const first=await collect('preserve');
  assert.equal(first.manual_preserved,1);
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='products_live'"),99);
  assert.equal(await scalar("SELECT actual AS value FROM hq_number_collector_checks WHERE kpi_key='products_live'"),null);
  await identity('authenticated',ids.staff);
  await db.query("UPDATE project_kpi_values SET actual=88,source_provider='hq',updated_by=NULL WHERE kpi_key='content_posts'");
  await identity();
  assert.equal(await scalar("SELECT source_provider AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),'manual');
  assert.equal(await scalar("SELECT updated_by::text AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),ids.staff);
  assert.equal((await collect('after-manual-edit')).manual_preserved,2);
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),88);
});

test('audit starts count distinct external sessions, and leads exclude fixtures and other project intake',async()=>{
  await collect();
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='audit_requests'"),1);
  assert.equal(await scalar("SELECT (coverage->>'non_trade_or_unknown_attribution_excluded')::int AS value FROM hq_number_collector_checks WHERE kpi_key='audit_requests'"),1);
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='inbound_leads'"),1);
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='oldest_waiting_days'"),10);
});

test('missing session IDs and missing publication receipts cannot be asserted as zero',async()=>{
  await db.exec("UPDATE site_events SET session_id=NULL WHERE NOT is_internal; DELETE FROM content_placements;");
  const result=await collect();
  assert.equal(result.collected,4);
  assert.equal(await scalar("SELECT count(*)::int AS value FROM project_kpi_values WHERE kpi_key IN ('audit_requests','content_posts')"),0);
  assert.equal(await scalar("SELECT count(*)::int AS value FROM hq_number_collector_checks WHERE status='blocked'"),4);
});

test('unavailable source query preserves other sources and records the failure',async()=>{
  await db.exec('ALTER TABLE content_items RENAME TO unavailable_content_items');
  try {
    const result=await collect();
    assert.equal(result.source_unavailable,2);
    assert.equal(result.collected,4);
    assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='products_live'"),1);
  } finally { await db.exec('ALTER TABLE unavailable_content_items RENAME TO content_items'); }
});

test('Pacific windows handle DST and Sunday collection caps at the actual observation',async()=>{
  const sunday=(await db.query("SELECT * FROM hq_numbers_reporting_window('2026-10-26','2026-11-02T07:55:00Z')")).rows[0];
  assert.equal(sunday.period_complete,false);
  assert.equal(new Date(sunday.window_start).toISOString(),'2026-10-26T07:00:00.000Z');
  assert.equal(new Date(sunday.window_end).toISOString(),'2026-11-02T07:55:00.000Z');
  const monday=(await db.query("SELECT * FROM hq_numbers_reporting_window(NULL,'2026-11-02T08:00:00Z')")).rows[0];
  assert.equal(isoDate(monday.week_start),'2026-10-26');
  assert.equal(monday.period_complete,true);
  assert.equal((new Date(monday.window_end)-new Date(monday.window_start))/3_600_000,169);
  const spring=(await db.query("SELECT * FROM hq_numbers_reporting_window('2026-03-02','2026-03-09T07:00:00Z')")).rows[0];
  assert.equal((new Date(spring.window_end)-new Date(spring.window_start))/3_600_000,167);
  await assert.rejects(()=>db.query("SELECT * FROM hq_numbers_reporting_window('2026-10-27','2026-10-29T12:00:00Z')"),{code:'22023'});
  await assert.rejects(()=>db.query("SELECT * FROM hq_numbers_reporting_window('2026-11-02','2026-10-29T12:00:00Z')"),{code:'22023'});
});

async function verifyMapping(overrides={}) {
  const input={ project:ids.stm,pillar:'marketing',kpi:'content_posts',provider:'metricool',account:'fixture-social-account',
    source:'metricool:published-posts',kind:'flow',basis:'week',verification:'fixture:verified-project-account-and-metric',currency:null,enabled:true,...overrides };
  return scalar('SELECT verify_hq_external_metric_mapping($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS value',
    [input.project,input.pillar,input.kpi,input.provider,input.account,input.source,input.kind,input.basis,input.verification,input.currency,input.enabled]);
}
async function externalInput(mapping,overrides={}) {
  const observed=(await db.query('SELECT clock_timestamp() AS observed')).rows[0].observed;
  return { mapping:mapping.id,week:reporting.week_start,actual:3,observed,start:reporting.window_start,end:reporting.window_end,
    receipt:'fixture:provider-read-1',evidence:{query_complete:true,source_status:'active'},key:'external-fixture-1',...overrides };
}
async function ingest(input) {
  return scalar('SELECT ingest_hq_external_observation($1,$2::date,$3,$4,$5,$6,$7,$8::jsonb,$9) AS value',
    [input.mapping,input.week,input.actual,input.observed,input.start,input.end,input.receipt,JSON.stringify(input.evidence),input.key]);
}

test('external mapping and ingress require admin/service authority and a verified enabled mapping',async()=>{
  await identity('anon');
  await assert.rejects(()=>verifyMapping(),{code:'42501'});
  await identity('authenticated',ids.staff);
  await assert.rejects(()=>verifyMapping(),{code:'42501'});
  await identity('authenticated',ids.admin);
  await assert.rejects(()=>verifyMapping({verification:''}),{code:'22023'});
  const map=await verifyMapping({enabled:false});
  const input=await externalInput(map);
  await assert.rejects(()=>ingest(input),{code:'22023'});
  await identity('authenticated',ids.approver);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_external_metric_mappings'),0);
  await assert.rejects(()=>ingest(input),{code:'42501'});
});

test('external observations use explicit windows, keep provenance and replay receipts without duplicate writes',async()=>{
  const map=await verifyMapping();
  const input=await externalInput(map);
  const result=await ingest(input);
  assert.equal(result.status,'collected');
  assert.equal(result.revenue_rows_written,0);
  const row=(await db.query("SELECT source_provider,source_ref,actual,observed_at,window_start,window_end,external_observation_id FROM project_kpi_values WHERE kpi_key='content_posts'")).rows[0];
  assert.equal(row.source_provider,'metricool');
  assert.equal(row.source_ref,'metricool:published-posts');
  assert.equal(row.external_observation_id,result.observation_id);
  assert.equal(new Date(row.observed_at).toISOString(),new Date(input.observed).toISOString());
  assert.equal((await ingest(input)).replayed,true);
  assert.equal((await ingest({...input,key:'different-retry-key'})).replayed,true);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_external_observations'),1);
  await assert.rejects(()=>ingest({...input,actual:4}),{code:'22023'});
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),3);
});

test('receipt retries cannot borrow another observation\'s existing idempotency key',async()=>{
  const map=await verifyMapping();
  const first=await externalInput(map);
  const second=await externalInput(map,{actual:4,receipt:'second-receipt',key:'second-key'});
  await ingest(first);
  await ingest(second);
  await assert.rejects(()=>ingest({...second,key:first.key}),{code:'22023'});
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_external_observations'),2);
});

test('external ingress rejects incomplete queries, future observations and mismatched weekly windows',async()=>{
  const map=await verifyMapping();
  const input=await externalInput(map);
  await assert.rejects(()=>ingest({...input,evidence:{query_complete:false,source_status:'active'}}),{code:'22023'});
  await assert.rejects(()=>ingest({...input,observed:new Date(Date.now()+86_400_000).toISOString()}),{code:'22023'});
  await assert.rejects(()=>ingest({...input,start:new Date(new Date(input.start).getTime()+1000).toISOString()}),{code:'22023'});
  assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_external_observations'),0);
});

test('external receipt ingestion protects manual values and declines older automatic observations',async()=>{
  const map=await verifyMapping();
  const input=await externalInput(map);
  await ingest(input);
  const older={...input,observed:new Date(new Date(input.observed).getTime()-3_600_000).toISOString(),actual:1,receipt:'older-receipt',key:'older-key'};
  assert.equal((await ingest(older)).status,'manual_preserved');
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),3);
  await identity('authenticated',ids.admin);
  await db.query("UPDATE project_kpi_values SET actual=88 WHERE kpi_key='content_posts'");
  await identity();
  const fresh=await externalInput(map,{actual:4,receipt:'fresh-receipt',key:'fresh-key'});
  assert.equal((await ingest(fresh)).status,'manual_preserved');
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),88);
  assert.equal(await scalar("SELECT source_provider AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),'manual');
});

test('a newly verified different account cannot overwrite observations owned by the old account',async()=>{
  const map=await verifyMapping();
  await ingest(await externalInput(map));
  const changed=await verifyMapping({account:'different-fixture-account'});
  assert.equal(changed.mapping_version,2);
  const input=await externalInput(changed,{actual:99,receipt:'changed-account-receipt',key:'changed-account-key'});
  assert.equal((await ingest(input)).status,'manual_preserved');
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='content_posts'"),3);
});

test('snapshot ingress cannot place today\'s stock measurement into an earlier reporting week',async()=>{
  const map=await verifyMapping({project:ids.paws,pillar:'catalog',kpi:'products_live',provider:'shopify',account:'fixture.myshopify.com',source:'shopify:active-catalog-count',kind:'snapshot',basis:'snapshot'});
  let input=await externalInput(map);
  input={...input,start:input.observed,end:input.observed};
  await assert.rejects(()=>ingest(input),{code:'22023'});
  const result=await ingest({...input,week:reporting.current_week_start});
  assert.equal(result.measurement_kind,'snapshot');
  assert.equal(result.week_start,reporting.current_week_start);
});

test('trial-store zero is a dated observation with currency, never evidence of paid operation or a revenue row',async()=>{
  await db.query("INSERT INTO project_kpis(project_id,pillar_key,kpi_key,unit) VALUES($1,'revenue','store_sales','USD')",[ids.paws]);
  const map=await verifyMapping({project:ids.paws,pillar:'revenue',kpi:'store_sales',provider:'shopify',account:'fixture.myshopify.com',source:'shopify:paid-orders:USD',kind:'flow',basis:'month_to_date',currency:'USD'});
  const dates=(await db.query("SELECT clock_timestamp() AS observed,date_trunc('month',clock_timestamp() AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Los_Angeles' AS month_start")).rows[0];
  const input=await externalInput(map,{week:reporting.current_week_start,actual:0,observed:dates.observed,start:dates.month_start,end:dates.observed,
    evidence:{query_complete:true,source_status:'trial',currency:'USD',receipt_count:0,query_scope:'all paid orders in this month; completed provider query'}});
  await assert.rejects(()=>ingest({...input,evidence:{...input.evidence,currency:'EUR'}}),{code:'22023'});
  const result=await ingest(input);
  assert.equal(result.source_status,'trial');
  assert.equal(result.status,'collected');
  assert.equal(await scalar("SELECT actual AS value FROM project_kpi_values WHERE kpi_key='store_sales'"),0);
  assert.match(await scalar("SELECT note AS value FROM project_kpi_values WHERE kpi_key='store_sales'"),/does not establish/);
  assert.equal(await scalar("SELECT target AS value FROM project_kpis WHERE kpi_key='store_sales'"),null);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM channel_revenue'),0);
});

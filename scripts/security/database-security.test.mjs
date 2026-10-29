// All identities, tokens and leads below are synthetic. This executes the real
// migrations in an in-memory PostgreSQL; it never connects to Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.HQ_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA vault; CREATE SCHEMA cron; CREATE SCHEMA net;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TYPE app_role AS ENUM('admin','manager','staff','owner','gm','shift_lead','client');
CREATE TYPE automation_key AS ENUM('followup_sequence','reactivation','review_request');
CREATE TYPE automation_queue_status AS ENUM('pending_review','approved','rejected','sending','sent','failed','canceled');
CREATE TABLE user_roles(user_id uuid UNIQUE,role app_role,UNIQUE(user_id,role));
CREATE TABLE venue_assignments(user_id uuid,venue_id uuid,role_at_venue text);
CREATE TABLE user_venue_roles(user_id uuid,venue_id uuid,role text);
CREATE TABLE venues(id uuid PRIMARY KEY,toast_client_secret text);
CREATE TABLE venue_profiles(id uuid PRIMARY KEY,safe_combo text);
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,full_name text);
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb,invited_at timestamptz);
CREATE TABLE role_page_defaults(role app_role,page_key text,enabled boolean,UNIQUE(role,page_key));
CREATE TABLE project_automation_enrollments(project_id uuid,automation_key automation_key,approval_mode text);
CREATE TABLE automation_message_queue(id uuid PRIMARY KEY,project_id uuid,automation_key automation_key,status automation_queue_status,
 body text,edited_body text,reject_reason text,flagged_for_operator boolean DEFAULT false,approved_by uuid,approved_at timestamptz,
 updated_at timestamptz,scheduled_for timestamptz,recipient_snapshot jsonb,delivery_status text DEFAULT 'queued',send_result jsonb,future_server_field text);
ALTER TABLE automation_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY amq_access ON automation_message_queue FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE TABLE brand_kits(id uuid PRIMARY KEY,project_id uuid,brand_voice text);
CREATE TABLE brand_kit_colors(id uuid PRIMARY KEY,kit_id uuid,hex text);
CREATE TABLE brand_kit_taglines(id uuid PRIMARY KEY,kit_id uuid,text text);
CREATE TABLE brand_kit_hashtags(id uuid PRIMARY KEY,kit_id uuid,tag text);
CREATE TABLE brand_kit_links(id uuid PRIMARY KEY,kit_id uuid,url text);
CREATE TABLE brand_kit_assets(id uuid PRIMARY KEY,kit_id uuid,file_name text);
CREATE TABLE service_packages(id uuid PRIMARY KEY,name text);
CREATE TABLE project_type_leak_vectors(id uuid PRIMARY KEY,name text);
CREATE TABLE foundation_item_templates(id uuid PRIMARY KEY,name text);
CREATE TABLE storage.objects(id uuid PRIMARY KEY,bucket_id text);
CREATE TABLE public_audit_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),token text UNIQUE,status text,business_name text,
 city text,operation_footprint text,place_id text,redacted_result jsonb,full_result jsonb,email text,email_captured_at timestamptz);
CREATE TABLE inbound_leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text CHECK(name<>'simulate-insert-failure'),business_name text,
 email text,phone text,message text,conversation_channel text,route_to text,is_ready boolean,source text,qualifier_data jsonb);
CREATE FUNCTION net_http_post(url text,headers_json text,body_json text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE FUNCTION toast_submit_lock(p_key bigint,p_spacing_ms integer) RETURNS void LANGUAGE sql AS $$ SELECT $$;
GRANT EXECUTE ON FUNCTION toast_submit_lock(bigint,integer) TO anon,authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
GRANT ALL ON storage.objects TO authenticated,service_role;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['brand_kits','brand_kit_colors','brand_kit_taglines','brand_kit_hashtags','brand_kit_links','brand_kit_assets',
   'service_packages','project_type_leak_vectors','foundation_item_templates'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('CREATE POLICY legacy_access ON public.%I FOR ALL TO authenticated USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_access ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE TABLE vault.secrets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),secret text,name text UNIQUE,description text);
CREATE VIEW vault.decrypted_secrets AS SELECT id,secret AS decrypted_secret,name FROM vault.secrets;
CREATE FUNCTION vault.create_secret(new_secret text,new_name text,new_description text) RETURNS uuid LANGUAGE plpgsql AS $$
 DECLARE sid uuid; BEGIN INSERT INTO vault.secrets(secret,name,description) VALUES(new_secret,new_name,new_description) RETURNING id INTO sid; RETURN sid; END $$;
CREATE TABLE cron.job(jobid bigint PRIMARY KEY,jobname text,schedule text,active boolean,command text);
CREATE FUNCTION cron.alter_job(job_id bigint,command text) RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET command=$2 WHERE jobid=$1 $$;
INSERT INTO cron.job VALUES(1,'automation-queue-sweeper','*/5 * * * *',true,'legacy'),(3,'automation-stop-condition','0 13 * * *',true,'legacy'),
 (4,'recovery-report-weekly','0 16 * * 1',true,'legacy'),(6,'reconcile-checkouts-hourly','23 * * * *',true,'legacy'),(9,'unrelated-disabled','0 * * * *',false,'unchanged');
CREATE TABLE net.captured_requests(id bigserial PRIMARY KEY,url text,headers jsonb,body jsonb);
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb) RETURNS bigint LANGUAGE plpgsql AS $$
 DECLARE rid bigint; BEGIN INSERT INTO net.captured_requests(url,headers,body) VALUES(url,headers,body) RETURNING id INTO rid; RETURN rid; END $$;
`);
const prerequisite = await readFile(new URL('../../supabase/migrations/20261029010000_phase2_security.sql',import.meta.url),'utf8');
const cutover = await readFile(new URL('../../supabase/migrations/20261029011000_phase2_deployment_cutover.sql',import.meta.url),'utf8');
await db.exec(prerequisite);
const user = { admin:'10000000-0000-4000-8000-000000000001', client:'10000000-0000-4000-8000-000000000002',
 manager:'10000000-0000-4000-8000-000000000003', staff:'10000000-0000-4000-8000-000000000004', none:'10000000-0000-4000-8000-000000000005' };
const project='20000000-0000-4000-8000-000000000001';
const other='20000000-0000-4000-8000-000000000002';
const queue='30000000-0000-4000-8000-000000000001';
const kit='40000000-0000-4000-8000-000000000001';
const scalar = async (sql,args=[]) => (await db.query(sql,args)).rows[0]?.value;
async function identity(role='postgres',id='') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);
  if(role!=='postgres') await db.exec(`SET ROLE ${role}`);
}
async function seed() {
 await identity();
 await db.exec(`TRUNCATE user_roles,venue_assignments,user_venue_roles,venues,venue_profiles,automation_message_queue,
   project_automation_enrollments,brand_kits,brand_kit_colors,service_packages,public_audit_requests,inbound_leads,hq_public_rate_limits;
 INSERT INTO user_roles VALUES('${user.admin}','admin'),('${user.client}','client'),('${user.manager}','gm'),('${user.staff}','staff');
 INSERT INTO venues(id) VALUES('${project}'),('${other}');
 INSERT INTO venue_assignments VALUES('${user.client}','${project}','client'),('${user.manager}','${project}','gm'),('${user.staff}','${project}','staff'),('${user.none}','${project}','gm');
 INSERT INTO project_automation_enrollments VALUES('${project}','followup_sequence','client'),('${project}','reactivation','operator'),('${other}','followup_sequence','client');
 INSERT INTO automation_message_queue(id,project_id,automation_key,status,body,recipient_snapshot) VALUES
 ('${queue}','${project}','followup_sequence','pending_review','Original','{"email":"recipient@example.test"}'),
 ('30000000-0000-4000-8000-000000000002','${project}','reactivation','pending_review','Operator-only','{}'),
 ('30000000-0000-4000-8000-000000000003','${other}','followup_sequence','pending_review','Other project','{}');
 INSERT INTO brand_kits VALUES('${kit}','${project}','Voice');
 INSERT INTO brand_kit_colors VALUES('${kit}','${kit}','#ffffff');
 INSERT INTO service_packages VALUES('${kit}','Internal strategy');
 INSERT INTO public_audit_requests(token,status,business_name,redacted_result,full_result) VALUES('fixture-token','complete','Fixture business','{}','{"results":[1]}');`);
}
test.beforeEach(seed);
test.after(async()=>db.close());

test('anonymous arbitrary HTTP and lock RPCs are revoked, while workers retain execute',async()=>{
 for(const r of ['anon','authenticated']) for(const fn of ['net_http_post(text,text,text)','toast_submit_lock(bigint,integer)'])
  assert.equal(await scalar(`SELECT has_function_privilege('${r}','${fn}','EXECUTE') AS value`),false);
 assert.equal(await scalar("SELECT has_function_privilege('service_role','net_http_post(text,text,text)','EXECUTE') AS value"),true);
 await identity('anon');
 await assert.rejects(()=>db.query("SELECT net_http_post('https://invalid.test','{}','{}')"),{code:'42501'});
});
test('caller-scoped role helpers preserve policy checks but refuse cross-user role inspection',async()=>{
 await identity('authenticated',user.client);
 assert.equal(await scalar("SELECT has_role(auth.uid(),'client') AS value"),true);
 assert.equal(await scalar("SELECT has_role($1,'admin') AS value",[user.admin]),false);
 assert.equal(await scalar('SELECT get_user_role($1) AS value',[user.admin]),null);
 assert.equal(await scalar('SELECT count(*)::int AS value FROM automation_message_queue'),1);
 await identity('authenticated',user.admin);
 assert.equal(await scalar("SELECT has_role($1,'client') AS value",[user.client]),true);
});
test('client can review only its client-mode message and cannot forge approval provenance',async()=>{
 await identity('authenticated',user.client);
 assert.equal(await scalar('SELECT user_can_access_project($1) AS value',[project]),false);
 const result=await db.query("UPDATE automation_message_queue SET edited_body='Reviewed',status='approved',approved_by=$2,approved_at='2000-01-01' WHERE id=$1 RETURNING approved_by,approved_at",[queue,user.admin]);
 assert.equal(result.rows[0].approved_by,user.client);
 assert.ok(new Date(result.rows[0].approved_at).getFullYear()>2025);
 await assert.rejects(()=>db.query("UPDATE automation_message_queue SET edited_body='Changed after approval' WHERE id=$1",[queue]),{code:'42501'});
});
test('client cannot insert/delete a message or change recipient, delivery state, future server fields',async()=>{
 await identity('authenticated',user.client);
 for(const update of ["recipient_snapshot='{}'","delivery_status='delivered'","future_server_field='forged'","body='forged'"])
  await assert.rejects(()=>db.query(`UPDATE automation_message_queue SET ${update} WHERE id=$1`,[queue]),{code:'42501'});
 assert.equal((await db.query('DELETE FROM automation_message_queue WHERE id=$1 RETURNING id',[queue])).rows.length,0);
 await assert.rejects(()=>db.query("INSERT INTO automation_message_queue(id,project_id,automation_key,status) VALUES(gen_random_uuid(),$1,'followup_sequence','approved')",[project]),{code:'42501'});
});
test('project management requires a real team role plus membership; staff and role-less accounts fail',async()=>{
 for(const [id,expected] of [[user.manager,true],[user.staff,false],[user.none,false],[user.client,false]]) {
  await identity('authenticated',id);
  assert.equal(await scalar('SELECT user_can_manage_project($1) AS value',[project]),expected);
  assert.equal(await scalar('SELECT user_can_manage_project($1) AS value',[other]),false);
 }
 await identity('authenticated',user.manager);
 assert.equal(await scalar('SELECT count(*)::int AS value FROM automation_message_queue'),2);
});
test('manager cannot forge delivery receipts or reset unconfirmed/bounced delivery',async()=>{
 for(const state of ['unconfirmed','bounced']) {
  await identity();
  await db.query("UPDATE automation_message_queue SET status='failed',delivery_status=$2,send_result='{}' WHERE id=$1",[queue,state]);
  await identity('authenticated',user.manager);
  await assert.rejects(()=>db.query("UPDATE automation_message_queue SET status='approved',delivery_status='queued',send_result=NULL WHERE id=$1",[queue]),{code:'42501'});
 }
 await identity();
 await db.query("UPDATE automation_message_queue SET status='failed',delivery_status='failed',send_result='{\"error\":\"http_429\"}' WHERE id=$1",[queue]);
 await identity('authenticated',user.manager);
 const retried=await db.query("UPDATE automation_message_queue SET status='approved',delivery_status='queued',send_result=NULL WHERE id=$1 RETURNING approved_by",[queue]);
 assert.equal(retried.rows[0].approved_by,user.manager);
 await assert.rejects(()=>db.query("UPDATE automation_message_queue SET delivery_status='delivered' WHERE id=$1",[queue]),{code:'42501'});
 await assert.rejects(()=>db.query("INSERT INTO automation_message_queue(id,project_id,automation_key,status,approved_by) VALUES(gen_random_uuid(),$1,'followup_sequence','approved',$2)",[project,user.admin]),{code:'42501'});
});
test('restrictive brand-kit writes defeat legacy ALL policies while team reads remain',async()=>{
 await identity('authenticated',user.manager);
 assert.equal(await scalar('SELECT count(*)::int AS value FROM brand_kits'),1);
 assert.equal((await db.query("UPDATE brand_kits SET brand_voice='Changed' RETURNING id")).rows.length,0);
 await assert.rejects(()=>db.query("INSERT INTO brand_kit_colors VALUES(gen_random_uuid(),$1,'#000000')",[kit]),{code:'42501'});
 await identity('authenticated',user.admin);
 assert.equal((await db.query("UPDATE brand_kits SET brand_voice='Admin edit' RETURNING id")).rows.length,1);
 await identity('authenticated',user.client);
 assert.equal(await scalar('SELECT count(*)::int AS value FROM service_packages'),0);
});
test('durable limiter allows exactly the configured count across independent calls',async()=>{
 await identity('service_role');
 const calls=await Promise.all(Array.from({length:8},()=>scalar('SELECT consume_public_rate_limit($1,$2,3,3600) AS value',['test-scope','a'.repeat(64)])));
 assert.equal(calls.filter(r=>r.allowed).length,3);
 assert.ok(calls.every(r=>r.retry_after>0&&r.retry_after<=3600));
 assert.equal(await scalar('SELECT count(*)::int AS value FROM hq_public_rate_limits'),1);
});
test('concurrent/repeated unlock creates one lead and cannot replace the captured address',async()=>{
 await identity('service_role');
 const unlock=email=>scalar("SELECT unlock_public_audit_once('fixture-token',$1,'Fixture',NULL,'Note') AS value",[email]);
 const results=await Promise.all([unlock('one@example.test'),unlock('two@example.test')]);
 assert.equal(results.filter(r=>r.new_capture).length,1);
 assert.deepEqual(results[0].full_result,{results:[1]});
 assert.equal(await scalar('SELECT count(*)::int AS value FROM inbound_leads'),1);
 assert.equal(await scalar('SELECT email AS value FROM public_audit_requests'),'one@example.test');
});
test('failed lead insertion rolls back the unlock marker and leaves a retryable token',async()=>{
 await identity('service_role');
 await assert.rejects(()=>scalar("SELECT unlock_public_audit_once('fixture-token','one@example.test','simulate-insert-failure',NULL,'Note') AS value"),{code:'23514'});
 assert.equal(await scalar('SELECT email_captured_at AS value FROM public_audit_requests'),null);
 assert.equal((await scalar("SELECT unlock_public_audit_once('fixture-token','one@example.test','Retry',NULL,'Note') AS value")).new_capture,true);
});
test('public roles cannot bypass limiter/capture through their service RPCs',async()=>{
 for(const r of ['anon','authenticated']) for(const fn of ['consume_public_rate_limit(text,text,integer,integer)','unlock_public_audit_once(text,text,text,text,text)','hq_verify_job_token(text,text)'])
  assert.equal(await scalar(`SELECT has_function_privilege('${r}','${fn}','EXECUTE') AS value`),false);
 for(const r of ['anon','authenticated']) assert.equal(await scalar(`SELECT has_table_privilege('${r}','hq_edge_job_tokens','SELECT') AS value`),false);
});
test('cutover keeps schedules, generates scoped Vault credentials and dispatches only a fixed project URL',async()=>{
 await db.exec(cutover);
 const jobs=(await db.query('SELECT jobid,schedule,active,command FROM cron.job ORDER BY jobid')).rows;
 assert.equal(jobs.length,5); assert.equal(jobs[0].schedule,'*/5 * * * *'); assert.equal(jobs[0].active,true);
 assert.equal(jobs[4].command,'unchanged'); assert.equal(jobs[4].active,false);
 assert.ok(jobs.slice(0,4).every(j=>j.command.includes('hq_dispatch_edge_function')));
 const token=await scalar("SELECT decrypted_secret AS value FROM vault.decrypted_secrets WHERE name='hq-edge-job:automation-queue-sweeper'");
 assert.ok(token.length>=64);
 await identity('service_role');
 assert.equal(await scalar("SELECT hq_verify_job_token('automation-queue-sweeper',$1) AS value",[token]),true);
 assert.equal(await scalar("SELECT hq_verify_job_token('delete-user',$1) AS value",[token]),false);
 await scalar("SELECT hq_dispatch_edge_function('automation-queue-sweeper','{}') AS value");
 await assert.rejects(()=>scalar("SELECT hq_dispatch_edge_function('delete-user','{}') AS value"),{code:'42501'});
 await identity();
 assert.equal(await scalar('SELECT url AS value FROM net.captured_requests ORDER BY id DESC LIMIT 1'),
  'https://llanezccussjtzzrbrtq.supabase.co/functions/v1/automation-queue-sweeper');
 assert.equal(await scalar("SELECT has_function_privilege('authenticated','hq_dispatch_edge_function(text,jsonb)','EXECUTE') AS value"),false);
});
test('signup metadata cannot grant a role; actual Auth invitations retain the invited role',async()=>{
 await db.exec(cutover);
 // Create a local Auth trigger using the real cutover function.
 await db.exec('CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()');
 const signup='50000000-0000-4000-8000-000000000001',invite='50000000-0000-4000-8000-000000000002';
 await db.query("INSERT INTO auth.users VALUES($1,'signup@example.test','{\"invited_role\":\"admin\"}',NULL),($2,'invite@example.test','{\"invited_role\":\"client\"}',now())",[signup,invite]);
 assert.equal(await scalar('SELECT count(*)::int AS value FROM user_roles WHERE user_id=$1',[signup]),0);
 assert.equal(await scalar('SELECT role::text AS value FROM user_roles WHERE user_id=$1',[invite]),'client');
});
test('cutover aborts before dropping a newly populated secret column',async()=>{
 await db.exec("ALTER TABLE venues ADD COLUMN IF NOT EXISTS toast_client_secret text; UPDATE venues SET toast_client_secret='synthetic-fixture-credential' WHERE id='"+project+"'");
 await assert.rejects(()=>db.exec(cutover),/Move venue Toast secrets/);
 assert.equal(await scalar("SELECT count(*)::int AS value FROM information_schema.columns WHERE table_schema='public' AND table_name='venues' AND column_name='toast_client_secret'"),1);
});

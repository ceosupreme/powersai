import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const user='10000000-0000-4000-8000-000000000001', project='20000000-0000-4000-8000-000000000001', lead='30000000-0000-4000-8000-000000000001';
await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${user}'::uuid$$;
CREATE TYPE capture_routed_type AS ENUM('task','idea','note','brand_asset','crm_lead','content_idea');
CREATE TABLE venues(id uuid PRIMARY KEY);
CREATE TABLE crm_companies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,status text,notes text,created_by uuid);
CREATE TABLE crm_contacts(id uuid DEFAULT gen_random_uuid(),company_id uuid REFERENCES crm_companies(id),first_name text,last_name text,email text,phone text,is_primary boolean,created_by uuid);
CREATE TABLE crm_deals(id uuid DEFAULT gen_random_uuid(),company_id uuid REFERENCES crm_companies(id),title text,stage text,notes text,created_by uuid);
CREATE TABLE crm_interactions(id uuid DEFAULT gen_random_uuid());
CREATE TABLE inbound_leads(id uuid PRIMARY KEY,name text,business_name text,email text,phone text,message text,status text,promoted_company_id uuid);
CREATE TABLE capture_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),raw_text text,status text DEFAULT 'inbox',routed_project_id uuid,routed_type capture_routed_type,routed_at timestamptz,ai_suggestion_status text);
CREATE TABLE log_entries(id uuid);
CREATE TABLE tasks(id uuid DEFAULT gen_random_uuid(),title text,description text,bar_id uuid,venue_id uuid,created_by uuid,status text);
CREATE TABLE content_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,title text,stage text,purpose_type text,purpose text,brief jsonb,quality_score int,quality_fails text[] DEFAULT ARRAY[]::text[],approved_at timestamptz);
CREATE TABLE knowledge_base(id uuid DEFAULT gen_random_uuid(),venue_id uuid,scope text,category text,subcategory text,title text,full_text text,status text,owner_id uuid);
CREATE TABLE brand_kits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid UNIQUE,created_by uuid);
CREATE TABLE brand_kit_links(id uuid DEFAULT gen_random_uuid(),kit_id uuid,label text,url text,category text);
CREATE TABLE production_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,kind text,title text,target_type text,target_id uuid,target_key text,recipe jsonb,level smallint,money_destination text,status text,current_step int,created_by text,result_links jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE action_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bar_id uuid,venue_id uuid,job_id uuid REFERENCES production_jobs(id),step_order int,method_id uuid,owner_kind text,title text NOT NULL,detail text,facts text,status text,approval_status text,priority text,assignee text,source text,is_manual boolean,created_by_id uuid,due_date date,depends_on uuid REFERENCES action_items(id));
INSERT INTO venues VALUES('${project}');
INSERT INTO inbound_leads VALUES('${lead}','Jane Q Smith','Example','jane@example.test','+15555550101','Inquiry','new',NULL);
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261102010000_hq_workflow_integrity.sql', import.meta.url),'utf8'));
const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const scalar=async(sql,args=[]) => (await one(sql,args)).v;
test.after(()=>db.close());
test('promotion creates company, contact with phone, and lead-stage deal exactly once',async()=>{
 const first=await scalar('SELECT hq_promote_inbound_lead($1) v',[lead]);
 assert.equal(await scalar('SELECT hq_promote_inbound_lead($1) v',[lead]),first);
 assert.equal(await scalar('SELECT count(*)::int v FROM crm_deals'),1);
 assert.deepEqual(await one('SELECT first_name,last_name,phone FROM crm_contacts'),{first_name:'Jane',last_name:'Q Smith',phone:'+15555550101'});
});
test('every capture type creates a linked destination; retries return same record',async()=>{
 for(const type of ['task','idea','note','brand_asset','crm_lead','content_idea']) {
  const {id}=await one('INSERT INTO capture_items(raw_text) VALUES($1) RETURNING id',[type==='brand_asset'?'https://example.test/logo.png':'Captured title\nFull details']);
  const routed=await scalar('SELECT hq_route_capture($1,$2,$3) v',[id,project,type]);
  assert.ok(routed.id); assert.ok(routed.table);
  assert.deepEqual(await scalar('SELECT hq_route_capture($1,$2,$3) v',[id,project,type]),routed);
  assert.equal(await scalar('SELECT status v FROM capture_items WHERE id=$1',[id]),'routed');
 }
});
test('invalid asset remains in inbox and creates no destination',async()=>{
 const {id}=await one("INSERT INTO capture_items(raw_text) VALUES('This is a note') RETURNING id");
 await assert.rejects(scalar('SELECT hq_route_capture($1,$2,$3) v',[id,project,'brand_asset']),/single http/);
 assert.equal(await scalar('SELECT status v FROM capture_items WHERE id=$1',[id]),'inbox');
});
const job={project_id:project,kind:'content',title:'Answer: a pain',target_type:'content_items',target_key:'pain:example',recipe:[],level:2};
const steps=[{title:'Research',owner_kind:'claude',facts:'{}'},{title:'Approve',owner_kind:'owner',facts:'{}'}];
test('pipeline creates content and dependent steps atomically; reopening reuses active job',async()=>{
 const args=[JSON.stringify(job),JSON.stringify(steps),JSON.stringify({title:'Answer: a pain',summary:'A question'})];
 const id=await scalar('SELECT hq_create_pipeline($1,$2,$3) v',args);
 assert.equal(await scalar('SELECT hq_create_pipeline($1,$2,$3) v',args),id);
 const rows=(await db.query('SELECT id,depends_on,approval_status FROM action_items WHERE job_id=$1 ORDER BY step_order',[id])).rows;
 assert.equal(rows.length,2); assert.equal(rows[1].depends_on,rows[0].id); assert.equal(rows[1].approval_status,'Blocked');
 await db.query("UPDATE production_jobs SET status='parked' WHERE id=$1",[id]);
 await assert.rejects(db.query("UPDATE action_items SET status='Done' WHERE id=$1",[rows[0].id]),/paused/);
});
test('failed step insertion rolls back its job and newly created content',async()=>{
 const before=await scalar('SELECT count(*)::int v FROM content_items');
 await assert.rejects(scalar('SELECT hq_create_pipeline($1,$2,$3) v',[JSON.stringify({...job,target_key:'pain:broken'}),JSON.stringify([{owner_kind:'claude'}]),JSON.stringify({title:'Should roll back'})]),/null value/);
 assert.equal(await scalar('SELECT count(*)::int v FROM content_items'),before);
 assert.equal(await scalar("SELECT count(*)::int v FROM production_jobs WHERE target_key='pain:broken'"),0);
});
test('caller cannot promote or route inaccessible rows',async()=>{
 await db.exec(`GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
 ALTER TABLE inbound_leads ENABLE ROW LEVEL SECURITY; ALTER TABLE capture_items ENABLE ROW LEVEL SECURITY;
 SET ROLE authenticated;`);
 try {
  await assert.rejects(scalar('SELECT hq_promote_inbound_lead($1) v',[lead]),/access denied/);
  const id='30000000-0000-4000-8000-000000000099';
  await assert.rejects(scalar('SELECT hq_route_capture($1,$2,$3) v',[id,project,'note']),/access denied/);
 } finally { await db.exec('RESET ROLE'); }
});

test('pause blocks late worker writes and resume preserves completed steps',async()=>{
 const id=await scalar('SELECT hq_create_pipeline($1,$2) v',[JSON.stringify({...job,target_key:'pause-test'}),JSON.stringify(steps)]);
 const rows=(await db.query('SELECT id FROM action_items WHERE job_id=$1 ORDER BY step_order',[id])).rows;
 await db.query("UPDATE action_items SET status='Done' WHERE id=$1",[rows[0].id]);
 await db.query('SELECT hq_pause_pipeline($1,true)',[id]);
 await assert.rejects(db.query("UPDATE action_items SET status='Done' WHERE id=$1",[rows[1].id]),/paused/);
 await db.query('SELECT hq_pause_pipeline($1,false)',[id]);
 assert.equal(await scalar('SELECT status v FROM action_items WHERE id=$1',[rows[0].id]),'Done');
 assert.equal(await scalar('SELECT approval_status v FROM action_items WHERE id=$1',[rows[1].id]),'Approved');
 assert.equal(await scalar('SELECT current_step v FROM production_jobs WHERE id=$1',[id]),2);
});
test('approval rejects missing scores, low scores and hard failures at the database boundary',async()=>{
 const {id}=await one("INSERT INTO content_items(title) VALUES('Quality test') RETURNING id");
 for(const [score,fails] of [[null,[]],[79,[]],[90,['missing evidence']]]) {
  await db.query('UPDATE content_items SET quality_score=$1,quality_fails=$2 WHERE id=$3',[score,fails,id]);
  await assert.rejects(db.query('UPDATE content_items SET approved_at=now() WHERE id=$1',[id]),/at least 80/);
 }
 await db.query('UPDATE content_items SET quality_score=80,quality_fails=ARRAY[]::text[],approved_at=now() WHERE id=$1',[id]);
 assert.ok(await scalar('SELECT approved_at v FROM content_items WHERE id=$1',[id]));
});

import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const actor='00000000-0000-4000-8000-000000000001',brand='00000000-0000-4000-8000-000000000002';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'$$;
CREATE TABLE user_roles(user_id uuid,role text); CREATE TABLE venues(id uuid PRIMARY KEY,name text);
CREATE FUNCTION has_role(u uuid,r text) RETURNS boolean LANGUAGE sql AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r)$$;
CREATE FUNCTION user_can_access_project(p uuid) RETURNS boolean LANGUAGE sql AS $$SELECT has_role(auth.uid(),'admin')$$;
CREATE FUNCTION user_can_manage_brand(p uuid) RETURNS boolean LANGUAGE sql AS $$SELECT has_role(auth.uid(),'admin')$$;
CREATE TABLE content_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,title text,purpose_type text,stage text,format text,due_date date,created_by uuid,brief jsonb,published_at timestamptz,approved_at timestamptz,quality_score int,quality_notes text,quality_fails text[] NOT NULL DEFAULT '{}');
CREATE UNIQUE INDEX idx_content_items_daily_post_unique ON content_items(project_id,due_date) WHERE purpose_type='daily_post' AND due_date IS NOT NULL;
CREATE TABLE content_placements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_item_id uuid,project_id uuid,channel text CONSTRAINT content_placements_channel_check CHECK(channel IN ('instagram','facebook','other')),account_label text,status text,scheduled_for timestamptz,receipt jsonb,idempotency_key text UNIQUE,live_url text,verified_at timestamptz,created_at timestamptz DEFAULT now(),CONSTRAINT published_needs_link CHECK(status<>'published' OR (live_url IS NOT NULL AND verified_at IS NOT NULL)));
CREATE TABLE agent_handoffs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_item_id uuid,spec jsonb,brand_ids uuid[],result jsonb);
INSERT INTO user_roles VALUES('${actor}','admin');INSERT INTO venues VALUES('${brand}','Big Paws Club');`);
await db.exec(await readFile('drizzle/migrations/0015_drive_daily_post_mark.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0016_drive_post_platform_captions.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0027_daily_post_pieces_and_agent_upsert.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0028_daily_post_one_tap_and_undo.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0029_daily_post_quality_fails_default.sql','utf8'));
after(()=>db.close());
async function role(value){await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:value,sub:actor})]);}
async function up(p){await role('service_role');return (await db.query('SELECT hq_upsert_daily_post($1) r',[JSON.stringify({brand_id:brand,post_date:'2099-01-01',title:'Fixture topic',...p})])).rows[0].r;}
test('create/update main and second piece are independent with exact placement keys',async()=>{
 const a=await up({placements:[{channel:'facebook',caption:'Main'}]});assert.equal(a.created,true);
 const b=await up({piece:'graphic',placements:[{channel:'facebook',caption:'Graphic'}]});assert.equal(b.created,true);assert.notEqual(a.content_item_id,b.content_item_id);
 assert.equal((await up({title:'Updated topic'})).content_item_id,a.content_item_id);
 const keys=(await db.query('SELECT idempotency_key FROM content_placements ORDER BY idempotency_key')).rows.map(r=>r.idempotency_key);
 assert.deepEqual(keys,[`daily:${brand}:2099-01-01:facebook`,`daily:${brand}:2099-01-01:graphic:facebook`]);
});
test('absent scores/media stay saved, explicit null clears, and post status clears old waiting details',async()=>{
 await up({quality_score:87,quality_notes:'Actual reason',quality_fails:['Fix'],media:[{drive_file_id:'file',kind:'image'}],post_status:'waiting_on_owner',waiting_reason:'missing_logo',waiting_detail:'Missing logo',almost_ready_detail:'Old'});
 await up({post_status:'ready'});
 let c=(await db.query("SELECT * FROM content_items WHERE coalesce(brief->'daily_post'->>'piece','main')='main'")).rows[0];assert.equal(c.quality_score,87);assert.equal(c.brief.daily_post.media.length,1);assert.equal(c.brief.daily_post.waiting_detail,null);assert.equal(c.brief.daily_post.almost_ready_detail,null);
 await up({quality_notes:null,media:null});c=(await db.query('SELECT * FROM content_items WHERE id=$1',[c.id])).rows[0];assert.equal(c.quality_notes,null);assert.equal(c.brief.daily_post.media,null);assert.equal(c.quality_score,87);
 await up({quality_fails:null});assert.deepEqual((await db.query('SELECT quality_fails FROM content_items WHERE id=$1',[c.id])).rows[0].quality_fails,[]);
});
test('published needs a live link; published placements are never rewritten',async()=>{
 await assert.rejects(up({piece:'invalid',placements:[{channel:'threads',status:'published'}]}),/live_url/);
 const x=await up({piece:'verified',placements:[{channel:'threads',status:'published',live_url:'https://example.com/thread',caption:'Original'}]});
 await up({piece:'verified',placements:[{channel:'threads',status:'planned',caption:'Changed',live_url:null}]});
 const p=(await db.query('SELECT * FROM content_placements WHERE id=$1',[x.placements[0].id])).rows[0];assert.equal(p.receipt.caption,'Original');assert.equal(p.status,'published');assert.equal(p.live_url,'https://example.com/thread');assert.equal(p.receipt.verified_by,'agent');assert.ok(p.verified_at);
});
test('one-tap no-link marking counts as posted and Undo restores status, receipt and mailbox',async()=>{
 const x=await up({piece:'undo',post_status:'ready',placements:[{channel:'facebook',status:'scheduled',scheduled_for:'2099-01-01T12:30:00-08:00',caption:'Keep'}]});
 await db.query('INSERT INTO agent_handoffs(content_item_id,spec,brand_ids,result) VALUES($1,$2,$3,$4)',[x.content_item_id,JSON.stringify({type:'social_post',post_date:'2099-01-01',piece:'undo'}),[brand],'{}']);
 await role('authenticated');const result=(await db.query('SELECT hq_mark_daily_post_posted($1,null,null) r',[x.placements[0].id])).rows[0].r;assert.equal(result.all_posted,true);assert.ok(result.undo_at);
 const c=(await db.query('SELECT * FROM content_items WHERE id=$1',[x.content_item_id])).rows[0];assert.equal(c.brief.daily_post.post_status,'posted');assert.ok(c.published_at);
 let p=(await db.query('SELECT * FROM content_placements WHERE id=$1',[x.placements[0].id])).rows[0];assert.equal(p.status,'scheduled');assert.equal(p.live_url,null);assert.ok(p.receipt.posted_no_link_by);
 assert.equal((await db.query('SELECT result FROM agent_handoffs WHERE content_item_id=$1',[x.content_item_id])).rows[0].result.posted_no_link.length,1);
 await db.query('SELECT hq_undo_daily_post($1,$2)',[p.id,result.undo_at]);p=(await db.query('SELECT * FROM content_placements WHERE id=$1',[p.id])).rows[0];assert.equal(p.status,'scheduled');assert.deepEqual(p.receipt,{caption:'Keep'});
 assert.equal((await db.query('SELECT brief FROM content_items WHERE id=$1',[x.content_item_id])).rows[0].brief.daily_post.post_status,'ready');assert.equal((await db.query('SELECT result FROM agent_handoffs WHERE content_item_id=$1',[x.content_item_id])).rows[0].result.posted_no_link.length,0);
});
test('nightly live link preserves human posting receipts and completes verification; Undo cannot overwrite it',async()=>{
 const x=await up({piece:'fill',post_status:'ready',placements:[{channel:'facebook',caption:'First'}]});await role('authenticated');
 const result=(await db.query('SELECT hq_mark_daily_post_posted($1,null,null) r',[x.placements[0].id])).rows[0].r;
 await up({piece:'fill',placements:[{channel:'facebook',live_url:'https://example.com/filled',first_comment:'First comment'}]});
 const p=(await db.query('SELECT * FROM content_placements WHERE id=$1',[x.placements[0].id])).rows[0];assert.equal(p.status,'published');assert.equal(p.receipt.posted_no_link_at,result.undo_at);assert.equal(p.receipt.posted_no_link_by,actor);assert.equal(p.receipt.first_comment,'First comment');assert.equal(p.receipt.verified_by,'agent');
 await role('authenticated');await assert.rejects(db.query('SELECT hq_undo_daily_post($1,$2)',[p.id,result.undo_at]),/cannot be undone/);
});
test('ordinary signed-in users cannot execute the agent writer even if admin',async()=>{
 await role('authenticated');await assert.rejects(db.query('SELECT hq_upsert_daily_post($1)',[JSON.stringify({brand_id:brand,post_date:'2099-01-01',title:'Forbidden'})]),/service role/);
 await db.exec('SET ROLE authenticated');await assert.rejects(db.query("SELECT hq_upsert_daily_post('{}')"),/permission denied/);await db.exec('RESET ROLE');
});
test('Drive-only marking remains main and does not reuse the second piece',async()=>{
 await role('service_role');const result=(await db.query('SELECT hq_mark_drive_daily_post_posted($1,$2,$3,$4,$5,$6,null,null) r',[actor,brand,'2099-01-01','checked-folder','{"caption":"Threads","captions":[]}','threads'])).rows[0].r;
 const c=(await db.query('SELECT brief FROM content_items WHERE id=$1',[result.content_item_id])).rows[0];assert.equal(c.brief.daily_post.piece,'main');assert.notEqual(result.content_item_id,(await up({piece:'graphic'})).content_item_id);
});
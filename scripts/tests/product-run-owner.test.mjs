import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const user = '10000000-0000-4000-8000-000000000001', brand = '20000000-0000-4000-8000-000000000001', template = '30000000-0000-4000-8000-000000000001', kb = '40000000-0000-4000-8000-000000000001';
const recipe = JSON.parse(await readFile('supabase/recipes/written_book.recipe.json', 'utf8'));
recipe.kind='product'; recipe.kb_id=kb;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${user}'::uuid$$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
CREATE FUNCTION public.user_can_manage_brand(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
CREATE FUNCTION public.hq_studio_can_access(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
CREATE TABLE venues(id uuid PRIMARY KEY); INSERT INTO venues VALUES('${brand}');
CREATE TABLE knowledge_base(id uuid,status text,tags text[]); INSERT INTO knowledge_base VALUES('${kb}','active',ARRAY['key:written_book']);
CREATE TABLE content_templates(id uuid PRIMARY KEY,slug text,version int,title text,description text,project_id uuid,status text,default_tier text,recipe jsonb,validation_evidence jsonb,created_by uuid,created_at timestamptz,updated_at timestamptz);
CREATE TABLE channel_products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,status text,created_by uuid,sales_page_url text);
CREATE TABLE channel_product_channels(product_id uuid,project_id uuid);
CREATE TABLE production_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,kind text,title text,target_type text,target_id uuid,target_key text,recipe jsonb,level smallint,money_destination text,goal_text text,goal_pillar_key text,goal_kpi_key text,status text,current_step integer,created_by text,result_links jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE action_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bar_id uuid,venue_id uuid,job_id uuid,step_order integer,method_id uuid,owner_kind text,title text,detail text,facts text,status text,approval_status text,priority text,assignee text,assignee_id uuid,source text,is_manual boolean,created_by_id uuid,due_date date,depends_on uuid,output_url text);
CREATE TABLE product_listings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid,outlet text,status text,url text,listed_at date,created_by uuid,created_at timestamptz DEFAULT now(),UNIQUE(product_id,outlet));
CREATE TABLE content_items(id uuid DEFAULT gen_random_uuid(),project_id uuid,title text,stage text,purpose_type text,purpose text,brief jsonb,created_by uuid);
CREATE TABLE post_results(id uuid,content_item_id uuid,post_url text,views int,reach int,likes int,comments int,shares int,saves int);
CREATE FUNCTION hq_studio_save(uuid,integer,jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;`);
await db.exec(await readFile('drizzle/migrations/0017_product_run_foundation.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0024_product_run_owner_actions.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0025_product_run_existing_status_words.sql','utf8'));
await db.exec(await readFile('drizzle/migrations/0026_product_run_listing_variable.sql','utf8'));
await db.query('INSERT INTO content_templates(id,slug,title,version,status,recipe) VALUES($1,$2,$3,2,\'ready\',$4)',[template,recipe.key,recipe.title,JSON.stringify(recipe)]);
after(()=>db.close());
let count=0;
async function fresh() {
  const steps=[{key:'extra:brand_rules',title:'Brand rules',owner:'claude'},...recipe.stages].map(s=>({title:s.title,owner_kind:s.owner,facts:JSON.stringify({stage_key:s.key}),priority:'P3-Medium'}));
  const j={project_id:brand,kind:'product',target_type:'channel_products',product_template_id:template,title:'Test product',level:2,recipe:[{id:kb,key:recipe.key,version:'2.0'}],new_product:{name:'Test product',request_key:`owner-run-test-${++count}`}};
  return (await db.query('SELECT hq_create_pipeline($1,$2,null) id',[JSON.stringify(j),JSON.stringify(steps)])).rows[0].id;
}
async function state(id) { return (await db.query('SELECT run_state FROM production_jobs WHERE id=$1',[id])).rows[0].run_state; }
async function act(id,key,action,details={},revision) { return (await db.query('SELECT hq_product_run_event($1,$2,$3,$4,$5) s',[id,revision??(await state(id)).revision??0,key,action,JSON.stringify(details)])).rows[0].s; }
async function focus(id,key) { const s=await state(id); await db.query("UPDATE action_items SET status='Done' WHERE job_id=$1 AND step_order<(SELECT step_order FROM action_items WHERE id=$2)",[id,s.stage_steps[key]]); }
test('choose and approve save keyed defaults and timestamps; approval completes only its matching task',async()=>{
  const id=await fresh();await focus(id,'approve_brief');
  let s=await act(id,'approve_brief','choose',{choice:'author_name',value:'sean_powers'});
  assert.equal(s.stage_results.approve_brief.choices.author_name,'sean_powers');assert.ok(s.stage_results.approve_brief.at);
  s=await act(id,'approve_brief','approve');assert.equal(s.stage_results.approve_brief.status,'done');
  assert.equal(s.stage_results.approve_brief.choices.subtitle,'candidate_1');
  assert.equal((await db.query('SELECT status FROM action_items WHERE id=$1',[s.stage_steps.approve_brief])).rows[0].status,'Done');
});
test('required owner skip is rejected and an allowed owner skip completes the matching task',async()=>{
  const id=await fresh();await focus(id,'approve_brief');
  const required=recipe.stages.find(s=>s.owner==='owner' && !s.skip.can_skip);await focus(id,required.key);
  await assert.rejects(act(id,required.key,'skip'),/cannot be skipped/);
  const allowed=recipe.stages.find(s=>s.owner==='owner' && s.skip.can_skip);
  const other=await fresh();await focus(other,allowed.key);assert.equal((await act(other,allowed.key,'skip')).stage_results[allowed.key].status,'skipped');
});
test('unknown stage, invalid option, future stage and stale revision are refused',async()=>{
  const id=await fresh();await focus(id,'approve_brief');
  await assert.rejects(act(id,'bad','approve'),/Unknown stage/);
  await assert.rejects(act(id,'approve_brief','choose',{choice:'author_name',value:'fake'}),/Invalid option/);
  await assert.rejects(act(id,'make_cover','approve'),/current stage/);
  await act(id,'approve_brief','choose',{choice:'author_name',value:'sean_powers'});
  await assert.rejects(act(id,'approve_brief','approve',{},0),/changed/);
});
test('reopen preserves history and chosen values, and resumes the reopened keyed task',async()=>{
  const id=await fresh();await focus(id,'approve_brief');await act(id,'approve_brief','approve');
  const s=await act(id,'approve_brief','reopen');assert.equal(s.stage_results.approve_brief.status,'open');assert.equal(s.stage_results.approve_brief.choices.author_name,'allmighty_supreme');assert.equal(s.stage_results.approve_brief.events.length,2);
  const row=(await db.query('SELECT status,step_order FROM action_items WHERE id=$1',[s.stage_steps.approve_brief])).rows[0];assert.equal(row.status,'Open');assert.equal((await db.query('SELECT current_step FROM production_jobs WHERE id=$1',[id])).rows[0].current_step,row.step_order);
});
test('agent output can carry real upload text keyed by page and field; empty output is refused',async()=>{
  const id=await fresh();const field=recipe.upload_kit.fields[1],key=`${field.page}::${field.field}`;
  await assert.rejects(act(id,'extra:brand_rules','output',{output:' '}),/output/);
  const s=await act(id,'extra:brand_rules','output',{output:'Prepared kit',upload_kit:{fields:{[key]:'The actual product title'}}});
  assert.equal(s.upload_kit.fields[key],'The actual product title');assert.equal(s.stage_results['extra:brand_rules'].output,'Prepared kit');
});
test('publication needs primary link; each outlet has its own row; retries update not duplicate; twins need both links',async()=>{
  const id=await fresh();await focus(id,'publish_kdp');
  await assert.rejects(act(id,'publish_kdp','approve'),/primary/);
  await assert.rejects(act(id,'publish_kdp','link',{outlet:'Paperback',url:'javascript:alert(1)'}),/URL/);
  await assert.rejects(act(id,'publish_kdp','link',{outlet:'Unknown',url:'https://example.com/book'}),/outlet/);
  await act(id,'publish_kdp','link',{outlet:'Kindle',url:'https://example.com/kindle'});
  await assert.rejects(act(id,'publish_kdp','approve'),/primary/);
  await act(id,'publish_kdp','link',{outlet:'Paperback',url:'https://example.com/book'});
  await act(id,'publish_kdp','link',{outlet:'Paperback',url:'https://example.com/book-v2'});
  const p=(await db.query('SELECT target_id FROM production_jobs WHERE id=$1',[id])).rows[0].target_id;
  assert.equal((await db.query('SELECT status FROM channel_products WHERE id=$1',[p])).rows[0].status,'live');
  await act(id,'list_twin','link',{outlet:'Etsy',url:'https://example.com/etsy'});
  assert.equal((await db.query('SELECT status FROM channel_products WHERE id=$1',[p])).rows[0].status,'live');
  await act(id,'list_twin','link',{outlet:'Payhip',url:'https://example.com/payhip'});
  assert.equal((await db.query('SELECT status FROM channel_products WHERE id=$1',[p])).rows[0].status,'twin listed');
  assert.equal((await db.query('SELECT count(*)::int n FROM product_listings WHERE product_id=$1',[p])).rows[0].n,4);
});
test('each supplied recipe resolves its outlets without changing its source JSON',async()=>{
  const expected={written_book:['Paperback','Kindle','Etsy','Payhip'],puzzle_book:['Paperback','Etsy','Payhip'],ebook_guide:['Etsy','Payhip','Brand site','Gumroad'],course:['Brand site','Course access']};
  for(const [key,names] of Object.entries(expected)) { const r=JSON.parse(await readFile(`supabase/recipes/${key}.recipe.json`,'utf8'));const rows=(await db.query('SELECT hq_product_run_outlets($1,$2) o',[JSON.stringify(r),'{}'])).rows[0].o;assert.deepEqual(rows.map(o=>o.outlet),names); }
});
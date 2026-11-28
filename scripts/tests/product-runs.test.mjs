import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const user = '10000000-0000-4000-8000-000000000001';
const project = '20000000-0000-4000-8000-000000000001';
const template = '30000000-0000-4000-8000-000000000001';
const kb = '40000000-0000-4000-8000-000000000001';
const recipe = JSON.parse(await readFile('supabase/recipes/written_book.recipe.json', 'utf8'));
recipe.kind = 'product'; recipe.kb_id = kb;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${user}'::uuid$$;
CREATE TABLE venues(id uuid PRIMARY KEY); INSERT INTO venues VALUES('${project}');
CREATE TABLE knowledge_base(id uuid,status text,tags text[]); INSERT INTO knowledge_base VALUES('${kb}','active',ARRAY['key:written_book']);
CREATE TABLE content_templates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text,version integer,title text,description text,project_id uuid,status text,default_tier text,recipe jsonb,validation_evidence jsonb,created_by uuid,created_at timestamptz,updated_at timestamptz);
CREATE TABLE channel_products(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,status text,created_by uuid);
CREATE TABLE channel_product_channels(product_id uuid,project_id uuid);
CREATE TABLE production_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,kind text,title text,target_type text,target_id uuid,target_key text,recipe jsonb,level smallint,money_destination text,goal_text text,goal_pillar_key text,goal_kpi_key text,status text,current_step integer,created_by text,result_links jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE action_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bar_id uuid,venue_id uuid,job_id uuid,step_order integer,method_id uuid,owner_kind text,title text,detail text,facts text,status text,approval_status text,priority text,assignee text,assignee_id uuid,source text,is_manual boolean,created_by_id uuid,due_date date,depends_on uuid);
CREATE TABLE content_items(id uuid DEFAULT gen_random_uuid(),project_id uuid,title text,stage text,purpose_type text,purpose text,brief jsonb,created_by uuid);
CREATE TABLE post_results(id uuid,content_item_id uuid,post_url text,views int,reach int,likes int,comments int,shares int,saves int);
CREATE FUNCTION hq_studio_save(uuid,integer,jsonb) RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;`);
await db.exec(await readFile('drizzle/migrations/0017_product_run_foundation.sql','utf8'));
await db.exec('CREATE TRIGGER content_templates_guard BEFORE INSERT OR UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION hq_studio_guard_template()');
await db.query(`INSERT INTO content_templates(id,slug,title,version,status,recipe) VALUES($1,'written_book',$2,2,'ready',$3)`, [template,recipe.title,JSON.stringify(recipe)]);
after(() => db.close());
const playbooks = [{ id: kb, key: 'written_book', version: '2.0' }];
const steps = [{ key: 'extra:brand_rules', owner: 'claude', title: 'Brand rules check' }, ...recipe.stages,
  { key: 'extra:platform', owner: 'owner', title: 'Platform setup' }].map(s => ({ title:s.title, owner_kind:s.owner,
  facts:JSON.stringify({stage_key:s.key}),priority:'P3-Medium' }));
const job = { project_id:project,kind:'product',target_type:'channel_products',product_template_id:template,
  title:'Approved test book',level:2,recipe:playbooks,new_product:{name:'Approved test book',request_key:'product-step1-test-create'} };
const call = async (j=job,s=steps) => (await db.query('SELECT hq_create_pipeline($1,$2,null) id',[JSON.stringify(j),JSON.stringify(s)])).rows[0].id;
let id;
test('run_state is nullable jsonb and old job recipe stays untouched', async () => {
  const {rows}=await db.query("SELECT data_type,is_nullable FROM information_schema.columns WHERE table_name='production_jobs' AND column_name='run_state'");
  assert.deepEqual(rows,[{data_type:'jsonb',is_nullable:'YES'}]);
});
test('new product and brand link exist before the pipeline is saved; retry resumes exactly one run', async () => {
  id=await call(); assert.equal(await call(),id);
  const {rows}=await db.query('SELECT p.name,j.target_type,j.recipe,j.run_state,l.product_id FROM production_jobs j JOIN channel_products p ON p.id=j.target_id JOIN channel_product_channels l ON l.product_id=p.id WHERE j.id=$1',[id]);
  assert.equal(rows.length,1);assert.equal(rows[0].target_type,'channel_products');assert.deepEqual(rows[0].recipe,playbooks);
  assert.deepEqual(rows[0].run_state.product_template.recipe,recipe);assert.equal(rows[0].run_state.product_template.version,2);
  assert.equal((await db.query('SELECT count(*)::int n FROM production_jobs')).rows[0].n,1);
});
test('resume by product id preserves the frozen version and completed state', async () => {
  const j=(await db.query('SELECT * FROM production_jobs WHERE id=$1',[id])).rows[0];
  await db.query("UPDATE production_jobs SET run_state=jsonb_set(run_state,'{stage_results}', '{\"check_shelf\":{\"status\":\"done\"}}') WHERE id=$1",[id]);
  assert.equal(await call({...job,target_id:j.target_id,new_product:undefined}),id);
  const r=(await db.query('SELECT run_state FROM production_jobs WHERE id=$1',[id])).rows[0].run_state;
  assert.equal(r.stage_results.check_shelf.status,'done');
  await assert.rejects(db.query("UPDATE production_jobs SET run_state=jsonb_set(run_state,'{product_template,version}','99') WHERE id=$1",[id]),/frozen recipe/);
});
test('keyed stage map includes inserted setup and platform steps without ordinal matching', async () => {
  const j=(await db.query('SELECT run_state FROM production_jobs WHERE id=$1',[id])).rows[0];
  assert.equal(Object.keys(j.run_state.stage_steps).length,14);
  const a=(await db.query('SELECT facts,step_order FROM action_items WHERE id=$1',[j.run_state.stage_steps.check_shelf])).rows[0];
  assert.equal(JSON.parse(a.facts).stage_key,'check_shelf');assert.equal(a.step_order,2);
  assert.ok(j.run_state.stage_steps['extra:platform']);
});
test('stage omissions and duplicate keys cannot create a product run', async () => {
  const fresh={...job,new_product:{name:'Bad stage map',request_key:'bad-stage-map-test'}};
  await assert.rejects(call(fresh,steps.slice(0,2)),/Every recipe stage/);
  await assert.rejects(call(fresh,[...steps,steps[0]]),/unique/);
  assert.equal((await db.query('SELECT count(*)::int n FROM channel_products')).rows[0].n,1);
});
test('wrong target type and unlinked product are refused', async () => {
  await assert.rejects(call({...job,target_type:'channel_product'}),/channel_products/);
  await assert.rejects(call({...job,target_id:'50000000-0000-4000-8000-000000000001'}),/does not belong/);
});
test('database load check rejects missing skip, bad recommendation and missing upload kit', async () => {
  for (const mutate of [r=>delete r.stages[1].skip,r=>r.stages[1].choices[0].options.forEach(o=>o.recommended=false),r=>delete r.upload_kit]) {
    const r=structuredClone(recipe);mutate(r);
    await assert.rejects(db.query('SELECT hq_check_product_recipe($1)',[JSON.stringify(r)]));
  }
});
test('product template cannot bypass post-template immutability rules', async () => {
  await assert.rejects(db.query("UPDATE content_templates SET recipe=recipe||'{\"version\":\"99\"}' WHERE id=$1",[template]),/immutable/);
});
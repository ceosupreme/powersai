import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const manager = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000003';
const viewer = '10000000-0000-4000-8000-000000000004';
const project = '20000000-0000-4000-8000-000000000001';
const otherProject = '20000000-0000-4000-8000-000000000002';
const template = '30000000-0000-4000-8000-000000000001';
const otherTemplate = '30000000-0000-4000-8000-000000000002';
const globalTemplate = '30000000-0000-4000-8000-000000000003';
const recipe = { format: 'reel', product_type: 'short_video', fields: [{ key: 'city', label: 'City' }], defaults: { city: 'San Diego' }, steps: [{ title: 'Research' }, { title: 'Draft' }, { title: 'Owner review' }] };
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
-- Reproduce Supabase's direct API-role grants: revoking PUBLIC alone is not
-- enough to close functions created under these default privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE user_roles(user_id uuid,role text);
CREATE TABLE venue_assignments(user_id uuid,venue_id uuid,role_at_venue text);
CREATE TABLE venues(id uuid PRIMARY KEY,project_type text DEFAULT 'internal_brand');
CREATE FUNCTION public.has_role(u uuid,r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=u AND role=r)$$;
CREATE FUNCTION public.user_can_access_page(u uuid,p text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT coalesce(current_setting('test.content_permission',true),'true')<>'false'$$;
CREATE FUNCTION public.user_can_access_project(p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM venue_assignments WHERE user_id=auth.uid() AND venue_id=p)$$;
CREATE FUNCTION public.user_can_manage_project(p uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM venue_assignments WHERE user_id=auth.uid() AND venue_id=p AND role_at_venue='manager')$$;
CREATE TABLE content_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES venues(id),title text NOT NULL,format text,stage text NOT NULL DEFAULT 'idea',hook text,cta text,purpose_type text,purpose text,brief jsonb,performance jsonb,idea_score integer,idea_evidence jsonb,quality_score integer,quality_fails text[] DEFAULT '{}',approved_at timestamptz,approved_by uuid,approved_version integer,published_at timestamptz,created_by uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE production_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid,kind text,title text,target_type text,target_id uuid,target_key text,recipe jsonb,level smallint,money_destination text,goal_text text,goal_pillar_key text,goal_kpi_key text,status text,current_step integer,created_by text,result_links jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE action_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bar_id uuid,venue_id uuid,job_id uuid REFERENCES production_jobs(id),step_order integer,method_id uuid,owner_kind text,title text NOT NULL,detail text,facts text,status text,approval_status text,priority text,assignee text,assignee_id uuid,source text,is_manual boolean,created_by_id uuid,due_date date,depends_on uuid REFERENCES action_items(id),completed_at timestamptz,completion_notes text,output_url text);
CREATE TABLE content_placements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),content_item_id uuid REFERENCES content_items(id),project_id uuid,channel text,status text,live_url text);
CREATE TABLE post_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),venue_id uuid,owner text NOT NULL,platform text NOT NULL,post_url text NOT NULL,posted_at timestamptz,format text,hook_text text,content_item_id uuid REFERENCES content_items(id),placement_id uuid REFERENCES content_placements(id),source text NOT NULL,captured_on date NOT NULL DEFAULT current_date,snapshot_day integer,views integer,reach integer,likes integer,comments integer,shares integer,saves integer,follows_gained integer,data jsonb NOT NULL DEFAULT '{}',notes text,UNIQUE(post_url,captured_on));
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_access ON content_items FOR ALL TO authenticated USING(user_can_access_project(project_id)) WITH CHECK(user_can_access_project(project_id));
ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_results_admin ON post_results FOR SELECT TO authenticated USING(has_role(auth.uid(),'admin'));
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
GRANT SELECT ON venues,user_roles,venue_assignments TO authenticated;
GRANT SELECT,INSERT,UPDATE ON content_items,production_jobs,action_items,content_placements TO authenticated;
GRANT SELECT ON post_results TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
INSERT INTO venues(id) VALUES('${project}'),('${otherProject}');
INSERT INTO user_roles VALUES('${manager}','manager'),('${other}','manager'),('${admin}','admin'),('${viewer}','staff');
INSERT INTO venue_assignments VALUES('${manager}','${project}','manager'),('${other}','${otherProject}','manager'),('${viewer}','${project}','staff');
`);
const migration = await readFile(new URL('../../supabase/migrations/20261119010000_content_studio.sql', import.meta.url), 'utf8');
await db.exec(migration);
// Match the existing live mailbox bridge. The new API must never use it to
// complete an owner review or a task whose real output has not been saved.
await db.exec(`CREATE FUNCTION agent_handoffs_on_done() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF NEW.status='done' AND OLD.status IS DISTINCT FROM 'done' AND NEW.action_item_id IS NOT NULL THEN
   UPDATE action_items SET status='Done',completed_at=now() WHERE id=NEW.action_item_id;
 END IF; RETURN NEW; END$$;
CREATE TRIGGER agent_handoffs_on_done BEFORE UPDATE OF status ON agent_handoffs FOR EACH ROW EXECUTE FUNCTION agent_handoffs_on_done();
CREATE FUNCTION enforce_content_approval() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF NEW.stage IN ('scheduled','published') AND NEW.approved_at IS NULL AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN RAISE EXCEPTION 'Owner approval required'; END IF; RETURN NEW; END$$;
CREATE TRIGGER trg_enforce_content_approval BEFORE INSERT OR UPDATE ON content_items FOR EACH ROW EXECUTE FUNCTION enforce_content_approval();`);

const row = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const scalar = async (sql, args = []) => (await row(sql, args)).v;
const role = async (name, user = '') => {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`SET ROLE ${name}`);
};
const save = (id, revision, patch) => scalar('SELECT hq_studio_save($1,$2,$3) v', [id, revision, JSON.stringify(patch)]);
const request = (id, revision, type, key, action = null) => scalar('SELECT hq_studio_request($1,$2,$3,$4,$5,$6) v', [id, revision, type, key, '', action]);
const claim = (id, worker = 'chatgpt') => scalar('SELECT hq_studio_claim($1,$2) v', [id, worker]);
const complete = (h, result, options = {}) => scalar('SELECT hq_studio_complete($1,$2,$3,$4,$5,$6) v', [h.id, options.token ?? h.studio_claim_token, options.revision ?? h.spec.content_revision, JSON.stringify(result), JSON.stringify(options.links ?? []), options.status ?? 'done']);
const newContent = async (title = 'Test draft', projectId = project) => {
  const c = await row('INSERT INTO content_items(project_id,title,created_by) VALUES($1,$2,auth.uid()) RETURNING *', [projectId, title]);
  return save(c.id, 0, { template_id: projectId === project ? template : otherTemplate, creative: { format: 'reel' } });
};
const researchResult = { summary: 'A sourced fact and a labeled scenario.', patch: { research: { facts: [
  { id: 'fact-1', text: 'An observed city fact.', kind: 'fact', source_url: 'https://example.test/official-source', source_title: 'Official source' },
  { id: 'scenario-1', text: 'This fictional condition is assumed for the story.', kind: 'scenario' },
] } } };
const draftResult = { summary: 'Three hook choices and a script are ready for review.', patch: { decisions: { hooks: [
  { id: 'a', text: 'What would this city sound like?', rationale: 'Sensory opening' },
  { id: 'b', text: 'One street. An entirely different rhythm.', rationale: 'Contrast' },
  { id: 'c', text: 'Take the long way through tonight.', rationale: 'Invitation' },
] }, creative: { script: 'Open on a quiet street, introduce the city through a real landmark, then build the story into the final payoff.' } } };
await role('authenticated', admin);
for (const [id, slug, scope] of [[template, 'guided-test', project], [otherTemplate, 'other-brand', otherProject], [globalTemplate, 'global-test', null]]) {
  await db.query("INSERT INTO content_templates(id,slug,title,project_id,status,recipe) VALUES($1,$2,$3,$4,'ready',$5)", [id, slug, slug, scope, JSON.stringify(recipe)]);
}
await role('authenticated', manager);
test.beforeEach(async () => { await role('authenticated', manager); });
test.after(async () => { await db.exec('RESET ROLE'); await db.close(); });

const assertFunctionPrivileges = async () => {
  const signatures = [
    ['hq_studio_can_access(uuid)', true, true],
    ['hq_studio_guard_template()', false, false],
    ['hq_studio_guard_content()', false, false],
    ['hq_studio_save(uuid,integer,jsonb)', true, true],
    ['hq_studio_request(uuid,integer,text,text,text,uuid)', true, false],
    ['hq_studio_tasks(uuid)', true, false],
    ['hq_studio_cancel(uuid)', true, false],
    ['hq_studio_claim(uuid,text)', false, true],
    ['hq_studio_complete(uuid,uuid,integer,jsonb,jsonb,text)', false, true],
    ['hq_studio_record_result(uuid,uuid,jsonb)', true, false],
    ['hq_studio_results(uuid)', true, false],
    ['hq_create_pipeline(jsonb,jsonb,jsonb)', true, true],
  ];
  for (const [signature, authenticatedAllowed, serviceAllowed] of signatures) {
    for (const [apiRole, expected] of [['anon', false], ['authenticated', authenticatedAllowed], ['service_role', serviceAllowed]]) {
      assert.equal(await scalar('SELECT has_function_privilege($1,$2,\'EXECUTE\') v', [apiRole, `public.${signature}`]), expected, `${apiRole} execute ${signature}`);
    }
  }
};

test('explicit function grants override Supabase default privileges without revoking existing composer service access', async () => {
  await assertFunctionPrivileges();
});

test('templates use existing project/page permissions and released recipes are immutable', async () => {
  assert.equal(await scalar('SELECT count(*)::int v FROM content_templates'), 2);
  await assert.rejects(db.query("INSERT INTO content_templates(slug,title,project_id,recipe) VALUES('wrong-brand','Wrong',$1,$2)", [otherProject, JSON.stringify(recipe)]), /row-level security/);
  await assert.rejects(db.query("INSERT INTO content_templates(slug,title,recipe) VALUES('global-denied','Wrong',$1)", [JSON.stringify(recipe)]), /row-level security/);
  await assert.rejects(db.query("UPDATE content_templates SET recipe=recipe||'{\"format\":\"long_form\"}' WHERE id=$1", [template]), /immutable/);
  await assert.rejects(db.query("UPDATE content_templates SET status='validated' WHERE id=$1", [template]), /measured post results/);
  await db.query("SELECT set_config('test.content_permission','false',false)");
  assert.equal(await scalar('SELECT count(*)::int v FROM content_templates'), 0);
  await db.query("SELECT set_config('test.content_permission','true',false)");
});

test('save freezes a version, preserves existing brief fields, merges choices and rejects stale writes', async () => {
  const { id } = await row("INSERT INTO content_items(project_id,title,brief,created_by) VALUES($1,'Idea','{\"summary\":\"Original source\",\"unknown_field\":42}',auth.uid()) RETURNING id", [project]);
  const c = await save(id, 0, { template_id: template, picks: { city: 'Dubai' }, decisions: { selected_hook: 'a' }, variants: [{ id: 'short-cut', platform: 'instagram' }] });
  assert.equal(c.brief.studio.revision, 1);
  assert.equal(c.brief.summary, 'Original source');
  assert.equal(c.brief.unknown_field, 42);
  assert.equal(c.brief.studio.template_snapshot.version, 1);
  const edited = await save(id, 1, { picks: { car: 'Example car' }, creative: { script: 'A reviewed original script.' } });
  assert.deepEqual(edited.brief.studio.picks, { city: 'Dubai', car: 'Example car' });
  assert.equal(edited.brief.studio.revision, 2);
  assert.equal((await save(id, 2, { picks: { car: 'Example car' } })).brief.studio.revision, 2);
  await assert.rejects(save(id, 1, { picks: { city: 'Stale overwrite' } }), /revision conflict/);
  await assert.rejects(save(id, 2, { template_id: globalTemplate }), /original template snapshot/);
  await assert.rejects(save(id, 2, { approved_at: 'now' }), /Unsupported Studio field/);
  await assert.rejects(db.query("UPDATE content_items SET brief=jsonb_set(brief,'{studio,template_snapshot,version}','999') WHERE id=$1", [id]), /original template snapshot/);
  await assert.rejects(db.query("UPDATE content_items SET brief=brief-'studio' WHERE id=$1", [id]), /provenance cannot be removed/);
});

test('creative edits invalidate approval; navigation and performance leave it intact; scores remain advisory', async () => {
  const c = await newContent();
  await db.query('UPDATE content_items SET approved_at=now(),approved_by=$2,approved_version=1,quality_score=22,quality_fails=ARRAY[\'Needs owner judgment\'] WHERE id=$1', [c.id, manager]);
  let edited = await save(c.id, 1, { step: 'review' });
  assert.ok(edited.approved_at);
  edited = await save(c.id, 2, { creative: { hook: 'A fresh opening' } });
  assert.equal(edited.approved_at, null);
  assert.equal(edited.approved_by, null);
  assert.equal(edited.approved_version, null);
  assert.equal(edited.quality_score, 22);
  assert.deepEqual(edited.quality_fails, ['Needs owner judgment']);
  await assert.rejects(db.query("UPDATE content_items SET stage='published' WHERE id=$1", [c.id]), /Owner approval/);
  await assert.rejects(db.query("UPDATE content_items SET hook='Changed while approving',approved_at=now(),stage='published' WHERE id=$1", [c.id]), /Owner approval/);
  await db.query("UPDATE content_items SET approved_at=now(),stage='published' WHERE id=$1", [c.id]);
  await assert.rejects(save(c.id, 3, { creative: { hook: 'Changed after publication' } }), /published revision/);
});

test('legacy JSON text, prose and scalar briefs remain usable and their original material is retained', async () => {
  for (const legacy of ['Original prose from an older import', JSON.stringify({ summary: 'Structured legacy summary', script: 'Keep this script' }), ['Old outline', 'Old source'], null]) {
    const { id } = await row("INSERT INTO content_items(project_id,title,brief,created_by) VALUES($1,'Legacy idea',$2,auth.uid()) RETURNING id", [project, JSON.stringify(legacy)]);
    const saved = await save(id, 0, { template_id: template });
    assert.equal(saved.brief.studio.revision, 1);
    assert.deepEqual(saved.brief.legacy_brief, legacy);
    if (typeof legacy === 'string') {
      if (legacy.startsWith('{')) { assert.equal(saved.brief.summary, 'Structured legacy summary'); assert.equal(saved.brief.script, 'Keep this script'); }
      else assert.equal(saved.brief.summary, legacy);
    }
  }
});

test('atomic composer creates exactly one existing content item/job with template choices and owner steps', async () => {
  const job = { project_id: project, kind: 'content', title: 'Atomic studio', target_type: 'content_items', target_key: 'studio:atomic-one', level: 2, recipe: [], goal_text: 'Useful audience growth' };
  const steps = [{ title: 'Research', owner_kind: 'claude' }, { title: 'Owner review', owner_kind: 'owner' }];
  const content = { title: 'Atomic studio', summary: 'A meaningful idea', format: 'reel', purpose_type: 'entertain', studio: { template_id: template, tier: 'guided', picks: { city: 'Dubai' } } };
  const args = [JSON.stringify(job), JSON.stringify(steps), JSON.stringify(content)];
  const jobId = await scalar('SELECT hq_create_pipeline($1,$2,$3) v', args);
  assert.equal(await scalar('SELECT hq_create_pipeline($1,$2,$3) v', args), jobId);
  const created = await row('SELECT c.*,j.goal_text FROM content_items c JOIN production_jobs j ON j.target_id=c.id WHERE j.id=$1', [jobId]);
  assert.equal(created.brief.studio.picks.city, 'Dubai');
  assert.equal(created.goal_text, 'Useful audience growth');
  assert.equal(created.purpose_type, 'entertain');
  const ordered = (await db.query('SELECT id,depends_on,assignee_id,approval_status FROM action_items WHERE job_id=$1 ORDER BY step_order', [jobId])).rows;
  assert.equal(ordered[1].depends_on, ordered[0].id);
  assert.equal(ordered[1].assignee_id, manager);
  assert.equal(ordered[1].approval_status, 'Blocked');
  const count = await scalar('SELECT count(*)::int v FROM content_items');
  await assert.rejects(scalar('SELECT hq_create_pipeline($1,$2,$3) v', [JSON.stringify({ ...job, target_key: 'studio:invalid' }), args[1], JSON.stringify({ ...content, studio: { template_id: otherTemplate } })]), /ready template/);
  assert.equal(await scalar('SELECT count(*)::int v FROM content_items'), count);
});

test('Studio request key makes creation retry safe even after completion, and content targets are scoped', async () => {
  const job = { project_id: project, kind: 'content', title: 'Retry safe studio', level: 2, recipe: [] };
  const steps = [{ title: 'Research', owner_kind: 'claude' }];
  const content = { title: 'Retry safe studio', summary: 'One item', request_key: 'stable-client-request-key', studio: { template_id: template } };
  const args = [JSON.stringify(job), JSON.stringify(steps), JSON.stringify(content)];
  const id = await scalar('SELECT hq_create_pipeline($1,$2,$3) v', args);
  assert.equal(await scalar('SELECT target_type v FROM production_jobs WHERE id=$1', [id]), 'content_items');
  assert.equal(await scalar('SELECT hq_create_pipeline($1,$2,$3) v', args), id);
  await db.query("UPDATE production_jobs SET status='finished' WHERE id=$1", [id]);
  assert.equal(await scalar('SELECT hq_create_pipeline($1,$2,$3) v', args), id);
  await assert.rejects(scalar('SELECT hq_create_pipeline($1,$2,$3) v', [args[0], args[1], JSON.stringify({ ...content, request_key: undefined })]), /stable Studio request key/);
  await role('authenticated', other); const foreign = await newContent('Other project', otherProject);
  await role('authenticated', manager);
  await assert.rejects(scalar('SELECT hq_create_pipeline($1,$2) v', [JSON.stringify({ ...job, target_type: 'content_items', target_id: foreign.id }), args[1]]), /does not belong/);
});

test('scoped mailbox queues once, masks lease tokens, rejects owner-step links and prevents worker impersonation', async () => {
  const c = await newContent();
  await db.query("UPDATE content_items SET idea_score=61,idea_evidence='{\"note\":\"Saved Radar observation\"}',purpose='Existing audience question' WHERE id=$1", [c.id]);
  const h = await request(c.id, 1, 'research', 'stable-queue-key');
  assert.equal(h.spec.content.idea_score, 61);
  assert.equal(h.spec.content.idea_evidence.note, 'Saved Radar observation');
  assert.equal(h.spec.content.purpose, 'Existing audience question');
  assert.equal((await request(c.id, 1, 'research', 'stable-queue-key')).id, h.id);
  await assert.rejects(request(c.id, 1, 'draft', 'stable-queue-key'), /different work/);
  await assert.rejects(request(c.id, 1, 'research', 'other-request-key'), /already queued/);
  await assert.rejects(claim(h.id), /permission denied/);
  await db.query("SELECT set_config('request.jwt.claim.role','service_role',false)");
  await assert.rejects(claim(h.id), /permission denied/);
  await role('authenticated', other);
  await assert.rejects(save(c.id, 1, { picks: { city: 'Intrusion' } }), /access denied/);
  await assert.rejects(scalar('SELECT count(*)::int v FROM hq_studio_tasks($1)', [c.id]), /access denied/);
  await assert.rejects(request(c.id, 1, 'research', 'intruder-request'), /access denied/);
  await role('service_role');
  const claimed = await claim(h.id);
  assert.ok(claimed.studio_claim_token);
  assert.equal(claimed.attempts, 1);
  await assert.rejects(claim(h.id), /not available/);
  await role('authenticated', manager);
  const tasks = (await db.query('SELECT * FROM hq_studio_tasks($1)', [c.id])).rows;
  assert.equal(tasks[0].studio_claim_token, null);
  const ownerStep = await row("INSERT INTO action_items(title,owner_kind,status) VALUES('Owner approval','owner','Open') RETURNING id");
  await assert.rejects(request(c.id, 1, 'draft', 'cannot-close-owner', ownerStep.id), /Only an available worker step/);
});

test('research round trip writes facts to the same content, rejects fake completion and is idempotent', async () => {
  const c = await newContent();
  const h = await request(c.id, 1, 'research', 'research-round-trip');
  await role('service_role');
  const claimed = await claim(h.id);
  await assert.rejects(complete(claimed, { summary: 'Done', patch: { research: { facts: [{ text: 'Unsupported claim', kind: 'fact' }] } } }), /source URL/);
  assert.equal(await scalar('SELECT status v FROM agent_handoffs WHERE id=$1', [h.id]), 'claimed');
  await assert.rejects(complete(claimed, researchResult, { token: '90000000-0000-4000-8000-000000000001' }), /lease does not match/);
  const done = await complete(claimed, researchResult);
  assert.equal(done.status, 'done');
  assert.equal(done.result.applied, true);
  assert.equal((await complete(claimed, researchResult)).id, done.id);
  await assert.rejects(complete(claimed, { ...researchResult, summary: 'Replacement' }), /cannot be replaced/);
  const after = await row('SELECT * FROM content_items WHERE id=$1', [c.id]);
  assert.equal(after.brief.studio.revision, 2);
  assert.deepEqual(after.brief.studio.research.facts, researchResult.patch.research.facts);
  assert.equal(after.stage, 'idea');
  assert.equal(after.approved_at, null);
  await role('authenticated', manager);
});

test('draft completion invalidates approval and only closes its explicitly linked available worker step', async () => {
  const c = await newContent();
  const j = await row("INSERT INTO production_jobs(project_id,kind,title,target_type,target_id,status) VALUES($1,'content','Draft workflow','content_items',$2,'running') RETURNING id", [project, c.id]);
  const a = await row("INSERT INTO action_items(job_id,title,owner_kind,status) VALUES($1,'Draft','claude','Open') RETURNING id", [j.id]);
  const owner = await row("INSERT INTO action_items(job_id,title,owner_kind,status,depends_on) VALUES($1,'Approve','owner','Open',$2) RETURNING id", [j.id, a.id]);
  await db.query('UPDATE content_items SET approved_at=now(),approved_by=$2 WHERE id=$1', [c.id, manager]);
  const h = await request(c.id, 1, 'draft', 'draft-round-trip', a.id);
  await role('service_role');
  const claimed = await claim(h.id);
  await assert.rejects(complete(claimed, { summary: 'A draft', patch: { creative: { script: 'A script without three original hook options.' } } }), /three hook options/);
  await complete(claimed, draftResult);
  const after = await row('SELECT * FROM content_items WHERE id=$1', [c.id]);
  assert.equal(after.brief.script, draftResult.patch.creative.script);
  assert.equal(after.approved_at, null);
  assert.equal(await scalar('SELECT status v FROM action_items WHERE id=$1', [a.id]), 'Done');
  assert.equal(await scalar('SELECT status v FROM action_items WHERE id=$1', [owner.id]), 'Open');
  await role('authenticated', manager);
});

test('worker-step completion remains atomic without the legacy mailbox bridge and rejects a paused pipeline', async () => {
  const c = await newContent();
  const j = await row("INSERT INTO production_jobs(project_id,kind,title,target_type,target_id,status) VALUES($1,'content','Standalone bridge','content_items',$2,'running') RETURNING id", [project, c.id]);
  const a = await row("INSERT INTO action_items(job_id,title,owner_kind,status) VALUES($1,'Research','claude','Open') RETURNING id", [j.id]);
  const h = await request(c.id, 1, 'research', 'bridge-independent-research', a.id);
  await role('service_role'); const claimed = await claim(h.id);
  await db.query("UPDATE production_jobs SET status='parked' WHERE id=$1", [j.id]);
  await assert.rejects(complete(claimed, researchResult), /no longer available/);
  assert.equal(await scalar("SELECT (brief->'studio'->>'revision')::int v FROM content_items WHERE id=$1", [c.id]), 1);
  assert.equal(await scalar('SELECT status v FROM agent_handoffs WHERE id=$1', [h.id]), 'claimed');
  await db.query("UPDATE production_jobs SET status='running' WHERE id=$1", [j.id]);
  await db.exec('RESET ROLE; ALTER TABLE agent_handoffs DISABLE TRIGGER agent_handoffs_on_done;');
  await role('service_role');
  try { await complete(claimed, researchResult); }
  finally { await db.exec('RESET ROLE; ALTER TABLE agent_handoffs ENABLE TRIGGER agent_handoffs_on_done;'); }
  assert.equal(await scalar('SELECT status v FROM action_items WHERE id=$1', [a.id]), 'Done');
  await role('authenticated', manager);
});

test('stale worker output cannot overwrite edits; cancellation and expired leases prevent late writes', async () => {
  const c = await newContent();
  const h = await request(c.id, 1, 'draft', 'stale-worker-task');
  await role('service_role'); const claimed = await claim(h.id);
  await role('authenticated', manager);
  await save(c.id, 1, { picks: { city: 'A different city' } });
  await role('service_role');
  await assert.rejects(complete(claimed, draftResult), /changed while the worker/);
  const parked = await complete(claimed, { summary: 'Owner changed the brief; results retained for review.', partial_output: draftResult }, { status: 'needs_owner' });
  assert.equal(parked.result.applied, false);
  assert.equal(await scalar("SELECT brief->'studio'->'picks'->>'city' v FROM content_items WHERE id=$1", [c.id]), 'A different city');
  await role('authenticated', manager);
  const next = await request(c.id, 2, 'draft', 'fresh-worker-task');
  await role('service_role'); const nextClaim = await claim(next.id);
  await db.query("UPDATE agent_handoffs SET studio_lease_expires_at=now()-interval '1 minute' WHERE id=$1", [next.id]);
  await assert.rejects(complete(nextClaim, draftResult), /lease expired/);
  const reclaimed = await claim(next.id);
  assert.equal(reclaimed.attempts, 2);
  await assert.rejects(complete(nextClaim, draftResult), /lease does not match/);
  await role('authenticated', manager);
  assert.equal((await scalar('SELECT hq_studio_cancel($1) v', [next.id])).status, 'cancelled');
  await role('service_role');
  await assert.rejects(complete(reclaimed, draftResult), /lease does not match/);
  await role('authenticated', manager);
});

test('production requires real assets and receipts, with no automatic approval or publication', async () => {
  const c = await newContent(); const h = await request(c.id, 1, 'production', 'production-round-trip');
  await role('service_role'); const claimed = await claim(h.id);
  await assert.rejects(complete(claimed, { summary: 'Prompt prepared', patch: { decisions: { shot_plan: 'Generate later' } } }), /finished asset URLs/);
  const result = { summary: 'Delivered final file for owner review.', patch: { creative: { asset_urls: ['https://example.test/finished-video.mp4'] }, variants: [{ id: 'reel', platform: 'instagram', asset_url: 'https://example.test/finished-video.mp4' }] } };
  await complete(claimed, result, { links: [{ label: 'Final file', url: 'https://example.test/finished-video.mp4' }] });
  const after = await row('SELECT stage,approved_at,brief FROM content_items WHERE id=$1', [c.id]);
  assert.equal(after.stage, 'idea'); assert.equal(after.approved_at, null);
  assert.deepEqual(after.brief.asset_urls, result.patch.creative.asset_urls);
  await role('authenticated', manager);
});

test('real result recording preserves attribution and previous metrics; validation needs evidence from this version', async () => {
  const c = await newContent();
  await db.query('UPDATE content_items SET approved_at=now() WHERE id=$1', [c.id]);
  const metrics = { platform: 'instagram', post_url: 'https://example.test/measured-post', views: 0, saves: 2 };
  const record = m => scalar('SELECT hq_studio_record_result($1,NULL,$2) v', [c.id, JSON.stringify(m)]);
  await assert.rejects(record({ platform: 'instagram', post_url: metrics.post_url }), /measured metric/);
  await assert.rejects(record({ ...metrics, views: -1 }), /nonnegative/);
  const r = await record(metrics);
  assert.equal(r.data.studio.template_id, template);
  assert.equal(r.data.studio.template_version, 1);
  const updated = await record({ platform: 'instagram', post_url: metrics.post_url, views: 20 });
  assert.equal(updated.id, r.id); assert.equal(updated.views, 20); assert.equal(updated.saves, 2);
  const after = await row('SELECT brief,approved_at FROM content_items WHERE id=$1', [c.id]);
  assert.equal(after.brief.studio.revision, 1); assert.ok(after.approved_at);
  assert.equal(await scalar('SELECT count(*)::int v FROM hq_studio_results($1)', [c.id]), 1);
  await db.query("UPDATE content_templates SET status='validated',validation_evidence=$2 WHERE id=$1", [template, JSON.stringify({ summary: 'Owner reviewed these measured results.', post_result_ids: [r.id] })]);
  assert.equal(await scalar('SELECT status v FROM content_templates WHERE id=$1', [template]), 'validated');
  await role('authenticated', other);
  await assert.rejects(scalar('SELECT count(*)::int v FROM hq_studio_results($1)', [c.id]), /access denied/);
  const another = await newContent('Other brand item', otherProject);
  await assert.rejects(scalar('SELECT hq_studio_record_result($1,NULL,$2) v', [another.id, JSON.stringify(metrics)]), /other content/);
  await role('authenticated', viewer);
  await assert.rejects(scalar('SELECT hq_studio_record_result($1,NULL,$2) v', [c.id, JSON.stringify(metrics)]), /access denied/);
  await role('authenticated', manager);
});

test('anonymous callers cannot execute privileged Studio entry points', async () => {
  await role('anon');
  for (const sql of ["SELECT hq_studio_save(NULL,0,'{}')", "SELECT hq_studio_request(NULL,0,'research','anonymous')", 'SELECT hq_studio_claim(NULL)', "SELECT hq_studio_complete(NULL,NULL,0,'{}')", 'SELECT * FROM hq_studio_tasks(NULL)', "SELECT hq_studio_record_result(NULL,NULL,'{}')"]) {
    await assert.rejects(db.query(sql), /permission denied/);
  }
  await role('authenticated', manager);
});

test('reapplying the migration preserves data and omitted format honors the database default', async () => {
  await db.exec('RESET ROLE');
  const before = await scalar('SELECT count(*)::int v FROM content_items');
  await db.exec(migration);
  assert.equal(await scalar('SELECT count(*)::int v FROM content_items'), before);
  await assertFunctionPrivileges();
  await db.exec("ALTER TABLE content_items ALTER COLUMN format SET DEFAULT 'short'");
  await role('authenticated', manager);
  const j = await scalar('SELECT hq_create_pipeline($1,$2,$3) v', [
    JSON.stringify({ project_id: project, kind: 'content', title: 'Legacy default preserved', target_key: 'legacy-default-preserved', level: 2 }),
    JSON.stringify([{ title: 'Research', owner_kind: 'claude' }]),
    JSON.stringify({ title: 'Legacy default preserved', summary: 'No explicit format' }),
  ]);
  assert.equal(await scalar('SELECT c.format v FROM content_items c JOIN production_jobs j ON j.target_id=c.id WHERE j.id=$1', [j]), 'short');
  await db.exec('RESET ROLE; ALTER TABLE content_items ALTER COLUMN format DROP DEFAULT;');
});

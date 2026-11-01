import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/composer-'));
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^@\// }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
} };
await build({ entryPoints: [join(root, 'src/lib/pipelineComposer.ts')], outfile: join(dir, 'c.mjs'), bundle: true, platform: 'node', format: 'esm', plugins: [stub] });
const c = await import(pathToFileURL(join(dir, 'c.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

const m = (key, kp, status = 'active') => ({ id: key, title: key, version: '1.0', status, tags: [`key:${key}`], key_points: JSON.stringify(kp), subcategory: null });
const br = m('brand_rules', {});

test('first step is the Claude brand rules check', () => {
  const s = c.buildRecipeSteps(br, null, [], [], []);
  assert.equal(s[0].title, 'Brand rules check');
  assert.equal(s[0].owner_kind, 'claude');
});

test('destination publish steps are dropped when the product type already publishes', () => {
  const pt = m('printable', { steps: [{ title: 'Make it', owner: 'claude' }, { title: 'Click Publish', owner: 'tool' }] });
  const etsy = m('etsy', { steps: [{ title: 'Create the listing', owner: 'owner' }, { title: 'Add tags', owner: 'claude' }] });
  const titles = c.buildRecipeSteps(br, pt, [etsy], [], []).map((x) => x.title);
  assert.deepEqual(titles, ['Brand rules check', 'Make it', 'Click Publish', 'Add tags']);
});

test('tool steps count as owner steps', () => {
  const pt = m('p', { steps: [{ title: 'Upload', owner: 'tool' }] });
  assert.equal(c.buildRecipeSteps(br, pt, [], [], [])[1].owner_kind, 'owner');
});

test('planned methods become one "Method not written yet" Claude step', () => {
  const draft = m('kdp', { steps: [{ title: 'a' }, { title: 'b' }] }, 'draft');
  const flagged = m('aff', { adds: [{ title: 'x' }], planned: true });
  const s = c.buildRecipeSteps(br, null, [draft], [flagged], []);
  assert.deepEqual(s.slice(1).map((x) => [x.title, x.owner_kind]), [['Method not written yet: kdp', 'claude'], ['Method not written yet: aff', 'claude']]);
});

test('monetization then promotion adds are appended in order', () => {
  const mon = m('direct_sale', { adds: [{ title: 'Price it', owner: 'owner' }] });
  const pro = m('video_to_product', { adds: [{ title: 'Make a video', owner: 'claude' }] });
  assert.deepEqual(c.buildRecipeSteps(br, null, [], [mon], [pro]).slice(1).map((x) => x.title), ['Price it', 'Make a video']);
});

test('approval, priority and assignee per step', () => {
  const ctx = { project_id: 'p', job_id: 'j', user_id: 'u' };
  const own1 = c.stepRow({ title: 'a', owner_kind: 'owner', method_id: null, method_key: 'k' }, 0, ctx);
  const own2 = c.stepRow({ title: 'b', owner_kind: 'owner', method_id: null, method_key: 'k' }, 3, ctx);
  const cl = c.stepRow({ title: 'c', owner_kind: 'claude', method_id: null, method_key: 'k' }, 1, ctx);
  assert.deepEqual([own1.approval_status, own2.approval_status, cl.approval_status], ['Approved', 'Blocked', 'Auto']);
  assert.deepEqual([own1.priority, cl.priority], ['P2-High', 'P3-Medium']);
  assert.deepEqual([own1.assignee, cl.assignee], ['Allmighty', 'Claude']);
  assert.equal(own2.step_order, 4);
});

test('lane check is due in 30 days, channel cadence check in 14', () => {
  const today = new Date('2026-11-01T12:00:00Z');
  const ctx = { project_id: 'p', job_id: 'j', user_id: null };
  const lane = c.laneSteps(br, null, '');
  const ch = c.channelSetupSteps(br, null);
  assert.equal(lane.length, 5); assert.equal(ch.length, 5);
  assert.equal(c.stepRow(lane[4], 4, ctx, today).due_date, '2026-12-01');
  assert.equal(c.stepRow(ch[4], 4, ctx, today).due_date, '2026-11-15');
});

test('recipe version string', () => {
  assert.equal(c.recipeVersionString([{ key: 'a', version: '1.0' }, { key: 'b', version: '1.1' }]), 'key:a@1.0+key:b@1.1');
});

test('prefill mappings', () => {
  assert.equal(c.platformToDestination('website'), 'own_site');
  assert.equal(c.platformToDestination('kdp_author'), 'kdp');
  assert.equal(c.outletToDestination('Kindle'), 'kdp');
  assert.equal(c.productTypeForFormat('long_form'), 'long_form_video');
  assert.equal(c.productTypeForFormat('reel'), 'short_video');
  assert.equal(c.productTypeForFormat('podcast'), 'social_piece');
  assert.equal(c.productTypeForName('Garden Word Search'), 'puzzle_book');
  assert.equal(c.productTypeForName('Habit Tracker'), 'journal_tracker');
  assert.equal(c.productTypeForName('Wall Art'), 'printable');
  assert.equal(c.laneDestinationKey('lane_etsy_shop'), 'etsy');
});

test('starter prompt ends with the write-back line', () => {
  const p = c.buildStarterPrompt({ brand: 'B', jobId: 'J1', jobTitle: 'T', moneyDestination: null, stepOrder: 3, stepTitle: 'S', method: { title: 'M', version: '2', tags: ['skill:writer'] }, facts: null });
  assert.match(p, /Skill to load: writer/);
  assert.ok(p.endsWith('Write the result back to Supreme Team HQ: mark step 3 of job J1 Done with the output link.'));
});

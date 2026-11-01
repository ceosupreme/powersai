import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/playbooks-'));
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^@\/integrations/ }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
} };
const load = async (f, n) => {
  await build({ entryPoints: [join(root, f)], outfile: join(dir, n), bundle: true, platform: 'node', format: 'esm', plugins: [stub], alias: { '@': join(root, 'src') } });
  return import(pathToFileURL(join(dir, n)).href);
};
const ps = await load('src/lib/playbookStatus.ts', 'ps.mjs');
const c = await load('src/lib/pipelineComposer.ts', 'c.mjs');
const sort = await load('src/lib/portfolioSort.ts', 's.mjs');
after(() => rm(dir, { recursive: true, force: true }));

const T = '2026-11-01';
const steps = (n) => JSON.stringify({ steps: Array.from({ length: n }, (_, i) => ({ n: i + 1, title: `s${i}` })) });

test('draft is Planned', () => assert.equal(ps.playbookStatus({ status: 'draft', expiry_date: null }, T), 'Planned'));
test('active with 1,500-char full text is Written', () => assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, full_text: 'x'.repeat(1500) }, T), 'Written'));
test('active with 1,499 chars and nothing else is Thin', () => assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, full_text: 'x'.repeat(1499) }, T), 'Thin'));
test('skill or pack tag makes it Written', () => {
  assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, tags: ['skill:etsy-lister'] }, T), 'Written');
  assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, tags: ['pack:kdp'] }, T), 'Written');
});
test('5 steps Written, 4 steps Thin', () => {
  assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, key_points: steps(5) }, T), 'Written');
  assert.equal(ps.playbookStatus({ status: 'active', expiry_date: null, key_points: steps(4) }, T), 'Thin');
});
test('past review-by date makes a deep playbook Thin; today still counts', () => {
  const deep = { status: 'active', full_text: 'x'.repeat(2000) };
  assert.equal(ps.playbookStatus({ ...deep, expiry_date: '2026-10-31' }, T), 'Thin');
  assert.equal(ps.playbookStatus({ ...deep, expiry_date: T }, T), 'Written');
});
test('superseded and archived are hidden', () => {
  assert.equal(ps.isHiddenPlaybook({ status: 'superseded' }), true);
  assert.equal(ps.isHiddenPlaybook({ status: 'archived' }), true);
  assert.equal(ps.isHiddenPlaybook({ status: 'active' }), false);
});
test('source status words', () => {
  assert.equal(ps.sourceStatusWord({ status: 'merged', merged_version: '1.2', merge_notes: null }), 'Merged into v1.2');
  assert.equal(ps.sourceStatusWord({ status: 'rejected', merged_version: null, merge_notes: 'duplicate' }), 'Rejected: duplicate');
});
test('platform to playbook key mapping', () => {
  assert.equal(ps.platformPlaybookKey('website'), 'own_site');
  assert.equal(ps.platformPlaybookKey('etsy_shop'), 'etsy');
  assert.equal(ps.platformPlaybookKey('spotify'), null);
});
test('compact followers', () => assert.equal(ps.compactNumber(32100), '32.1K'));

const m = (key, sub) => ({ id: key, title: key, version: '1', status: 'active', tags: [`key:${key}`], key_points: '{}', subcategory: sub });
test('recipe order puts niches right after brand rules', () => {
  const r = c.orderRecipe(m('br', 'brand_rules'), [m('n1', 'niche'), m('n2', 'niche')], [m('pt', 'product_type'), m('etsy', 'destination'), null]);
  assert.deepEqual(r.map((x) => x.id), ['br', 'n1', 'n2', 'pt', 'etsy']);
});
test('money paths with setup still add only their adds', () => {
  const mon = { ...m('aff', 'monetization'), key_points: JSON.stringify({ adds: [{ title: 'Add link', owner: 'claude' }], setup: [{ n: 1, title: 'Open account', owner: 'owner' }] }) };
  assert.deepEqual(c.buildRecipeSteps(null, null, [], [mon], []).slice(1).map((s) => s.title), ['Add link']);
});

test('score sort puts empty scores last', () => {
  const cards = [{ id: 'a', name: 'A', overall: null }, { id: 'b', name: 'B', overall: 40 }, { id: 'c', name: 'C', overall: 90 }];
  assert.deepEqual(cards.sort(sort.portfolioSorter('score')).map((x) => x.id), ['c', 'b', 'a']);
});
test('followers sort uses brand_channels totals', () => {
  const ch = new Map([['a', { total: 1, live: 1, followers: 10 }], ['b', { total: 2, live: 0, followers: 500 }]]);
  const cards = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  assert.deepEqual(cards.sort(sort.portfolioSorter('followers', null, ch)).map((x) => x.id), ['b', 'a']);
  assert.deepEqual(cards.sort(sort.portfolioSorter('live', null, ch)).map((x) => x.id), ['a', 'b']);
});

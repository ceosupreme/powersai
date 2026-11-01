import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/setup-'));
const stub = { name: 'stub', setup(b) {
  b.onResolve({ filter: /^@\/integrations/ }, (a) => ({ path: a.path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
} };
const load = async (f, n) => {
  await build({ entryPoints: [join(root, f)], outfile: join(dir, n), bundle: true, platform: 'node', format: 'esm', plugins: [stub], alias: { '@': join(root, 'src') } });
  return import(pathToFileURL(join(dir, n)).href);
};
const s = await load('src/lib/brandSetup.ts', 'bs.mjs');
const sort = await load('src/lib/portfolioSort.ts', 'ps.mjs');
after(() => rm(dir, { recursive: true, force: true }));

const row = (o) => ({ asset_key: 'a', label: 'A', grp: 'Social', state: 'missing', priority: 50, setup_minutes: 10, channel_id: null, by_profile: false, by_niches: [], lane_labels: [], playbook_key: null, unlocks: '', ...o });

test('why line joins profile, niches and lanes', () => {
  assert.equal(s.whyLine(row({ by_profile: true, by_niches: ['Puzzles'], lane_labels: ['KDP', 'Etsy'] })),
    'Standard for this kind of brand. Fits Puzzles. Needed for KDP, Etsy');
});

test('zero minutes means Claude makes this', () => {
  assert.equal(s.minutesText(0), 'Claude makes this');
  assert.equal(s.minutesText(15), 'About 15 minutes of your time');
});

test('top 3 picks highest priority missing without an open job', () => {
  const rows = [row({ asset_key: 'a', priority: 90, channel_id: 'c1' }), row({ asset_key: 'b', priority: 80 }), row({ asset_key: 'c', priority: 70 }),
    row({ asset_key: 'd', priority: 60 }), row({ asset_key: 'e', priority: 99, state: 'planned' })];
  assert.deepEqual(s.topMissing(rows, new Set(['c1'])).map((r) => r.asset_key), ['b', 'c', 'd']);
  assert.equal(s.totalMinutes(s.topMissing(rows, new Set())), 30);
});

test('media kit job has the three required steps', () => {
  assert.deepEqual(s.MEDIA_KIT_STEPS.map((x) => x.owner_kind), ['claude', 'owner', 'claude']);
  assert.equal(s.MEDIA_KIT_STEPS[1].title, 'Check the rates and approve');
});

test('match preselects handle, then the only channel, else new', () => {
  const ch = [{ id: '1', platform: 'instagram', handle: '@Foo' }, { id: '2', platform: 'instagram', handle: 'bar' }, { id: '3', platform: 'tiktok', handle: null }];
  assert.equal(s.defaultMatch({ platform: 'instagram', handle: 'foo' }, ch), '1');
  assert.equal(s.defaultMatch({ platform: 'instagram', handle: 'zzz' }, ch), 'new');
  assert.equal(s.defaultMatch({ platform: 'tiktok', handle: 'x' }, ch), '3');
});

test('setup brief lists gaps with playbook link and ends with the password line', () => {
  const text = s.buildSetupBrief({ brand: 'B', niche: 'Puzzles', kit: null, inUse: [], gaps: [row({ playbook_key: 'x' })], playbookIdByKey: new Map([['x', 'id1']]) });
  assert.match(text, /1\. A/);
  assert.match(text, /https:\/\/supremeteammedia\.com\/playbooks\?open=id1/);
  assert.equal(text.trim().split('\n').at(-1), 'Never paste passwords into chat or HQ; log in directly on the platform.');
});

test('source words', () => {
  assert.equal(s.sourceWord('screenshot'), 'from a screenshot');
  assert.equal(s.sourceWord('metricool'), 'from Metricool');
  assert.equal(s.sourceWord('manual'), 'entered by hand');
});

test('Setup gaps sort puts most gaps first', () => {
  const cards = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  const setup = new Map([['a', { gaps: 2 }], ['b', { gaps: 9 }]]);
  assert.deepEqual([...cards].sort(sort.portfolioSorter('gaps', null, null, setup)).map((c) => c.id), ['b', 'a', 'c']);
});

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/radar-tests-'));
const requests = [];
globalThis.__radarClient = { from(table) {
  const operations = [];
  const query = new Proxy({}, { get(_, method) {
    if (method === 'then') return done => { requests.push({ table, operations }); return Promise.resolve({ data: [], error: null }).then(done); };
    return (...args) => { operations.push([method, ...args]); return query; };
  } });
  return query;
} };
await build({ entryPoints: [join(root, 'src/lib/radarData.ts')], outfile: join(dir, 'radar.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'fixture', setup(b) {
  b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'fixture', namespace: 'radar' }));
  b.onLoad({ filter: /.*/, namespace: 'radar' }, () => ({ contents: 'export const supabase = globalThis.__radarClient;', loader: 'js' }));
} }] });
const radar = await import(pathToFileURL(join(dir, 'radar.mjs')).href);
after(async () => { delete globalThis.__radarClient; await rm(dir, { recursive: true, force: true }); });

test('Niche Profiles reads only niche_profile sources', async () => {
  await radar.fetchRadarSources('niche_profile');
  const request = requests.at(-1);
  assert.equal(request.table, 'content_sources');
  assert.deepEqual(request.operations.find(op => op[0] === 'eq'), ['eq', 'source_type', 'niche_profile']);
});
test('Dimension Library reads only radar_dimension sources', async () => {
  await radar.fetchRadarSources('radar_dimension');
  assert.deepEqual(requests.at(-1).operations.find(op => op[0] === 'eq'), ['eq', 'source_type', 'radar_dimension']);
});
test('Radar Briefs applies exact purpose prefix', async () => {
  await radar.fetchRadarBriefs();
  assert.equal(requests.at(-1).table, 'content_items');
  assert.deepEqual(requests.at(-1).operations.find(op => op[0] === 'like'), ['like', 'purpose', 'Radar brief%']);
});
test('Radar Briefs keeps brands separate and sorts scores descending, missing scores last', () => {
  const rows = [
    { id: 'low', project_id: 'a', idea_score: 4, venues: { name: 'Alpha' } },
    { id: 'other', project_id: 'b', idea_score: 99, venues: { name: 'Beta' } },
    { id: 'missing', project_id: 'a', idea_score: null, venues: { name: 'Alpha' } },
    { id: 'high', project_id: 'a', idea_score: 85, venues: { name: 'Alpha' } },
    { id: 'zero', project_id: 'a', idea_score: 0, venues: { name: 'Alpha' } },
  ];
  const groups = radar.groupRadarBriefs(rows);
  assert.deepEqual(groups.map(g => g.brand), ['Alpha', 'Beta']);
  assert.deepEqual(groups[0].items.map(i => i.id), ['high', 'low', 'zero', 'missing']);
  assert.equal(groups[1].items[0].id, 'other');
});
test('shelf is parsed from PROVEN or EMERGING in the title', () => {
  assert.equal(radar.radarShelf('How To (PROVEN)'), 'PROVEN');
  assert.equal(radar.radarShelf('A new format (EMERGING)'), 'EMERGING');
  assert.equal(radar.radarShelf('Other structure'), 'UNCLASSIFIED');
});
test('evidence renders notes and YouTube links from nested evidence and direct arrays', () => {
  const evidence = [{ note: '135x breakout', v: 'Fwt0lqZ6el8' }, { note: 'No video', v: '' }];
  assert.deepEqual(radar.radarEvidence({ evidence }), [{ note: '135x breakout', url: 'https://www.youtube.com/watch?v=Fwt0lqZ6el8' }, { note: 'No video', url: undefined }]);
  assert.deepEqual(radar.radarEvidence(evidence), radar.radarEvidence({ evidence }));
  assert.deepEqual(radar.radarEvidence(null), []);
});
test('Run Log reads winner_radar runs newest first', async () => {
  await radar.fetchRadarRuns();
  const request = requests.at(-1);
  assert.equal(request.table, 'context_source_runs');
  assert.deepEqual(request.operations.find(op => op[0] === 'eq'), ['eq', 'source_type', 'winner_radar']);
  assert.deepEqual(request.operations.find(op => op[0] === 'order'), ['order', 'started_at', { ascending: false }]);
});
test('external research links reject executable URLs', () => {
  assert.equal(radar.researchUrl('javascript:alert(1)'), undefined);
  assert.equal(radar.researchUrl('https://example.com/research'), 'https://example.com/research');
});
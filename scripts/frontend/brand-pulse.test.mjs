import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(resolve('node_modules/.cache/brand-pulse-'));
await build({ entryPoints: ['src/lib/brandPulse.ts', 'src/lib/portfolioSort.ts'], outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm' });
const pulse = await import(pathToFileURL(join(dir, 'brandPulse.mjs')).href);
const sort = await import(pathToFileURL(join(dir, 'portfolioSort.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const NOW = Date.parse('2026-11-13T20:00:00Z');
const ago = (d) => new Date(NOW - d * 86_400_000).toISOString();

test('red when nothing published and no task finished in 7 days', () => {
  assert.equal(pulse.pulseStatus({ published7: 0, done7: 0, setupPct: 90 }).status, 'red');
});
test('amber when only one of publishing or finishing happened, or setup under 50%', () => {
  assert.equal(pulse.pulseStatus({ published7: 2, done7: 0, setupPct: 90 }).status, 'amber');
  assert.equal(pulse.pulseStatus({ published7: 0, done7: 3, setupPct: 90 }).status, 'amber');
  assert.equal(pulse.pulseStatus({ published7: 2, done7: 3, setupPct: 49 }).status, 'amber');
});
test('green when both happened and setup is at least 50%', () => {
  assert.equal(pulse.pulseStatus({ published7: 1, done7: 1, setupPct: 50 }).status, 'green');
});
const COASTAL = 'fa710cf6-09fc-45ad-97da-fa50dceec37d';
const run = (overrides = {}) => ({ id: 'r1', crew_key: 'coastal_blog', status: 'ok', started_at: ago(2), finished_at: ago(1), tried: 'Write article', done: 'Published 1 new article ' + 'x'.repeat(200), flagged: '', details: { brands: [COASTAL] }, ...overrides });
test('crew feeds include only explicit brand membership, never Life Pulse or defaults', () => {
  const rows = [run(), run({ id: 'life', details: {} }), run({ id: 'empty', details: { brands: [] } })];
  const feed = pulse.crewFeedRows(rows, COASTAL, new Map([['coastal_blog', 'Coastal Beauties blog crew']]));
  assert.equal(feed.length, 1);
  assert.equal(feed[0].who, 'Coastal Beauties blog crew');
  assert.equal(feed[0].ownerKind, 'agent');
  assert.equal(feed[0].at, ago(1));
  assert.equal(feed[0].text.length, 140);
  assert.equal(pulse.crewFeedRows(rows, 'stm', new Map()).length, 0);
});
test('ok and partial crew runs in seven days count as work, failed and older do not', () => {
  const runs = [run(), run({ id: 'partial', status: 'partial', finished_at: null }), run({ status: 'failed' }), run({ finished_at: ago(8) }), run({ details: {} })];
  assert.equal(pulse.crewWorkInLast7(runs, COASTAL, NOW), 2);
  assert.equal(pulse.pulseStatus({ published7: 0, done7: pulse.crewWorkInLast7(runs, COASTAL, NOW), setupPct: 90 }).status, 'amber');
  assert.equal(pulse.pulseStatus({ published7: 1, done7: pulse.crewWorkInLast7(runs, COASTAL, NOW), setupPct: 90 }).status, 'green');
});
test('a piece counts once per week, placements preferred over published_at', () => {
  const pieces = pulse.publishedPieces(
    [{ id: 'p1', content_item_id: 'i1', live_url: 'https://x', verified_at: ago(1), updated_at: ago(1) },
     { id: 'p2', content_item_id: 'i1', live_url: 'https://y', verified_at: ago(1), updated_at: ago(1) },
     { id: 'p3', content_item_id: 'i2', live_url: null, verified_at: ago(1), updated_at: ago(1) }],
    [{ id: 'i1', title: 'One', published_at: ago(1) }, { id: 'i2', title: 'Two', published_at: ago(2) }]);
  assert.equal(pieces.length, 2);
  assert.equal(pieces.find((p) => p.key === 'item-i1').url, 'https://x');
  assert.equal(pulse.publishedInLast7(pieces, NOW), 2);
});
test('weekly target sums cadence targets and is null when none are set', () => {
  assert.equal(pulse.weeklyTarget([{ cadence_target: 3 }, { cadence_target: '2' }, { cadence_target: null }]), 5);
  assert.equal(pulse.weeklyTarget([{ cadence_target: null }]), null);
});
test('followers carry each channel forward and fall back to saved counts', () => {
  const a = pulse.audienceSeries([{ id: 'a', followers: 0 }, { id: 'b', followers: 50 }, { id: 'c', followers: 7 }],
    [{ channel_id: 'a', captured_on: '2026-11-01', followers: 100 }, { channel_id: 'b', captured_on: '2026-11-05', followers: 60 }]);
  assert.deepEqual(a.points.map((p) => p.total), [107, 167]);
  assert.equal(a.total, 167);
  assert.equal(a.change, 60);
  assert.equal(pulse.audienceSeries([{ id: 'a', followers: null }], []).total, null);
});
test('needs-attention sort puts gone quiet first, then needs attention', () => {
  const status = new Map([['a', { status: 'green' }], ['b', { status: 'red' }], ['c', { status: 'amber' }]]);
  const cards = ['a', 'b', 'c'].map((id) => ({ id, name: id, overall: null, monthRevenue: null, potential: null }));
  assert.deepEqual(cards.sort(sort.portfolioSorter('attention', null, null, null, status)).map((c) => c.id), ['b', 'c', 'a']);
});

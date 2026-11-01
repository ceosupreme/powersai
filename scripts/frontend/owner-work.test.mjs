import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/owner-work-'));
await build({ entryPoints: [join(root, 'src/lib/ownerWork.ts')], outfile: join(dir, 'w.mjs'), bundle: true, platform: 'node', format: 'esm' });
const w = await import(pathToFileURL(join(dir, 'w.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

test('Claude steps are hidden from owner lists', () => {
  assert.equal(w.isOwnerVisible({ owner_kind: 'claude', depends_on: null }, new Map()), false);
  assert.equal(w.isOwnerVisible({ owner_kind: null, depends_on: null }, new Map()), true);
});

test('a step waiting on an unfinished step is hidden; on a Done step it shows', () => {
  assert.equal(w.isOwnerVisible({ owner_kind: 'owner', depends_on: 'a' }, new Map([['a', 'Open']])), false);
  assert.equal(w.isOwnerVisible({ owner_kind: 'owner', depends_on: 'a' }, new Map([['a', 'Done']])), true);
  assert.equal(w.isOwnerVisible({ owner_kind: 'owner', depends_on: 'missing' }, new Map()), false);
});

test('channel is stale past ceil(7 / cadence) days', () => {
  const now = Date.parse('2026-11-01T00:00:00Z');
  const day = 86400000;
  // cadence 2/week -> 4 days
  assert.equal(w.isChannelStale({ cadence_target: 2, last_post_at: new Date(now - 3 * day).toISOString() }, now), false);
  assert.equal(w.isChannelStale({ cadence_target: 2, last_post_at: new Date(now - 5 * day).toISOString() }, now), true);
  assert.equal(w.isChannelStale({ cadence_target: 2, last_post_at: null }, now), true);
  assert.equal(w.isChannelStale({ cadence_target: null, last_post_at: null }, now), false);
});

test('pipeline step status words', () => {
  const m = new Map([['x', 'Open'], ['y', 'Done']]);
  assert.equal(w.deriveStepStatus({ status: 'Done', owner_kind: 'owner', depends_on: 'x', title: 'a' }, m), 'done');
  assert.equal(w.deriveStepStatus({ status: 'Open', owner_kind: 'owner', depends_on: 'x', title: 'a' }, m), 'blocked');
  assert.equal(w.deriveStepStatus({ status: 'Open', owner_kind: 'owner', depends_on: 'y', title: 'a' }, m), 'ready');
  assert.equal(w.deriveStepStatus({ status: 'Open', owner_kind: 'owner', depends_on: null, title: 'Decision: go' }, m), 'decision');
  assert.equal(w.deriveStepStatus({ status: 'Open', owner_kind: 'claude', depends_on: null, title: 'a' }, m), 'queued');
});

test('approval-ready content needs 80+, no fails, not approved', () => {
  assert.equal(w.isApprovalReady({ quality_score: 80, quality_fails: [], approved_at: null }), true);
  assert.equal(w.isApprovalReady({ quality_score: 79, quality_fails: [], approved_at: null }), false);
  assert.equal(w.isApprovalReady({ quality_score: 90, quality_fails: ['x'], approved_at: null }), false);
  assert.equal(w.isApprovalReady({ quality_score: 90, quality_fails: null, approved_at: '2026-01-01' }), false);
});

test('facts parse safely and fall back to text', () => {
  assert.deepEqual(w.parseFacts('{"checks":["a"]}').facts, { checks: ['a'] });
  assert.equal(w.parseFacts('not json').text, 'not json');
  assert.equal(w.dimensionShelf('Radar dimension — Structure: How To (PROVEN)'), 'Structure');
});

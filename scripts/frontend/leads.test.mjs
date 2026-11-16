import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(resolve('node_modules/.cache/leads-'));
await build({ entryPoints: ['src/lib/leads.ts'], outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm' });
const L = await import(pathToFileURL(join(dir, 'leads.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const lead = (o = {}) => ({ id: 'x', status: 'new', source: 'places', business_name: 'A', created_at: '2026-11-01T00:00:00Z', ...o });

test('new, checked and queued all show as New; promoted shows as Meeting booked', () => {
  for (const s of ['new', 'checked', 'queued']) assert.equal(L.stageOf(s), 'new');
  assert.equal(L.stageOf('promoted'), 'meeting');
  assert.equal(L.stageOf('replied'), 'replied');
});
test('source badges come from source plus platform', () => {
  assert.equal(L.sourceLabel('places'), 'Google');
  assert.equal(L.sourceLabel('social', 'facebook'), 'Facebook');
  assert.equal(L.sourceLabel('social', 'Instagram'), 'Instagram');
  assert.equal(L.sourceLabel('manual'), 'Manual');
});
test('list sorts by fit score, then leak, then newest', () => {
  const rows = [lead({ id: 'old', created_at: '2026-01-01T00:00:00Z' }), lead({ id: 'leak', leak_total: 500 }), lead({ id: 'fit', fit_score: 80 }), lead({ id: 'new', created_at: '2026-11-10T00:00:00Z' })];
  assert.deepEqual(L.sortLeads(rows).map((r) => r.id), ['fit', 'leak', 'new', 'old']);
});
test('Mine and Unassigned filters', () => {
  const rows = [lead({ id: 'a', assigned_to: 'me' }), lead({ id: 'b', assigned_to: 'you' }), lead({ id: 'c' })];
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, assigned: 'mine' }, 'me').map((r) => r.id), ['a']);
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, assigned: 'unassigned' }, 'me').map((r) => r.id), ['c']);
});
test('search covers name, contact, city and their words', () => {
  const rows = [lead({ id: 'w', their_words: 'Need a new website ASAP' }), lead({ id: 'c', contact_name: 'Maria' }), lead({ id: 'n' })];
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, search: 'website' }, null).map((r) => r.id), ['w']);
  assert.deepEqual(L.filterLeads(rows, { ...L.DEFAULT_FILTERS, search: 'maria' }, null).map((r) => r.id), ['c']);
});
test('logging contact moves only New leads to Contacted', () => {
  assert.equal(L.stageAfterContact('new'), 'contacted');
  assert.equal(L.stageAfterContact('checked'), 'contacted');
  assert.equal(L.stageAfterContact('replied'), null);
  assert.equal(L.stageAfterContact('promoted'), null);
});
test('follow-up is overdue only before today', () => {
  assert.equal(L.isOverdue('2026-11-15', '2026-11-16'), true);
  assert.equal(L.isOverdue('2026-11-16', '2026-11-16'), false);
});
test('CSV escapes commas, quotes and line breaks', () => {
  assert.equal(L.csvCell('a, "b"\nc'), '"a, ""b""\nc"');
});

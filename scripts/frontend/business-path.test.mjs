import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const dir = await mkdtemp(resolve('node_modules/.cache/business-path-'));
let user = { id: 'admin-user' }, isAdmin = true, writes = [], invalidations = [], response = { data: { id: 'saved' }, error: null };
globalThis.__pathAuth = () => ({ user, isAdmin });
globalThis.__pathRefresh = key => invalidations.push(key);
globalThis.__pathDb = { from: table => ({ upsert: (row, options) => {
  writes.push({ table, row, options }); return { select: () => ({ maybeSingle: async () => response }) };
} }) };
await build({ stdin: { contents: `export * from './src/lib/businessPath'; export * from './src/hooks/useBusinessPath';`, resolveDir: process.cwd(), loader: 'ts' }, outfile: join(dir, 'path.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'fixtures', setup(b) {
  b.onResolve({ filter: /^(?:@tanstack\/react-query|@\/context\/AuthContext|@\/integrations\/supabase\/client)$/ }, a => ({ path: a.path, namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ loader: 'js', contents: a.path.includes('react-query') ? `export const useQuery=o=>o;export const useMutation=o=>({mutateAsync:async v=>{const r=await o.mutationFn(v);await o.onSuccess?.(r);return r;}});export const useQueryClient=()=>({invalidateQueries:async o=>globalThis.__pathRefresh(o.queryKey)});` : a.path.includes('AuthContext') ? `export const useAuth=()=>globalThis.__pathAuth();` : `export const supabase=globalThis.__pathDb;` }));
} }] });
const app = await import(pathToFileURL(join(dir, 'path.mjs')).href);
after(async () => { await rm(dir, { recursive: true, force: true }); delete globalThis.__pathAuth; delete globalThis.__pathDb; delete globalThis.__pathRefresh; });
const stage = (key, order) => ({ key, sort_order: order, name: key, is_active: true });
const step = (key, stage_key, business_types = ['all'], sort_order = 1) => ({ key, stage_key, business_types, sort_order, is_active: true });
test('steps apply to all or overlapping business types; missing settings keeps only all', () => {
  const steps = [step('all', 'a'), step('service', 'a', ['service']), step('mixed', 'a', ['local', 'app']), step('creator', 'a', ['creator_product'])];
  assert.deepEqual(app.businessPathProgress([stage('a', 1)], steps, { business_types: ['service', 'app'] }, []).stages[0].steps.map(s => s.key), ['all', 'mixed', 'service']);
  assert.deepEqual(app.businessPathProgress([stage('a', 1)], steps, null, []).stages[0].steps.map(s => s.key), ['all']);
});
test('missing status is not_started; done and not_needed count per stage and overall', () => {
  const p = app.businessPathProgress([stage('a', 1)], [step('one', 'a'), step('two', 'a'), step('three', 'a')], null, [{ step_key: 'one', status: 'done' }, { step_key: 'two', status: 'not_needed' }]);
  assert.equal(p.done, 2); assert.equal(p.total, 3); assert.equal(p.stages[0].done, 2); assert.equal(p.stages[0].steps.find(s => s.key === 'three').status, 'not_started'); assert.equal(p.current.key, 'a');
});
test('first incomplete active stage follows stage order and step order; empty stages complete', () => {
  const p = app.businessPathProgress([stage('late', 8), { ...stage('inactive', 0), is_active: false }, stage('empty', 1), stage('early', 3)], [step('z', 'early', ['all'], 2), step('a', 'early'), { ...step('hidden', 'empty'), is_active: false }], null, []);
  assert.equal(p.current.key, 'early'); assert.equal(p.current.number, 2); assert.equal(p.stages[0].complete, true); assert.deepEqual(p.current.steps.map(s => s.key), ['a', 'z']);
});
test('all applicable steps done or not_needed leaves no current stage', () => {
  const p = app.businessPathProgress([stage('a', 1), stage('empty', 2)], [step('one', 'a')], null, [{ step_key: 'one', status: 'not_needed' }]);
  assert.equal(p.current, undefined); assert.equal(p.done, 1); assert.equal(p.total, 1); assert.ok(p.stages.every(s => s.complete));
});
test('done requires https proof before any write', async () => {
  writes = [];
  for (const evidence_url of [null, '', '   ', 'http://example.com', 'javascript:alert(1)']) await assert.rejects(app.useBusinessPath('brand-a').saveStep('one', { status: 'done', evidence_url, note: null }), /Add a proof link/);
  assert.equal(writes.length, 0);
});
test('step upsert reads back, scopes brand, attributes user and refreshes progress', async () => {
  writes = []; invalidations = []; response = { data: { id: 'saved', status: 'done' }, error: null };
  const saved = await app.useBusinessPath('brand-a').saveStep('one', { status: 'done', evidence_url: ' https://example.com/proof ', note: ' ready ' });
  assert.equal(saved.status, 'done'); assert.deepEqual(writes[0], { table: 'brand_path_step_status', row: { venue_id: 'brand-a', step_key: 'one', status: 'done', evidence_url: 'https://example.com/proof', note: 'ready', updated_by: 'admin-user' }, options: { onConflict: 'venue_id,step_key' } });
  assert.deepEqual(invalidations, [['business-path', 'admin-user', 'brand-a']]);
});
test('no returned row or database error never reports success', async () => {
  invalidations = []; response = { data: null, error: null };
  await assert.rejects(app.useBusinessPath('brand-a').saveStep('one', { status: 'waiting', note: null, evidence_url: null }), /No saved row/);
  response = { data: null, error: { message: 'Access denied' } };
  await assert.rejects(app.useBusinessPath('brand-a').saveStep('one', { status: 'waiting', note: null, evidence_url: null }), /Access denied/);
  assert.equal(invalidations.length, 0); response = { data: { id: 'saved' }, error: null };
});
test('managers can save progress but not settings; signed-out users cannot save', async () => {
  isAdmin = false; user = { id: 'manager-user' }; writes = [];
  await app.useBusinessPath('own-brand').saveStep('one', { status: 'in_progress', note: 'working', evidence_url: null });
  assert.equal(writes[0].row.updated_by, 'manager-user');
  await assert.rejects(app.useBusinessPath('own-brand').saveSettings({ business_types: ['local'] }), /Only admins/); assert.equal(writes.length, 1);
  user = null; await assert.rejects(app.useBusinessPath('own-brand').saveStep('one', { status: 'waiting', note: null, evidence_url: null }), /Sign in/);
  isAdmin = true; user = { id: 'admin-user' };
});
test('admins save all settings with user attribution and returned row', async () => {
  writes = []; const draft = { business_types: ['service', 'local'], visible_to_managers: true, money_goal: '$10k', hours_per_week: 12.5 };
  await app.useBusinessPath('brand-a').saveSettings(draft);
  assert.deepEqual(writes[0], { table: 'brand_path_settings', row: { ...draft, venue_id: 'brand-a', updated_by: 'admin-user' }, options: { onConflict: 'venue_id' } });
});
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const dir = await mkdtemp(resolve('node_modules/.cache/menu-access-'));
await build({ stdin: { contents: `export * from './src/lib/pageAccess'; export { OWNER_NAV_GROUPS } from './src/config/ownerNav';`, resolveDir: process.cwd(), loader: 'ts' }, outfile: join(dir, 'm.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', alias: { '@': resolve('src') } });
const m = await import(pathToFileURL(join(dir, 'm.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const known = ['dashboard', 'crm', 'tasks', 'chat'];
test('override false hides a role page; override true shows a page the role lacks', () => {
  assert.deepEqual(m.applyUserOverrides(['dashboard', 'crm'], [{ page_key: 'crm', enabled: false }, { page_key: 'tasks', enabled: true }], known), ['dashboard', 'tasks']);
});
test('no overrides keeps role defaults; unknown keys ignored', () => {
  assert.deepEqual(m.applyUserOverrides(['dashboard', 'crm'], [{ page_key: 'nope', enabled: true }], known), ['dashboard', 'crm']);
});
test('save plan writes only differences and deletes matches', () => {
  const plan = m.overridePlan({ dashboard: true, crm: false, tasks: true, chat: false }, new Set(['dashboard', 'crm']));
  assert.deepEqual(plan.upsert, [{ page_key: 'crm', enabled: false }, { page_key: 'tasks', enabled: true }]);
  assert.deepEqual(plan.remove, ['dashboard', 'chat']);
});
test('menu rows merge shared page keys, keep admin-only rows separate, dashboard always on', () => {
  const groups = m.menuSwitchGroups(m.OWNER_NAV_GROUPS);
  const rows = groups.flatMap(g => g.rows);
  const dash = rows.find(r => r.pageKey === 'dashboard' && !r.adminOnly);
  assert.deepEqual(dash.labels, ['Dashboard', 'Portfolio', 'Guide', 'Launch Checklist']);
  assert.equal(dash.alwaysOn, true);
  assert.deepEqual(rows.find(r => r.pageKey === 'content_pipeline' && !r.adminOnly).labels, ['Content', 'Radar']);
  assert.deepEqual(rows.filter(r => r.adminOnly).map(r => r.labels[0]), ['Playbooks', 'Production Board', 'Answer Bank', 'Admin Panel']);
  assert.deepEqual(groups.map(g => g.label), m.OWNER_NAV_GROUPS.map(g => g.label));
});

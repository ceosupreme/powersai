import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(resolve('node_modules/.cache/brand-team-'));
await build({ entryPoints: ['src/lib/brandTeam.ts'], outfile: join(dir, 'team.mjs'), bundle: true, platform: 'node', format: 'esm' });
const team = await import(pathToFileURL(join(dir, 'team.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));
const viewer = { id: 'helper', name: 'Brand Helper' };
const step = (extra = {}) => ({ id: 'one', title: 'First step', status: 'Open', approval_status: 'Approved', owner_kind: 'owner', assignee: 'Brand Helper', assignee_id: 'helper', depends_on: null, job_id: 'plan', step_order: 1, due_date: '2026-11-13', ...extra });
test('assignment uses id first and name only when id is null', () => {
  assert.equal(team.assignedTo(step(), viewer), true);
  assert.equal(team.assignedTo(step({ assignee_id: 'someone-else' }), viewer), false);
  assert.equal(team.assignedTo(step({ assignee_id: null, assignee: ' brand helper ' }), viewer), true);
});
test('owner labels follow viewer then Claude, agent, name and unassigned', () => {
  assert.equal(team.ownerLabel(step(), viewer), 'You');
  assert.equal(team.ownerLabel(step({ assignee_id: null, assignee: null, owner_kind: 'claude' }), viewer), 'Claude');
  assert.equal(team.ownerLabel(step({ assignee_id: null, assignee: 'Bot', owner_kind: 'agent' }), viewer), 'AI agent');
  assert.equal(team.ownerLabel(step({ assignee_id: 'other', assignee: 'Sean' }), viewer), 'Sean');
  assert.equal(team.ownerLabel(step({ assignee_id: null, assignee: ' ' }), viewer), 'Not assigned');
});
test('ready counts require open, approved, completed dependency and active plan', () => {
  const by = new Map([['prior', step({ id: 'prior', status: 'Done' })]]);
  assert.equal(team.readyFor(step({ depends_on: 'prior' }), viewer, by, new Set()), true);
  for (const change of [{ status: 'Done' }, { approval_status: 'Proposed' }, { depends_on: 'missing' }, { assignee_id: 'other' }]) assert.equal(team.readyFor(step(change), viewer, by, new Set()), false);
  assert.equal(team.readyFor(step(), viewer, by, new Set(['plan'])), false);
});
test('whole plan state follows done, dependency, proposed or empty, then ready', () => {
  const by = new Map();
  assert.equal(team.teamStepState(step({ status: 'Done', depends_on: 'missing' }), by), 'Done');
  assert.equal(team.teamStepState(step({ depends_on: 'missing' }), by), 'Waiting on an earlier step');
  for (const approval_status of ['Proposed', null, '']) assert.equal(team.teamStepState(step({ approval_status }), by), 'Waiting for approval');
  assert.equal(team.teamStepState(step({ approval_status: 'Auto' }), by), 'Ready');
});
test('plan context counts and orders all steps of that plan', () => {
  assert.deepEqual(team.planPosition(step({ id: 'second', step_order: 8 }), [step({ id: 'second', step_order: 8 }), step(), step({ id: 'other-plan', job_id: 'other' })]), { position: 2, count: 2 });
});
test('Pacific week includes Monday through Sunday, not the following UTC Monday', () => {
  const now = new Date('2026-11-16T07:30:00Z');
  assert.deepEqual(team.pacificWeek(now), { start: '2026-11-09', end: '2026-11-15' });
  assert.deepEqual(team.weeklyCompletion([step({ due_date: '2026-11-09', status: 'Done' }), step({ due_date: '2026-11-15' }), step({ due_date: '2026-11-16' }), step({ assignee_id: 'other' })], viewer, now), { done: 1, total: 2 });
});
test('preview defaults to most open non-admin and preserves a valid explicit choice', () => {
  const rows = [step(), step({ id: 'two', assignee_id: 'admin', assignee: 'Owner' }), step({ id: 'three', assignee_id: 'admin', assignee: 'Owner' }), step({ id: 'four', owner_kind: 'claude', assignee: 'Claude', assignee_id: null })];
  assert.equal(team.defaultTeamViewer(rows, { id: 'admin', name: 'Owner' }, null).key, 'helper');
  assert.equal(team.defaultTeamViewer(rows, { id: 'admin', name: 'Owner' }, 'admin').key, 'admin');
  assert.equal(team.teamPeople(rows).length, 2);
});
test('questions show rejected as closed before done as answered', () => {
  assert.equal(team.questionStatus(step()), 'Waiting on Allmighty');
  assert.equal(team.questionStatus(step({ status: 'Done' })), 'Answered');
  assert.equal(team.questionStatus(step({ status: 'Done', approval_status: 'Rejected' })), 'Closed');
});
test('step titles drop a leading owner name only when it names the step owner', () => {
  assert.equal(team.displayTitle(step({ title: 'Brand Helper: check your offers', assignee: 'Brand Helper' })), 'Check your offers');
  assert.equal(team.displayTitle(step({ title: 'BRAND HELPER:   read the guide (10 minutes)', assignee: ' brand helper ' })), 'Read the guide (10 minutes)');
  assert.equal(team.displayTitle(step({ title: 'Claude: draft the first week of posts', assignee: null, owner_kind: 'claude' })), 'Draft the first week of posts');
  assert.equal(team.displayTitle(step({ title: 'Decision: pick the launch offer', assignee: 'Brand Helper' })), 'Decision: pick the launch offer');
  assert.equal(team.displayTitle(step({ title: 'Sean: send the folder', assignee: 'Brand Helper' })), 'Sean: send the folder');
  assert.equal(team.displayTitle(step({ title: 'Brand Helper:', assignee: 'Brand Helper' })), 'Brand Helper:');
  assert.equal(team.displayTitle(step({ title: 'Plain title', assignee: null, owner_kind: null })), 'Plain title');
});
test('minutes read naturally for one and for many', () => {
  assert.equal(team.minutesText(1), 'About 1 minute');
  assert.equal(team.minutesText(10), 'About 10 minutes');
});
test('next step is the earliest due, then the highest priority, then plan order', () => {
  const rows = [
    step({ id: 'late', due_date: '2027-01-05', step_order: 1 }),
    step({ id: 'soon-p2', due_date: '2026-11-04', priority: 'P2', step_order: 1 }),
    step({ id: 'soon-p1-later', due_date: '2026-11-04', priority: 'P1', step_order: 9 }),
    step({ id: 'soon-p1', due_date: '2026-11-04', priority: 'P1', step_order: 3 }),
    step({ id: 'undated', due_date: null, step_order: 0 }),
  ];
  assert.equal(team.firstDue(rows).id, 'soon-p1');
  assert.equal(team.firstDue([rows[0], rows[4]]).id, 'late');
  assert.equal(team.firstDue([]), undefined);
  assert.deepEqual(rows.map(r => r.id), ['late', 'soon-p2', 'soon-p1-later', 'soon-p1', 'undated']);
});

test('managed brands include all four own-brand types, exclude prospect shells and retain owner memberships', async () => {
  const calls = [];
  const rows = ['internal_brand', 'content_channel', 'app_build', 'service_offer'].map((project_type, i) => ({ id: String(i), name: project_type, project_type, is_prospect_shell: false }));
  globalThis.__teamProjectDb = { from(table) {
    const q = { select: value => { calls.push([table, 'select', value]); return q; }, eq: (key, value) => { calls.push([table, 'eq', key, value]); return q; },
      in: (key, value) => { calls.push([table, 'in', key, value]); return q; }, order: () => q,
      then: (resolve) => resolve({ data: table === 'venue_assignments' ? [...rows.map(r => ({ venue_id: r.id, role_at_venue: 'owner' })), { venue_id: 'not-owner', role_at_venue: 'gm' }] : [...rows, { id: 'shell', project_type: 'internal_brand', is_prospect_shell: true }], error: null }) };
    return q;
  } };
  await build({ entryPoints: ['src/hooks/useBrandManagerProjects.ts'], outfile: join(dir, 'projects.mjs'), bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'read-only-fixtures', setup(b) {
    b.onResolve({ filter: /^(?:@tanstack\/react-query|@\/context\/AuthContext|@\/integrations\/supabase\/client|@\/hooks\/usePortfolioData)$/ }, a => ({ path: a.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ loader: 'js', contents: a.path.includes('react-query') ? 'export const useQuery=o=>o;' : a.path.includes('AuthContext') ? "export const useAuth=()=>({user:{id:'helper'},role:'owner',isAdmin:false});" : a.path.includes('usePortfolioData') ? "export const MY_BRAND_TYPES=['internal_brand','content_channel','app_build','service_offer'];" : 'export const supabase=globalThis.__teamProjectDb;' }));
  } }] });
  const hooks = await import(pathToFileURL(join(dir, 'projects.mjs')).href);
  assert.deepEqual((await hooks.useBrandManagerProjects().queryFn()).map(r => r.project_type), ['internal_brand', 'content_channel', 'app_build', 'service_offer']);
  assert.deepEqual(calls.find(c => c[0] === 'venues' && c[1] === 'in' && c[2] === 'id')[3], ['0', '1', '2', '3']);
  assert.deepEqual(calls.find(c => c[0] === 'venues' && c[1] === 'in' && c[2] === 'project_type')[3], ['internal_brand', 'content_channel', 'app_build', 'service_offer']);
  delete globalThis.__teamProjectDb;
});
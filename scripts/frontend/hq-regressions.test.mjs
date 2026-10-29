import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { QueryClient } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Exercise production helpers and source aggregation with fixture-only Supabase
// responses. No database, credentials, network or extra test dependency is used.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let fixtures = {};
const requests = [];
globalThis.__hqRegressionSupabase = {
  from(table) {
    const operations = [];
    let query;
    query = new Proxy({}, {
      get(_target, method) {
        if (method === 'then') return (onSuccess, onFailure) => {
          requests.push({ table, operations });
          const value = fixtures[table] ?? { data: [], error: null };
          return (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)).then(onSuccess, onFailure);
        };
        return (...args) => { operations.push([method, ...args]); return query; };
      },
    });
    return query;
  },
  auth: { getUser: async () => ({ data: { user: { id: 'test-owner' } } }) },
};
const cacheRoot = join(root, 'node_modules/.cache');
await mkdir(cacheRoot, { recursive: true });
const temporary = await mkdtemp(join(cacheRoot, 'hq-frontend-'));
const output = join(temporary, 'production-helpers.mjs');
await build({
  stdin: {
    contents: `
      export { resolvePageAccess } from './src/lib/pageAccess';
      export { PAGE_CONFIG, pageKeyForPath } from './src/types/permissions';
      export { deriveScoreCoverage } from './src/lib/scoreCoverage';
      export { ScoreDataStatus } from './src/components/pillar/ScoreDataStatus';
      export { selectScoreReportingWeek, priorScoreWeek, fetchScoreReportingWeek } from './src/lib/scoreReportingWeek';
      export { weightedPillarOverall } from './src/hooks/usePortfolioData';
      export { invalidateTaskQueries } from './src/hooks/useTasks';
      export { queryClient } from './src/lib/queryClient';
      export { needsDecision, isSnoozed, priorityRank, rankScore, compareRows,
        nextProductStage, fetchNextTenForProject, nextTenEmptyMessage, mergeNextTenResults } from './src/hooks/useNextTen';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  tsconfig: join(root, 'tsconfig.app.json'),
  plugins: [{
    name: 'fixture-supabase',
    setup(builder) {
      builder.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'fixture', namespace: 'hq' }));
      builder.onLoad({ filter: /.*/, namespace: 'hq' }, () => ({
        contents: 'export const supabase = globalThis.__hqRegressionSupabase;', loader: 'js',
      }));
    },
  }],
});
const app = await import(pathToFileURL(output).href);
after(async () => { app.queryClient.clear(); delete globalThis.__hqRegressionSupabase; await rm(temporary, { recursive: true, force: true }); });
beforeEach(() => { fixtures = { venues: { data: { project_type: null }, error: null } }; requests.length = 0; });

test('non-admin missing, empty and failed permission reads deny access', () => {
  const known = ['dashboard', 'client_approvals'];
  assert.deepEqual(app.resolvePageAccess(null, [], known), []);
  assert.deepEqual(app.resolvePageAccess('owner', [], known), []);
  assert.deepEqual(app.resolvePageAccess('client', null, known), []);
  assert.deepEqual(app.resolvePageAccess('owner', [{ page_key: 'dashboard', enabled: true }], known, true), []);
});

test('verified admins have all known pages; clients receive only explicitly enabled known pages', () => {
  const known = app.PAGE_CONFIG.map(page => page.key);
  assert.deepEqual(app.resolvePageAccess('admin', [], known), known);
  const pages = app.resolvePageAccess('client', [
    { page_key: 'client_approvals', enabled: true },
    { page_key: 'dashboard', enabled: false },
    { page_key: 'unknown', enabled: true },
  ], known);
  assert.deepEqual(pages, ['client_approvals']);
  assert.equal(pages.includes(app.pageKeyForPath('/workspace')), false);
  assert.equal(pages.includes(app.pageKeyForPath('/portfolio')), false);
  assert.equal(pages.includes(app.pageKeyForPath('/automations/inbox')), false);
  assert.equal(pages.includes(app.pageKeyForPath('/approvals')), true);
});

test('dynamic pages use longest route boundary matching', () => {
  assert.equal(app.pageKeyForPath('/project/brand-id'), 'project_home');
  assert.equal(app.pageKeyForPath('/logs/record/edit'), 'logs');
  assert.equal(app.pageKeyForPath('/staff/tasks'), 'tasks');
  assert.equal(app.pageKeyForPath('/tasks-unrelated'), undefined);
});

test('clearing the session cache cancels an old request and removes queries and mutations', async () => {
  const qc = app.queryClient;
  qc.setQueryData(['private-owner-data'], { owner: 'old-user' });
  qc.getMutationCache().build(qc, { mutationKey: ['old-private-write'] });
  let finish;
  const pending = qc.fetchQuery({ queryKey: ['old-pending'], queryFn: () => new Promise(resolve => { finish = resolve; }) }).catch(error => error);
  qc.clear();
  finish({ owner: 'old-user' });
  await pending;
  assert.equal(qc.getQueryCache().getAll().length, 0);
  assert.equal(qc.getMutationCache().getAll().length, 0);
});

test('task changes invalidate personal lists, counts, badges, details and activity together', () => {
  const qc = new QueryClient();
  const keys = [['tasks'], ['my-tasks', 'person'], ['task-counts', 'person'], ['task-badge-count', 'person'], ['task', 'id'], ['task-activity', 'id']];
  keys.forEach(key => qc.setQueryData(key, []));
  qc.setQueryData(['unrelated'], []);
  app.invalidateTaskQueries(qc, 'id');
  keys.forEach(key => assert.equal(qc.getQueryState(key).isInvalidated, true));
  assert.equal(qc.getQueryState(['unrelated']).isInvalidated, false);
  qc.clear();
});

test('priority accepts stored HQ labels and legacy labels, unknown labels come last', () => {
  for (const [label, rank] of [['P1-Critical', 1], ['P2-High', 2], ['P3-Medium', 3], ['P4-Low', 4], ['Critical', 1], ['high', 2], ['normal', 3], ['low', 4], [null, 5], ['unknown', 5]]) {
    assert.equal(app.priorityRank(label), rank);
  }
});

test('Pending and empty approval states need decisions; approved and rejected do not', () => {
  for (const state of ['Pending', 'Proposed', 'Unreviewed', null, undefined]) assert.equal(app.needsDecision(state), true);
  for (const state of ['Approved', 'Rejected']) assert.equal(app.needsDecision(state), false);
});

test('snooze expires at its boundary and malformed values do not hide work', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  assert.equal(app.isSnoozed('2026-10-29T12:00:01Z', now), true);
  assert.equal(app.isSnoozed('2026-10-29T12:00:00Z', now), false);
  assert.equal(app.isSnoozed('not-a-date', now), false);
});

test('one ranking lets a valuable lane outrank low-priority actions but preserves urgent work', () => {
  const action = { source: 'Action', priorityRank: 4, approvalRank: 1 };
  const lane = { source: 'Lane', laneValue: 47 };
  const urgent = { source: 'Action', priorityRank: 1, approvalRank: 1 };
  assert.ok(app.rankScore(lane) > app.rankScore(action));
  assert.ok(app.rankScore(urgent) > app.rankScore(lane));
  assert.equal(app.rankScore({ source: 'Lane', laneValue: 1e6 }), 95);
});

test('a due-today action stays due today through the end of the local calendar day', () => {
  const now = new Date(2026, 9, 29, 23, 59).getTime();
  const dueToday = app.rankScore({ source: 'Action', priorityRank: 2, approvalRank: 1, dueDate: '2026-10-29' }, now);
  const overdue = app.rankScore({ source: 'Action', priorityRank: 2, approvalRank: 1, dueDate: '2026-10-28' }, now);
  assert.equal(dueToday, 78);
  assert.equal(overdue, 85);
});

test('completed, rejected and snoozed items stay out while Pending and null-status work remain visible', async () => {
  const open = { title: 'Open', priority: 'P1-Critical', approval_status: 'Pending', status: 'Todo' };
  fixtures.action_items = { data: [
    { ...open, id: 'pending' }, { ...open, id: 'null-status', status: null },
    { ...open, id: 'done', status: 'Done', approval_status: 'Proposed' },
    { ...open, id: 'rejected', approval_status: 'Rejected' },
    { ...open, id: 'sleeping', snoozed_until: new Date(Date.now() + 86_400_000).toISOString() },
    { ...open, id: 'pending' },
  ], error: null };
  const result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.deepEqual(result.rows.map(row => row.refId).sort(), ['null-status', 'pending']);
  assert.equal(result.checkedSources, 4);
});

test('automatic KPI sources never produce manual entry prompts', async () => {
  fixtures.project_kpis = { data: [
    { pillar_key: 'reach', kpi_key: 'auto-posts', kpi_label: 'Published posts', target: 5, source: 'auto' },
    { pillar_key: 'reach', kpi_key: 'manual-ideas', kpi_label: 'Ideas', target: 5, source: 'manual' },
  ], error: null };
  const result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.deepEqual(result.rows.map(row => row.refId), ['manual-ideas']);
});

test('nested lane failures yield a partial result instead of a false healthy zero', async () => {
  fixtures.venues = { data: { project_type: 'internal_brand' }, error: null };
  fixtures.foundation_item_templates = { data: null, error: { message: 'fixture outage' } };
  const result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.deepEqual(result.unavailable, ['money lanes']);
  assert.equal(result.checkedSources, 3);
  assert.match(app.nextTenEmptyMessage(result), /Other sources are unavailable/);
});

test('a rejected action request preserves other sources and full outages remain distinct', async () => {
  fixtures.action_items = new Error('fixture network failure');
  let result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.equal(result.checkedSources, 3);
  fixtures.venues = fixtures.channel_product_channels = fixtures.project_kpis = { data: null, error: { message: 'unavailable' } };
  result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.equal(result.checkedSources, 0);
  assert.match(app.nextTenEmptyMessage(result), /No sources could be checked/);
});

test('a successful empty result can report a healthy zero', async () => {
  const result = await app.fetchNextTenForProject('brand', 'Brand', '2026-10-26');
  assert.equal(result.checkedSources, 4);
  assert.deepEqual(result.unavailable, []);
  assert.match(app.nextTenEmptyMessage(result), /^Nothing outstanding/);
});

test('cross-project ranking deduplicates shared products before taking the top ten', () => {
  const shared = { key: 'product-shared', source: 'Product', rank: 65, projectId: 'brand-a' };
  const result = app.mergeNextTenResults([
    { rows: [shared], unavailable: ['KPIs'], checkedSources: 3 },
    { rows: [{ ...shared, projectId: 'brand-b' }, { key: 'lane-b', source: 'Lane', rank: 80 }], unavailable: [], checkedSources: 4 },
  ]);
  assert.deepEqual(result.rows.map(row => row.key), ['lane-b', 'product-shared']);
  assert.equal(result.checkedSources, 7);
  assert.deepEqual(result.unavailable, ['KPIs']);
});

test('product advancement stops after twin listed and does not revive cut products', () => {
  assert.equal(app.nextProductStage('ready to upload'), 'live');
  assert.equal(app.nextProductStage('twin listed'), null);
  assert.equal(app.nextProductStage('cut'), null);
});

test('mixed zero weights cannot inflate portfolio scores; all zero weights average observed scores', () => {
  assert.equal(app.weightedPillarOverall([{ weight: 0, score: 100 }, { weight: 2, score: 100 }]), 100);
  assert.equal(app.weightedPillarOverall([{ weight: 0, score: 0 }, { weight: 0, score: 100 }]), 50);
  assert.equal(app.weightedPillarOverall([{ weight: 2, score: null }]), null);
});

test('coverage counts observed zero, excludes missing values and reports missing targets and age', () => {
  const coverage = app.deriveScoreCoverage([
    { pillar_key: 'reach', kpi_key: 'zero', target: 10 },
    { pillar_key: 'reach', kpi_key: 'no-target', target: null },
    { pillar_key: 'reach', kpi_key: 'missing', target: 10 },
    { pillar_key: 'retired', kpi_key: 'ignored', target: 10 },
  ], [
    { pillar_key: 'reach', kpi_key: 'zero', actual: 0, updated_at: '2026-10-25T12:00:00Z' },
    { pillar_key: 'reach', kpi_key: 'no-target', actual: 5, updated_at: '2026-10-24T12:00:00Z' },
    { pillar_key: 'reach', kpi_key: 'missing', actual: null },
  ], [{ pillar_key: 'reach' }], [], false, '2026-10-19');
  assert.equal(coverage.measured, 2);
  assert.equal(coverage.total, 3);
  assert.equal(coverage.scored, 1);
  assert.equal(coverage.asOf, '2026-10-24T12:00:00Z');
  assert.equal(coverage.latestUpdate, '2026-10-25T12:00:00Z');
  assert.equal(coverage.weekStart, '2026-10-19');
});

test('manual-only pillars get honest coverage and unknown timestamps stay visible', () => {
  const coverage = app.deriveScoreCoverage([], [], [{ pillar_key: 'manual' }, { pillar_key: 'empty' }], [{ pillar_key: 'manual', score: 0 }]);
  assert.equal(coverage.measured, 1);
  assert.equal(coverage.total, 2);
  assert.equal(coverage.unit, 'pillars');
  assert.equal(coverage.missingTimestamps, 1);
  assert.equal(coverage.asOf, null);
});

test('fresh imports retain the observation/window age and identify snapshots separately', () => {
  const definitions = ['flow', 'snapshot'].map(kpi_key => ({ pillar_key: 'reach', kpi_key, target: 10 }));
  const coverage = app.deriveScoreCoverage(definitions, [
    { pillar_key: 'reach', kpi_key: 'flow', actual: 2, measurement_kind: 'flow', observed_at: '2026-10-29T12:00:00Z', window_end: '2026-10-26T07:00:00Z', updated_at: '2026-10-30T12:00:00Z' },
    { pillar_key: 'reach', kpi_key: 'snapshot', actual: 3, measurement_kind: 'snapshot', observed_at: '2026-10-29T10:00:00Z', updated_at: '2026-10-30T12:00:00Z' },
  ], [{ pillar_key: 'reach' }], []);
  assert.equal(coverage.asOf, '2026-10-26T07:00:00Z');
  assert.equal(coverage.latestUpdate, '2026-10-29T10:00:00Z');
  assert.equal(coverage.snapshots, 1);
  assert.equal(coverage.flows, 1);
});

test('score status renders the reporting week and flags inputs eight days old as stale', () => {
  const coverage = { measured: 2, total: 3, scored: 1, unit: 'KPIs', asOf: new Date(Date.now() - 8 * 86_400_000).toISOString(), latestUpdate: null, missingTimestamps: 1, weekStart: '2026-10-19', unavailable: false };
  const html = renderToStaticMarkup(createElement(app.ScoreDataStatus, { coverage }));
  assert.match(html, /2 of 3 KPIs measured/);
  assert.match(html, /week of/);
  assert.match(html, /stale/);
  assert.match(html, /1 measured without a target/);
  assert.match(html, /1 measured with unknown data age/);
  const failed = renderToStaticMarkup(createElement(app.ScoreDataStatus, { coverage: { ...coverage, unavailable: true } }));
  assert.match(failed, /Data coverage unavailable/);
  assert.doesNotMatch(failed, /2 of 3/);
});

test('latest completed reporting week survives Monday without copying into the new week', () => {
  assert.equal(app.selectScoreReportingWeek('2026-10-26', ['2026-10-19', '2026-10-12', '2026-10-26']), '2026-10-19');
  assert.equal(app.selectScoreReportingWeek('2026-10-26', []), '2026-10-26');
  assert.equal(app.selectScoreReportingWeek('2026-10-26', ['2099-01-05', null]), '2026-10-26');
  assert.equal(app.priorScoreWeek('2026-01-05'), '2025-12-29');
});

test('reporting week lookup uses real dated observations and propagates unavailable data', async () => {
  fixtures.project_kpi_values = { data: [{ week_start: '2026-10-19' }], error: null };
  fixtures.project_pillar_scores = { data: [{ week_start: '2026-10-12' }], error: null };
  assert.equal(await app.fetchScoreReportingWeek('brand', '2026-10-26'), '2026-10-19');
  assert.ok(requests.every(request => request.operations.some(([name, column, value]) => name === 'lt' && column === 'week_start' && value === '2026-10-26')));
  fixtures.project_kpi_values = { data: null, error: new Error('KPI history unavailable') };
  await assert.rejects(() => app.fetchScoreReportingWeek('brand', '2026-10-26'), /KPI history unavailable/);
});

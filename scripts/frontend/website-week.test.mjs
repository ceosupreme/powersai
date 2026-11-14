import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

await mkdir(resolve('node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(resolve('node_modules/.cache/website-week-'));
await build({ entryPoints: ['src/lib/websiteWeek.ts'], outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm' });
const w = await import(pathToFileURL(join(dir, 'websiteWeek.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

const counts = { pageViews: 1234, ctaClicks: 1, callRequests: 0 };

test('inquiries group by industry page, missing industry counts as other, rate covers email leads only', () => {
  const week = w.summarizeWebsiteWeek(counts, [
    { email: 'a@x.com', first_response_at: '2026-11-12T10:00:00Z', qualifier_data: { source_vertical: 'med-spa' } },
    { email: 'b@x.com', first_response_at: null, qualifier_data: { source_vertical: 'med-spa' } },
    { email: null, first_response_at: null, qualifier_data: null },
    { email: 'c@x.com', first_response_at: '2026-11-12T11:00:00Z', qualifier_data: { source_vertical: '' } },
  ], [{ amount_cents: 150000 }, { amount_cents: null }]);
  assert.deepEqual(week.inquiries, { 'med-spa': 2, other: 2 });
  assert.equal(week.inquiryCount, 4);
  assert.equal(week.firstResponseRate, 67);
  assert.equal(week.ordersCount, 2);
  assert.equal(week.ordersTotal, 150000);
});

test('summary line uses plain counts with singulars and says when there was nothing to answer', () => {
  const week = w.summarizeWebsiteWeek(counts, [], []);
  assert.equal(week.firstResponseRate, null);
  assert.deepEqual(w.websiteWeekParts(week), ['1,234 page views', '1 CTA click', '0 call requests', '0 inquiries', 'no email inquiries to answer']);
  assert.equal(w.websiteOrdersLine(week), 'Orders, last 30 days: 0 · $0');
});

test('industry rows put the busiest first and read as words', () => {
  const week = w.summarizeWebsiteWeek(counts, [
    { email: null, first_response_at: null, qualifier_data: { source_vertical: 'auto-repair' } },
    { email: null, first_response_at: null, qualifier_data: { source_vertical: 'med-spa' } },
    { email: null, first_response_at: null, qualifier_data: { source_vertical: 'med-spa' } },
  ], []);
  assert.deepEqual(w.websiteInquiryRows(week), [{ label: 'med spa', count: 2 }, { label: 'auto repair', count: 1 }]);
  assert.equal(w.websiteOrdersLine(w.summarizeWebsiteWeek(counts, [], [{ amount_cents: 123456 }])), 'Orders, last 30 days: 1 · $1,235');
});

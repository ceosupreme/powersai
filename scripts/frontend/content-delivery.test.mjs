import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/delivery-'));
await build({
  entryPoints: [join(root, 'src/lib/contentReadiness.ts'), join(root, 'src/lib/contentPackageImport.ts')],
  outdir: dir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm',
  tsconfig: join(root, 'tsconfig.app.json'),
});
const readiness = await import(pathToFileURL(join(dir, 'contentReadiness.mjs')).href);
const packages = await import(pathToFileURL(join(dir, 'contentPackageImport.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

// Exercise the real import orchestration, including its selected fields, match scope and writes.
function database(seed = {}, failure = null) {
  const tables = structuredClone(seed);
  const writes = [];
  let sequence = 0;
  const from = table => {
    tables[table] ??= [];
    let operation = 'select';
    let payload;
    let fields = '*';
    let limit = Infinity;
    let single = false;
    const filters = [];
    const query = {
      select(value = '*') { fields = value; return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      is(key, value) { filters.push(row => (row[key] ?? null) === value); return query; },
      limit(value) { limit = value; return query; },
      maybeSingle() { single = true; return query; },
      single() { single = true; return query; },
      insert(value) { operation = 'insert'; payload = value; return query; },
      update(value) { operation = 'update'; payload = value; return query; },
      then(resolve, reject) {
        const run = async () => {
          if (failure?.({ table, operation, filters, payload })) return { data: null, error: { message: 'Injected database error' } };
          let rows;
          if (operation === 'insert') {
            const row = { id: `row-${++sequence}`, archived: false, updated_at: `revision-${sequence}`, ...structuredClone(payload) };
            tables[table].push(row);
            writes.push({ table, operation, payload: structuredClone(payload) });
            rows = [row];
          } else {
            rows = tables[table].filter(row => filters.every(filter => filter(row))).slice(0, limit);
            if (operation === 'update') {
              for (const row of rows) Object.assign(row, structuredClone(payload), { updated_at: `revision-${++sequence}` });
              if (rows.length) writes.push({ table, operation, payload: structuredClone(payload) });
            }
          }
          if (single && rows.length > 1) return { data: null, error: { message: 'More than one matching record' } };
          const projected = rows.map(row => fields === '*' ? structuredClone(row)
            : Object.fromEntries(fields.split(',').map(key => [key, structuredClone(row[key])])));
          return { data: single ? projected[0] ?? null : projected, error: null };
        };
        return run().then(resolve, reject);
      },
    };
    return query;
  };
  return { tables, writes, from };
}

const runImport = (manifest, db, projectId = 'brand-1') => packages.importContentPackage(manifest, {
  projectId, userId: 'owner-1', from: db.from,
});
const manifestFor = posts => ({ source: { title: 'City research', url: 'https://example.org/research' }, package_name: 'City series', posts });
const completed = [
  { title: 'Graphic', format: 'post', stage: 'design', cta: 'Save this route', channel: 'instagram', brief: { asset_urls: ['https://example.org/final.png'] } },
  { title: 'Article', format: 'article', stage: 'script', body: 'A complete researched article.', channel: 'blog' },
  { title: 'Video', format: 'short', stage: 'thumbnail', hook: 'The city changes after sunset', script: 'Full narration and shot directions.', caption: 'A complete caption.', cta: 'Follow the series', channel: 'youtube', brief: { asset_urls: ['https://example.org/final.mp4'] } },
];

test('pipeline target query carries enough data to approve finished graphics, text and video without a score veto', async () => {
  const page = await readFile(join(root, 'src/pages/PipelineJob.tsx'), 'utf8');
  const select = page.match(/T\('content_items'\)\.select\('([^']+)'\)/)?.[1].split(',');
  assert.ok(select, 'the pipeline must query its linked content item');
  for (const field of ['format', 'stage', 'brief', 'cta', 'purpose_type']) assert.ok(select.includes(field), `missing readiness field ${field}`);
  for (const input of completed) {
    const item = packages.parseContentPackage(manifestFor([input])).posts[0].item;
    const row = { ...item, quality_score: 5, quality_fails: ['Owner should review the pacing'] };
    const selected = Object.fromEntries(select.map(key => [key, row[key]]));
    assert.deepEqual(readiness.contentDeliveryGaps(selected), [], input.format);
    assert.equal(readiness.canApproveFinishedContent(selected), true, input.format);
  }
});

test('real import populates deliverable fields for every production route and leaves every placement as a draft', async () => {
  const db = database();
  const input = manifestFor(completed.map(post => ({ ...post, approved_at: '2026-11-19', quality_score: 99 })));
  await runImport(input, db);
  assert.equal(db.tables.content_items.length, 3);
  for (const item of db.tables.content_items) {
    assert.equal(readiness.canApproveFinishedContent(item), true, item.title);
    assert.equal(item.approved_at, undefined);
    assert.equal(item.approved_by, undefined);
    assert.equal(item.quality_score, undefined);
  }
  const video = db.tables.content_items.find(item => item.title === 'Video');
  assert.equal(video.hook, completed[2].hook);
  assert.equal(video.brief.script, completed[2].script);
  assert.equal(video.brief.caption, completed[2].caption);
  assert.deepEqual(video.brief.asset_urls, completed[2].brief.asset_urls);
  assert.ok(db.tables.content_placements.every(row => row.status === 'draft'));
  assert.equal(db.tables.brand_kits, undefined, 'text/link packages do not need an empty asset kit');
});

test('repeat import repairs legacy draft fields while preserving owner edits, stage, nested metadata and unrelated items', async () => {
  const db = database();
  const input = manifestFor([completed[2]]);
  await runImport(input, db);
  const saved = db.tables.content_items[0];
  saved.stage = 'edit';
  saved.hook = 'Owner opening';
  saved.cta = 'Owner CTA';
  saved.brief = { script: 'Owner narration', caption: '', asset_urls: ['https://example.org/owner.mp4'], studio: { owner_note: 'Keep this choice', research: { approved_fact: true } }, cta_not_needed: false };
  const unrelated = { ...structuredClone(saved), id: 'other-brand-item', project_id: 'brand-2', brief: { script: 'Unrelated work' } };
  db.tables.content_items.push(unrelated);
  const unrelatedBefore = structuredClone(unrelated);
  input.posts[0] = { ...input.posts[0], brief: { ...input.posts[0].brief, studio: { new_research: 'Useful context' } } };
  const result = await runImport(input, db);
  assert.equal(result.updated.length, 1);
  assert.equal(saved.stage, 'edit');
  assert.equal(saved.hook, 'Owner opening');
  assert.equal(saved.cta, 'Owner CTA');
  assert.equal(saved.brief.hook, 'Owner opening');
  assert.equal(saved.brief.cta, 'Owner CTA');
  assert.equal(saved.brief.script, 'Owner narration');
  assert.equal(saved.brief.caption, completed[2].caption);
  assert.equal(saved.brief.cta_not_needed, false);
  assert.deepEqual(saved.brief.studio, { owner_note: 'Keep this choice', research: { approved_fact: true }, new_research: 'Useful context' });
  assert.deepEqual(saved.brief.asset_urls, ['https://example.org/owner.mp4', 'https://example.org/final.mp4']);
  assert.deepEqual(unrelated, unrelatedBefore);
  const writesAfterRepair = db.writes.length;
  const repeat = await runImport(input, db);
  assert.equal(repeat.created.length, 0);
  assert.equal(repeat.updated.length, 0);
  assert.equal(db.writes.length, writesAfterRepair);
});

test('asset metadata without hashes is idempotent, scoped to the source and brand, and never counted as a finished deliverable', async () => {
  const post = { title: 'Reference only', format: 'post', stage: 'design', cta_not_needed: true, files: [
    { file_name: 'reference.png', path: 'reference.png', size: 100 },
    { file_name: 'reference.png', path: 'reference.png', size: 100 },
  ] };
  const db = database();
  await runImport(manifestFor([post]), db);
  await runImport(manifestFor([post]), db);
  assert.equal(db.tables.brand_kit_assets.length, 1);
  assert.equal(db.tables.content_items.length, 1);
  assert.equal(db.tables.content_placements.length, 1);
  assert.equal(readiness.canApproveFinishedContent(db.tables.content_items[0]), false);
  assert.match(readiness.contentDeliveryGaps(db.tables.content_items[0]).join(' '), /finished production file/);
  await runImport({ ...manifestFor([post]), source: { title: 'Different source' }, package_name: 'Different family' }, db);
  await runImport(manifestFor([post]), db, 'brand-2');
  assert.equal(db.tables.brand_kit_assets.length, 3, 'same filename is not the same asset in a different source or brand');
});

test('different formats and accounts keep their own draft placement, including repeated packages', async () => {
  const posts = [
    { ...completed[0], title: 'Same idea', account: 'Main account' },
    { ...completed[0], title: 'Same idea', account: 'Second account' },
    { ...completed[2], title: 'Same idea', channel: 'instagram', account: 'Main account' },
  ];
  const db = database();
  await runImport(manifestFor(posts), db);
  await runImport(manifestFor(posts), db);
  assert.equal(db.tables.content_items.length, 2);
  assert.equal(db.tables.content_placements.length, 3);
});

test('malformed manifests fail before writes, even when a valid earlier post or source could have been saved', async () => {
  const invalid = [
    null,
    { ...manifestFor(completed), source: { title: 42 } },
    manifestFor([completed[0], { title: 'Bad', script: { text: 'wrong type' } }]),
    manifestFor([{ ...completed[0], brief: { asset_urls: 'https://example.org/file.png' } }]),
    manifestFor([{ ...completed[0], brief: { asset_urls: ['javascript:alert(1)'] } }]),
    manifestFor([{ ...completed[0], cta_not_needed: 'true' }]),
    manifestFor([{ ...completed[0], files: [{ name: 'x', size: '100' }] }]),
    manifestFor([{ ...completed[0], stage: 'published' }]),
    manifestFor([{ ...completed[0], stage: 'scheduled' }]),
    manifestFor([{ ...completed[0], format: 'made-up-format' }]),
    manifestFor([{ ...completed[0], title: null }]),
  ];
  for (const input of invalid) {
    const db = database();
    await assert.rejects(runImport(input, db));
    assert.deepEqual(db.writes, [], JSON.stringify(input));
  }
});

test('read errors stop imports and released items retain their approved content', async () => {
  const failedDb = database({}, ({ table, operation }) => table === 'content_sources' && operation === 'select');
  await assert.rejects(runImport(manifestFor(completed), failedDb), /Injected database error/);
  assert.deepEqual(failedDb.writes, []);
  const db = database();
  await runImport(manifestFor([completed[2]]), db);
  const saved = db.tables.content_items[0];
  saved.approved_at = '2026-11-19T00:00:00Z';
  saved.brief = { script: 'Approved narration' };
  const before = structuredClone(saved);
  await runImport(manifestFor([completed[2]]), db);
  assert.deepEqual(saved, before);
});

test('legacy brief text survives enrichment and a concurrent owner edit blocks a stale import update', async () => {
  const incoming = packages.parseContentPackage(manifestFor([completed[2]])).posts[0].item;
  const patch = packages.contentPackagePatch({ brief: 'Original owner brief', stage: 'idea', hook: null }, incoming);
  assert.equal(patch.brief.summary, 'Original owner brief');
  assert.equal(patch.brief.script, completed[2].script);

  let db;
  db = database({}, ({ table, operation }) => {
    if (table === 'content_items' && operation === 'update') {
      const item = db.tables.content_items[0];
      item.updated_at = 'concurrent-revision';
      item.brief.caption = 'Owner just saved this';
    }
    return false;
  });
  await runImport(manifestFor([completed[2]]), db);
  db.tables.content_items[0].brief.caption = '';
  await assert.rejects(runImport(manifestFor([completed[2]]), db), /changed during this import/);
  assert.equal(db.tables.content_items[0].brief.caption, 'Owner just saved this');
  assert.equal(db.writes.filter(write => write.operation === 'update').length, 0);
});

test('high scores, references, the wrong production stage and a missing offer CTA cannot substitute for finished work', () => {
  for (const item of [
    { format: 'post', stage: 'design', brief: { reference_url: 'https://example.org/reference.png', cta_not_needed: true } },
    { format: 'article', stage: 'script', brief: { title: 'Only a title' } },
    { format: 'short', stage: 'edit', cta: 'Follow', brief: { asset_urls: ['https://example.org/final.mp4'] } },
    { format: 'post', stage: 'design', purpose_type: 'offer', brief: { asset_urls: ['https://example.org/final.png'], cta_not_needed: true } },
  ]) assert.equal(readiness.canApproveFinishedContent({ ...item, quality_score: 100, quality_fails: [] }), false);
});

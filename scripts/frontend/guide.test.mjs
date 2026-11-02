import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir, readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/guide-'));
await build({ entryPoints: [join(root, 'src/lib/hqGuide.ts')], outfile: join(dir, 'g.mjs'), bundle: true, platform: 'node', format: 'esm' });
const g = await import(pathToFileURL(join(dir, 'g.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

const guideDir = join(root, 'src/content/guide');
const names = (await readdir(guideDir)).filter((n) => n.endsWith('.md')).sort();
const files = Object.fromEntries(await Promise.all(names.map(async (n) => [`../content/guide/${n}`, await readFile(join(guideDir, n), 'utf8')])));
const { articles, parts } = g.buildGuide(files);
const appRoutes = new Set([...(await readFile(join(root, 'src/App.tsx'), 'utf8')).matchAll(/path="([^"]+)"/g)].map((m) => m[1]));

test('parser reads headings, steps, bullets, wrapped lines and the summary', () => {
  const a = g.parseGuideFile([
    '# Today',
    '<!-- part: Workspace | order: 10 | slug: today | route: /workspace | tags: home, next 10 -->',
    '',
    'Your starting screen.',
    '',
    '## How to use it',
    '### Finish a step',
    '1. Tap "Done".',
    '2. Pick the next one',
    '   when the list refreshes.',
    '- A bullet',
    '',
    'A closing paragraph',
    'on two lines.',
  ].join('\n'), '10-today.md');
  assert.equal(a.title, 'Today');
  assert.equal(a.part, 'Workspace');
  assert.equal(a.order, 10);
  assert.equal(a.route, '/workspace');
  assert.deepEqual(a.tags, ['home', 'next 10']);
  assert.equal(a.summary, 'Your starting screen.');
  assert.deepEqual(a.blocks, [
    { type: 'h2', text: 'How to use it' },
    { type: 'h3', text: 'Finish a step' },
    { type: 'ol', items: ['Tap "Done".', 'Pick the next one when the list refreshes.'] },
    { type: 'ul', items: ['A bullet'] },
    { type: 'p', text: 'A closing paragraph on two lines.' },
  ]);
});

test('route none means no Open this screen button; placeholders are not openable', () => {
  const a = g.parseGuideFile('# X\n<!-- part: P | order: 1 | slug: x | route: none | tags: -->\n\nHi.', 'x.md');
  assert.equal(a.route, null);
  assert.equal(g.openableRoute(null), null);
  assert.equal(g.openableRoute('/brands/:venueId'), null);
  assert.equal(g.openableRoute('/portfolio'), '/portfolio');
});

test('search needs every word', () => {
  assert.ok(articles.length > 0, 'the guide has articles');
  const hits = g.searchGuide(articles, 'setup score');
  assert.ok(hits.every((a) => a.haystack.includes('setup') && a.haystack.includes('score')));
  assert.equal(g.searchGuide(articles, '').length, articles.length);
});

test('every guide file has a full header, a summary and sections', () => {
  assert.equal(articles.length, names.length, 'every file parsed');
  for (const n of names) {
    const raw = files[`../content/guide/${n}`];
    const lines = raw.split('\n');
    assert.match(lines[0], /^# \S/, `${n}: line 1 is the title`);
    assert.match(lines[1], /^<!-- part: .+ \| order: \d+ \| slug: [a-z0-9-]+ \| route: \S+ \| tags: .* -->$/, `${n}: line 2 is the header`);
    const a = g.parseGuideFile(raw, n);
    assert.ok(a.summary.length > 20, `${n}: has a summary paragraph`);
    assert.ok(a.blocks.some((b) => b.type === 'h2'), `${n}: has sections`);
    assert.equal(`${String(a.order).padStart(2, '0')}-${a.slug}.md`, n, `${n}: file name matches order and slug`);
  }
});

test('orders and slugs are unique and parts are grouped', () => {
  assert.equal(new Set(articles.map((a) => a.order)).size, articles.length);
  assert.equal(new Set(articles.map((a) => a.slug)).size, articles.length);
  assert.equal(parts.reduce((n, p) => n + p.articles.length, 0), articles.length);
});

test('every route points at a real HQ route', () => {
  for (const a of articles) if (a.route) assert.ok(appRoutes.has(a.route), `${a.slug}: route ${a.route} is not in App.tsx`);
});

test('guide text stays plain: no bold, italics, links, emails, IDs or tables', () => {
  for (const n of names) {
    const body = files[`../content/guide/${n}`].split('\n').slice(2).join('\n');
    assert.doesNotMatch(body, /\*\*|__|(^|\s)[*_][^\s*_][^*_]*[*_](?=\s|[.,;:!?)]|$)/m, `${n}: bold or italics`);
    assert.doesNotMatch(body, /https?:\/\/|www\./i, `${n}: web address`);
    assert.doesNotMatch(body, /[\w.+-]+@[\w-]+\.[\w.]+/, `${n}: email address`);
    assert.doesNotMatch(body, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, `${n}: internal ID`);
    assert.doesNotMatch(body, /^\s*\|.*\|\s*$/m, `${n}: table`);
    assert.doesNotMatch(body, /<[a-z][^>]*>/i, `${n}: HTML`);
    // Upper case only: "Todo" is a real task status on screen.
    assert.doesNotMatch(body, /\bTODO\b|\bTBD\b/, `${n}: placeholder text`);
    assert.doesNotMatch(body, /lorem ipsum/i, `${n}: placeholder text`);
  }
});

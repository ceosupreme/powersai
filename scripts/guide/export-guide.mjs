// Parses src/content/guide with the same parser the /guide page uses and writes
// the result as JSON, so the PDF copy is built from exactly what the page shows.
// Usage: node scripts/guide/export-guide.mjs <out.json>
import { build } from 'esbuild';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve('.');
const out = process.argv[2] ?? 'guide.json';
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/guide-export-'));
try {
  await build({ entryPoints: [join(root, 'src/lib/hqGuide.ts')], outfile: join(dir, 'g.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const g = await import(pathToFileURL(join(dir, 'g.mjs')).href);
  const guideDir = join(root, 'src/content/guide');
  const names = (await readdir(guideDir)).filter((n) => n.endsWith('.md')).sort();
  const files = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await readFile(join(guideDir, n), 'utf8')])));
  const { parts } = g.buildGuide(files);
  await writeFile(out, JSON.stringify({ parts }, null, 1));
  console.log(`[guide] ${parts.reduce((n, p) => n + p.articles.length, 0)} articles in ${parts.length} parts -> ${out}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}

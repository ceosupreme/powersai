import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EDGE_POLICIES } from '../../supabase/functions/_shared/edge-policies.ts';

const root = resolve(import.meta.dirname, '../..');
const directory = resolve(root, 'supabase/functions');
const apply = process.argv.includes('--apply');
// Concurrent Phase 2b edits own these handlers. They add the exact same guard;
// --apply-owned can finish integration after those edits have been reviewed.
const reserved = new Set(['resend-inbound-webhook', 'automation-send-approved',
  'automation-queue-sweeper', 'generate-recovery-report', 'reconcile-checkouts',
  'client-approval-stale-digest']);
const failures = [];
const inventory = [];

for (const name of (await readdir(directory)).filter((name) => !name.startsWith('_')).sort()) {
  const file = resolve(directory, name, 'index.ts');
  let source;
  try { source = await readFile(file, 'utf8'); } catch { continue; }
  const policy = EDGE_POLICIES[name];
  if (!policy) { failures.push(`${name}: missing explicit policy`); continue; }
  const expected = `await guardEdgeRequest(req, '${name}')`;
  const present = (text) => new RegExp(`await\\s+guardEdgeRequest\\(req,\\s*['\"]${name}['\"]\\)`).test(text);
  if (!present(source) && apply && (!reserved.has(name) || process.argv.includes('--apply-owned'))) {
    const matcher = /((?:Deno\.)?serve\()(?:async )?\(req\) => \{/;
    if (!matcher.test(source)) { failures.push(`${name}: unknown handler shape`); continue; }
    source = `import { guardEdgeRequest } from '../_shared/auth-guard.ts';\n` +
      source.replace(matcher, `$1async (req) => {\n  const __authDenied = ${expected};\n  if (__authDenied) return __authDenied;\n`);
    await writeFile(file, source);
  }
  if (!present(source)) failures.push(`${name}: missing shared entry guard`);
  const start = source.search(/(?:Deno\.)?serve\(async \(req\) => \{/);
  const firstCode = source.slice(start).split('\n').slice(1, 3).join('\n');
  if (present(source) && !present(firstCode)) failures.push(`${name}: guard is not the first handler operation`);
  inventory.push({ name, mode: policy.mode, rationale: policy.rationale });
}
for (const name of Object.keys(EDGE_POLICIES)) {
  if (!inventory.some((entry) => entry.name === name)) failures.push(`${name}: policy without a handler`);
}

if (apply) {
  // Scoped job credentials and signed webhooks use the in-handler verifier.
  // Every function is listed explicitly; none relies on the gateway accepting
  // a publishable JWT as proof of user identity.
  const config = 'project_id = "llanezccussjtzzrbrtq"\n\n' +
    '# Authentication is enforced by guardEdgeRequest and the explicit edge-policies manifest.\n' +
    inventory.map(({ name }) => `[functions.${name}]\nverify_jwt = false\n`).join('\n');
  await writeFile(resolve(root, 'supabase/config.toml'), config);
}

console.log(JSON.stringify({ handlers: inventory.length,
  modes: inventory.reduce((counts, entry) => ({ ...counts, [entry.mode]: (counts[entry.mode] ?? 0) + 1 }), {}),
  failures }, null, 2));
if (failures.length) process.exitCode = 1;

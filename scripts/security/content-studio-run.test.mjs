import test from 'node:test';
import assert from 'node:assert/strict';
import { guardEdgeRequest } from '../../supabase/functions/_shared/auth-guard.ts';
import { runStudioTask, studioTaskId, studioSearchSources, studioDestinationUrls, validateStudioResearch, validateStudioDraft } from '../../supabase/functions/content-studio-run/core.ts';

const taskId = '10000000-0000-4000-8000-000000000001';
const contentId = '20000000-0000-4000-8000-000000000001';
const projectId = '30000000-0000-4000-8000-000000000001';
const leaseId = '40000000-0000-4000-8000-000000000001';
const now = new Date('2026-11-19T12:00:00Z');
const sourceUrl = 'https://official.example/city-history';
const snippet = 'The city opened its coastal tram line in 1920. The central station sits beside the old harbor.';
const searchResponse = { results: [{ title: 'City transport archive', url: sourceUrl, snippet }] };
const researchOutput = { summary: 'Two grounded details and one clearly imagined scene for the city video.', facts: [
  { kind: 'fact', text: 'The coastal tram line opened in 1920.', source_id: 'source-1', supporting_excerpt: 'The city opened its coastal tram line in 1920.' },
  { kind: 'scenario', text: 'A fictional night drive passes the harbor as the lights turn on.', source_id: null, supporting_excerpt: null },
], caveats: ['Confirm current street access before planning a real shoot.'] };
const draftOutput = {
  summary: 'Three different openings and a source-backed draft are ready for owner review.',
  hooks: [
    { label: 'Visual surprise', text: 'A hundred years of city motion in one night drive.', rationale: 'Connects the car sequence to a sourced detail instead of a generic luxury claim.' },
    { label: 'Local detail', text: 'Follow the lights from the old harbor to the tram line.', rationale: 'Promises a specific route with a clear visual payoff in the video.' },
    { label: 'Creative contrast', text: 'Old tracks. New engine. One city after dark.', rationale: 'Creates an original contrast without inventing a historical claim.' },
  ],
  script: 'Provisional opening: Old tracks. New engine. One city after dark. This coastal tram line opened in 1920. Our imagined drive follows the harbor lights.',
  caption: 'An imagined night drive through a real city. Save the route for your next idea.',
  shot_plan: '00:00–00:03 | Harbor wide shot | Establish the imagined night drive.\n00:03–00:08 | Tram detail | Show the sourced historical context.',
  claims: [{ text: 'The coastal tram line opened in 1920.', evidence_id: 'evidence-1' }],
  originality_notes: 'Uses the old tram and modern car contrast with a fictional harbor-light sequence. Recheck brand voice before release.',
};

function fixture(type = 'research', options = {}) {
  const studio = { revision: 1, picks: { city: 'Harbor City', car: 'Example GT' }, decisions: { owner_note: 'Keep the calm pace' }, research: {
    facts: [{ id: 'saved-fact', kind: 'fact', text: 'The coastal tram line opened in 1920.', source_url: sourceUrl, source_title: 'City transport archive' }],
  } };
  const task = { id: taskId, kind: 'task', venue_id: projectId, content_item_id: contentId, status: 'new', attempts: 0,
    spec: { source: 'content_studio', task_type: type, content_revision: 1, instructions: 'Keep it specific to this city.',
      content: { id: contentId, title: 'City after dark', format: 'reel', hook: 'Owner chosen opening', cta: 'Save the route' }, studio,
      template_snapshot: { id: 'template-1', recipe: { research_brief: 'Local transit history and visible landmarks' } } } };
  const tables = {
    agent_handoffs: [task], content_items: [{ id: contentId, project_id: projectId, stage: 'script', brief: { studio: structuredClone(studio) } }],
    knowledge_base: [
      { id: 'brand-rules', venue_id: projectId, subcategory: 'brand_rules', status: 'active', title: 'Saved brand rules', full_text: 'Measured, observant narration; no unsupported luxury claims.' },
      { id: 'studio-standard', venue_id: null, status: 'active', tags: ['key:content_studio_standard'], title: 'Content Studio standard', full_text: 'Three honest hooks, attributable evidence and original scenes.' },
      { id: 'other-brand-rules', venue_id: 'other-project', subcategory: 'brand_rules', status: 'active', title: 'Other brand secret', full_text: 'Must not be sent to this model.' },
    ],
    brand_kits: [{ project_id: projectId, archived: false, brand_voice: 'Cinematic and grounded', content_pillars: ['City stories'] }],
    content_sources: [{ project_id: projectId, source_type: 'niche_profile', title: 'Saved niche', summary: 'Car and city enthusiasts' }],
  };
  const calls = { access: [], claim: [], complete: [], search: [], generate: [] };
  const admin = {
    from(table) {
      const filters = []; const orders = []; let single = false; let limit = Infinity; let fields = '*';
      const valueAt = (row, path) => path.split(/->>?/).reduce((value, key) => value?.[key], row);
      const query = {
        select(value) { fields = value; return query; },
        eq(key, value) { filters.push(row => valueAt(row, key) === value); return query; },
        neq(key, value) { filters.push(row => valueAt(row, key) !== value); return query; },
        in(key, values) { filters.push(row => values.includes(row[key])); return query; },
        is(key, value) { filters.push(row => (row[key] ?? null) === value); return query; },
        contains(key, values) { filters.push(row => values.every(value => (row[key] ?? []).includes(value))); return query; },
        order(key, options = {}) { orders.push({ key, ascending: options.ascending !== false }); return query; }, limit(value) { limit = value; return query; },
        maybeSingle() { single = true; return query; },
        then(resolve) {
          const rows = (tables[table] ?? []).filter(row => filters.every(filter => filter(row))).sort((a, b) => {
            for (const order of orders) {
              const compared = String(valueAt(a, order.key) ?? '').localeCompare(String(valueAt(b, order.key) ?? ''));
              if (compared) return order.ascending ? compared : -compared;
            }
            return 0;
          }).slice(0, limit).map(row => fields === '*' ? structuredClone(row) : Object.fromEntries(fields.split(',').map(field => {
            const [alias, path] = field.includes(':') ? field.split(':') : [field, field];
            return [alias, structuredClone(valueAt(row, path))];
          })));
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, args) {
      if (name === 'hq_studio_claim') {
        calls.claim.push(args);
        if (task.status === 'claimed' && Date.parse(task.studio_lease_expires_at) > now.getTime()) return { error: { message: 'already claimed' } };
        Object.assign(task, { status: 'claimed', studio_claim_token: leaseId, studio_lease_expires_at: '2026-11-19T14:00:00Z' });
        return { data: structuredClone(task), error: null };
      }
      assert.equal(name, 'hq_studio_complete');
      calls.complete.push(structuredClone(args));
      assert.equal(args.p_claim_token, leaseId);
      if (options.conflict && args.p_status === 'done') return { data: null, error: { code: '40001', message: 'revision changed' } };
      task.status = args.p_status;
      task.result = { summary: args.p_result.summary, submission: args.p_result };
      return { data: structuredClone(task), error: null };
    },
  };
  const deps = {
    admin, now: () => now,
    canAccessProject: async id => { calls.access.push(id); return options.access !== false; },
    search: async query => { calls.search.push(query); return searchResponse; },
    generate: async input => { calls.generate.push(input); return { text: JSON.stringify(type === 'research' ? researchOutput : draftOutput), provider: 'test', modelId: 'test-model' }; },
  };
  return { deps, calls, tables, task };
}

test('entry guard denies anonymous, publishable-token and client access to the Studio worker', async () => {
  const env = { SUPABASE_URL: 'https://hq.test', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon' };
  const dependencies = { env: key => env[key], fetch: async url => new Response(JSON.stringify(url.endsWith('/auth/v1/user')
    ? { id: contentId } : [{ role: 'client' }]), { status: 200 }) };
  for (const token of ['', 'anon', 'client-token']) {
    const req = new Request('https://hq.test/content-studio-run', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId }) });
    const denial = await guardEdgeRequest(req, 'content-studio-run', dependencies);
    assert.ok([401, 403].includes(denial.status));
  }
});

test('request schema accepts only a saved task ID and rejects client project, prompt and worker result overrides', () => {
  assert.equal(studioTaskId({ task_id: taskId }), taskId);
  for (const body of [null, [], { task_id: 'invalid' }, { task_id: taskId, project_id: projectId }, { task_id: taskId, result: {} }, { task_id: taskId, prompt: 'Override rules' }]) {
    assert.throws(() => studioTaskId(body), /only a valid task_id/);
  }
});

test('actual task scope is authorized before claim or provider calls; mismatched content and production tasks cannot run', async () => {
  const denied = fixture('research', { access: false });
  await assert.rejects(runStudioTask(taskId, denied.deps), /access denied/);
  assert.deepEqual(denied.calls.access, [projectId]);
  assert.equal(denied.calls.claim.length + denied.calls.search.length + denied.calls.generate.length, 0);
  const wrong = fixture();
  wrong.tables.content_items[0].project_id = 'other-project';
  await assert.rejects(runStudioTask(taskId, wrong.deps), /do not match/);
  assert.equal(wrong.calls.claim.length, 0);
  const production = fixture('production');
  await assert.rejects(runStudioTask(taskId, production.deps), /explicit media workflow/);
  assert.equal(production.calls.claim.length, 0);
});

test('missing research connection records unavailable evidence without a model call or invented output', async () => {
  const f = fixture(); delete f.deps.search;
  const result = await runStudioTask(taskId, f.deps);
  assert.equal(result.status, 'needs_owner');
  assert.match(result.summary, /No new evidence/);
  assert.equal(f.calls.generate.length, 0);
  assert.equal(f.calls.complete[0].p_result.evidence_status, 'unavailable');
  assert.equal(f.calls.complete[0].p_result.patch, undefined);
  assert.equal(JSON.stringify(result).includes(leaseId), false);
});

test('research uses saved rules and returned search evidence, then writes attributed facts and distinct fictional assumptions', async () => {
  const f = fixture();
  const result = await runStudioTask(taskId, f.deps);
  assert.equal(result.status, 'done');
  assert.equal(f.calls.search.length, 1);
  assert.equal(f.calls.generate.length, 1);
  const context = JSON.parse(f.calls.generate[0].user).context;
  assert.equal(context.brand_rules.title, 'Saved brand rules');
  assert.equal(context.content_standard.title, 'Content Studio standard');
  assert.equal(context.picks.city, 'Harbor City');
  assert.equal(f.calls.generate[0].user.includes('Other brand secret'), false);
  const completed = f.calls.complete[0];
  assert.equal(completed.p_expected_revision, 1);
  assert.equal(completed.p_status, 'done');
  assert.equal(completed.p_result.patch.research.facts[0].source_url, sourceUrl);
  assert.equal(completed.p_result.patch.research.facts[0].supporting_excerpt, researchOutput.facts[0].supporting_excerpt);
  assert.equal(completed.p_result.patch.research.facts[1].kind, 'scenario');
  assert.equal(completed.p_result.patch.research.facts[1].source_url, '');
  assert.deepEqual(completed.p_result_links, [{ url: sourceUrl, label: 'City transport archive' }]);
  assert.equal(completed.p_result.context.standard_id, 'studio-standard');
});

test('saved research direction reaches both the bounded search query and model context', async () => {
  const f = fixture();
  const direction = 'Investigate harbor flood barriers and the local evacuation routes.';
  f.task.spec.studio.research.direction = direction;
  f.task.spec.studio.picks = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`choice-${index}`, 'Long default '.repeat(100)]));
  assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
  assert.ok(f.calls.search[0].startsWith(direction));
  assert.ok(f.calls.search[0].length <= 1400);
  const input = JSON.parse(f.calls.generate[0].user);
  assert.equal(input.context.research.direction, direction);
  assert.match(input.instruction, /owner's research direction/);
});

test('saved idea summary, purpose and evidence reach the worker as advisory background and the summary supplies a search fallback', async () => {
  const f = fixture();
  const idea = 'Explore the harbor tram and nighttime lighting as a calm original car story.';
  f.task.spec.content.brief = { summary: idea };
  f.task.spec.content.purpose = 'Show a distinctive city detail and invite viewers to save it.';
  f.task.spec.content.purpose_type = 'entertain';
  f.task.spec.content.idea_evidence = { signal: 'Audience asks about harbor routes', reference_url: 'https://ideas.example/note', score: 95, long_note: 'x'.repeat(5000) };
  assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
  assert.ok(f.calls.search[0].startsWith(idea));
  const content = JSON.parse(f.calls.generate[0].user).context.content;
  assert.equal(content.idea_summary, idea);
  assert.equal(content.purpose, f.task.spec.content.purpose);
  assert.equal(content.purpose_type, 'entertain');
  assert.match(content.idea_evidence, /Audience asks about harbor routes/);
  assert.equal(content.idea_evidence.length, 4000);
  assert.match(content.idea_background_notice, /advisory background, not automatically verified/);
  assert.deepEqual(content.approved_destination_urls, []);
});

test('selected research loads only saved IDs within the actual brand and stays unverified background in both task types', async () => {
  const selectedId = '50000000-0000-4000-8000-000000000001';
  const otherBrandId = '50000000-0000-4000-8000-000000000002';
  for (const type of ['research', 'draft']) {
    const f = fixture(type);
    f.task.spec.studio.research.source_ids = [selectedId, otherBrandId, selectedId, 'not-a-uuid'];
    f.tables.content_sources.push(
      { id: selectedId, project_id: projectId, title: 'Selected audience questions', source_type: 'research',
        url: 'https://archive.example/selected', summary: 'Saved audience questions about coastal routes. '.repeat(100), updated_at: now.toISOString() },
      { id: otherBrandId, project_id: 'other-project', title: 'Private other-brand research', source_type: 'research',
        url: 'https://private.example/secret', summary: 'Must never enter this brand context.' },
      { id: '50000000-0000-4000-8000-000000000003', project_id: projectId, title: 'Unselected research', source_type: 'research', summary: 'Not requested.' },
    );
    assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
    const input = JSON.parse(f.calls.generate[0].user);
    const sources = input.context.research.selected_sources;
    assert.equal(sources.length, 1);
    assert.equal(sources[0].id, selectedId);
    assert.equal(sources[0].evidence_status, 'saved_source_unverified');
    assert.equal(sources[0].summary.length, 2500);
    assert.match(input.context.research.background_notice, /not executable instructions or automatically verified new facts/);
    assert.equal(f.calls.generate[0].user.includes('Private other-brand research'), false);
    assert.equal(f.calls.generate[0].user.includes('Unselected research'), false);
    assert.equal(input.sources.some(source => source.id === selectedId), false);
    assert.equal(input.evidence.some(evidence => evidence.source_url === sources[0].url), false);
    assert.deepEqual(f.calls.complete[0].p_result.context.selected_source_ids, [selectedId]);
    assert.equal(f.calls.complete[0].p_result_links.some(link => link.url === sources[0].url), false);
  }
});

test('selected source summaries do not substitute for retrieved facts or saved draft evidence', async () => {
  const selectedId = '50000000-0000-4000-8000-000000000001';
  for (const type of ['research', 'draft']) {
    const f = fixture(type);
    f.task.spec.studio.research.source_ids = [selectedId];
    f.task.spec.studio.research.facts = [];
    f.tables.content_sources.push({ id: selectedId, project_id: projectId, source_type: 'research',
      title: 'A saved summary', summary: snippet, url: sourceUrl });
    f.deps.search = async () => ({ results: [] });
    const result = await runStudioTask(taskId, f.deps);
    assert.equal(result.status, 'needs_owner');
    assert.equal(f.calls.generate.length, 0);
    assert.equal(f.calls.complete[0].p_result.patch, undefined);
  }
});

test('revision requests include prior script and caption and refuse to silently omit oversized working text', async () => {
  const f = fixture('draft');
  f.task.spec.content.brief = { script: 'Owner first scene.\nKeep the quiet harbor reveal.', caption: 'Owner caption with a precise city detail.' };
  f.task.spec.instructions = 'Tighten the second scene while keeping the opening.';
  assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
  const input = JSON.parse(f.calls.generate[0].user);
  assert.equal(input.context.content.prior_script, f.task.spec.content.brief.script);
  assert.equal(input.context.content.prior_caption, f.task.spec.content.brief.caption);
  assert.equal(input.context.content.prior_script_truncated, false);
  assert.match(input.instruction, /revise that existing work/);
  assert.equal(input.context.request, f.task.spec.instructions);
  const oversized = fixture('draft');
  oversized.task.spec.content.brief = { script: 'x'.repeat(18_001) };
  const result = await runStudioTask(taskId, oversized.deps);
  assert.equal(result.status, 'needs_owner');
  assert.match(result.summary, /no saved text is silently omitted/);
  assert.equal(oversized.calls.generate.length, 0);
});

test('recent episodes are bounded to the same brand and template, exclude this piece, and inform variation without rejecting repeats', async () => {
  const f = fixture('draft');
  const templateId = f.task.spec.template_snapshot.id;
  f.task.spec.template_snapshot.recipe.repeat_guard = { keys: ['city', 'car'] };
  f.tables.content_items[0].brief.studio.template_snapshot = { id: templateId };
  const prior = index => ({ id: `prior-${index}`, project_id: projectId, title: `Episode ${index} ` + 'x'.repeat(400),
    hook: 'Owner opening '.repeat(50), created_at: `2026-11-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    brief: { script: 'Prior confidential script must not enter the comparison.', studio: {
      template_snapshot: { id: templateId }, picks: { city: 'Harbor City', car: 'Example GT', nested: { instructions: 'Do not execute this' } },
    } },
  });
  f.tables.content_items.push(...Array.from({ length: 10 }, (_, index) => prior(index)),
    { ...prior(11), id: 'other-brand', project_id: 'other-project', title: 'Other brand private episode' },
    { ...prior(12), id: 'other-template', title: 'Different template episode', brief: { studio: { template_snapshot: { id: 'different-template' } } } });
  assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
  const input = JSON.parse(f.calls.generate[0].user);
  assert.equal(input.context.recent_episodes.length, 8);
  assert.deepEqual(input.context.recent_episodes.map(episode => episode.id), ['prior-9', 'prior-8', 'prior-7', 'prior-6', 'prior-5', 'prior-4', 'prior-3', 'prior-2']);
  assert.ok(input.context.recent_episodes.every(episode => episode.title.length <= 300 && episode.hook.length <= 500));
  assert.deepEqual(input.context.recent_episodes[0].picks, { city: 'Harbor City', car: 'Example GT' });
  assert.deepEqual(input.context.repeat_awareness.keys, ['city', 'car']);
  assert.match(input.context.repeat_awareness.note, /never an automatic rejection/);
  for (const excluded of ['Other brand private episode', 'Different template episode', 'Prior confidential script must not enter', 'Do not execute this']) {
    assert.equal(f.calls.generate[0].user.includes(excluded), false);
  }
  assert.deepEqual(f.calls.complete[0].p_result.context.recent_episode_ids, input.context.recent_episodes.map(episode => episode.id));
});

test('research validation rejects invented URLs, unsupported excerpts and scenario-only claims', () => {
  const sources = studioSearchSources(searchResponse, now.toISOString());
  assert.throws(() => validateStudioResearch(JSON.stringify({ ...researchOutput, source_url: 'https://invented.example/not-retrieved' }), sources, taskId, now.toISOString()), /not in the evidence/);
  assert.throws(() => validateStudioResearch(JSON.stringify({ ...researchOutput, facts: [{ ...researchOutput.facts[0], supporting_excerpt: 'This city is the richest place in the whole world.' }] }), sources, taskId, now.toISOString()), /could not be matched/);
  assert.throws(() => validateStudioResearch(JSON.stringify({ ...researchOutput, facts: [researchOutput.facts[1]] }), sources, taskId, now.toISOString()), /No sourced facts/);
  assert.deepEqual(studioSearchSources({ results: [{ url: 'javascript:alert(1)', snippet }] }, now.toISOString()), []);
});

test('draft produces three openings, script and shot plan from saved evidence without choosing a hook, making assets or approving', async () => {
  const f = fixture('draft');
  const result = await runStudioTask(taskId, f.deps);
  assert.equal(result.status, 'done');
  assert.equal(f.calls.search.length, 0);
  const patch = f.calls.complete[0].p_result.patch;
  assert.equal(patch.decisions.hooks.length, 3);
  assert.equal(patch.decisions.shot_plan, draftOutput.shot_plan);
  assert.equal(patch.decisions.claim_checks[0].source_url, sourceUrl);
  assert.deepEqual(Object.keys(patch.creative).sort(), ['caption', 'script']);
  const context = JSON.parse(f.calls.generate[0].user).context;
  assert.equal(context.content.chosen_hook, 'Owner chosen opening');
  assert.equal(context.owner_decisions.owner_note, 'Keep the calm pace');
  const noEvidence = fixture('draft'); noEvidence.task.spec.studio.research.facts = [];
  assert.equal((await runStudioTask(taskId, noEvidence.deps)).status, 'needs_owner');
  assert.equal(noEvidence.calls.generate.length, 0);
});

test('duplicate hooks and fabricated draft citations fail validation', () => {
  const evidence = [{ id: 'evidence-1', source_url: sourceUrl }];
  assert.throws(() => validateStudioDraft(JSON.stringify({ ...draftOutput, hooks: [draftOutput.hooks[0], draftOutput.hooks[0], draftOutput.hooks[2]] }), evidence, taskId), /repeated a hook/);
  assert.throws(() => validateStudioDraft(JSON.stringify({ ...draftOutput, claims: [{ text: 'An unsupported claim', evidence_id: 'invented' }] }), evidence, taskId), /not saved/);
  assert.throws(() => validateStudioDraft(JSON.stringify({ ...draftOutput, claims: [] }), evidence, taskId), /claim-to-source checklist/);
});

test('destination allowlist uses explicit saved fields, strict http links and a fixed bound', () => {
  const spec = { content: { cta: 'Get [the guide](https://brand.example/Guide_(City)).', brief: {
    cta: 'Stale CTA at https://stale.example/offer', summary: 'Background link https://notes.example/reference',
    destination_url: 'https://brand.example/landing', product_url: 'javascript:alert(1)',
  } }, studio: { picks: { offer_url: 'http://brand.example/offer', research_url: 'https://research.example/source' },
    decisions: { landing_page_url: 'https://user:password@brand.example/private', cta_url: ['https://invalid.example/array'] } },
    instructions: 'Use https://instructions.example/unknown' };
  assert.deepEqual(studioDestinationUrls(spec), ['https://brand.example/Guide_(City)', 'https://brand.example/landing', 'http://brand.example/offer']);
  const many = { content: { cta: Array.from({ length: 12 }, (_, index) => `https://brand.example/offer-${index}`).join(' ') } };
  assert.equal(studioDestinationUrls(many).length, 8);
});

test('worker preserves an owner CTA URL in script and caption while claim checks remain attached to evidence', async () => {
  const f = fixture('draft');
  const destination = 'https://brand.example/guide?utm_source=hq';
  f.task.spec.content.cta = `Get the city guide at ${destination}.`;
  f.deps.generate = async input => {
    f.calls.generate.push(input);
    return { text: JSON.stringify({ ...draftOutput,
      script: `${draftOutput.script}\nGet the city guide at ${destination}.`,
      caption: `${draftOutput.caption} [Get the guide](${destination}).`,
    }), provider: 'test', modelId: 'test-model' };
  };
  assert.equal((await runStudioTask(taskId, f.deps)).status, 'done');
  const context = JSON.parse(f.calls.generate[0].user).context.content;
  assert.deepEqual(context.approved_destination_urls, [destination]);
  const result = f.calls.complete[0].p_result;
  assert.ok(result.patch.creative.script.includes(destination));
  assert.ok(result.patch.creative.caption.includes(destination));
  assert.equal(result.patch.decisions.claim_checks[0].source_url, sourceUrl);
  assert.equal(f.calls.complete[0].p_result_links.some(link => link.url === destination), false);
});

test('destination links are allowed only in script and caption and never become evidence IDs or authorize invented URLs', () => {
  const destination = 'https://brand.example/guide';
  const evidence = [{ id: 'evidence-1', source_url: sourceUrl }];
  const validate = output => validateStudioDraft(JSON.stringify(output), evidence, taskId, [destination]);
  for (const output of [
    { ...draftOutput, summary: `Read the owner offer at ${destination}` },
    { ...draftOutput, hooks: [{ ...draftOutput.hooks[0], text: `Visit ${destination}` }, ...draftOutput.hooks.slice(1)] },
    { ...draftOutput, shot_plan: `${draftOutput.shot_plan}\nShow ${destination}` },
    { ...draftOutput, claims: [{ text: `Source at ${destination}`, evidence_id: 'evidence-1' }] },
    { ...draftOutput, script: `${draftOutput.script} Visit https://invented.example/offer.` },
    { ...draftOutput, caption: `${draftOutput.caption} Visit https://brand.example/guide-other.` },
  ]) assert.throws(() => validate(output), /not in the evidence or approved destinations/);
  assert.throws(() => validate({ ...draftOutput, claims: [{ text: 'This claim cites the owner destination.', evidence_id: 'destination-1' }] }), /not saved/);
  assert.throws(() => validate({ ...draftOutput, claims: [{ text: 'This claim cites the owner destination.', evidence_id: destination }] }), /not in the evidence or approved destinations/);
});

test('known evidence URLs tolerate ordinary sentence punctuation and preserve balanced URL parentheses', () => {
  const balancedUrl = 'https://archive.example/City_(Archive)';
  const evidence = [{ id: 'evidence-1', source_url: sourceUrl }, { id: 'evidence-2', source_url: balancedUrl }];
  assert.doesNotThrow(() => validateStudioDraft(JSON.stringify({ ...draftOutput,
    script: `${draftOutput.script} See (${sourceUrl}). See [the archive](${balancedUrl}).`,
    caption: `Read ${sourceUrl}, then the archive at ${balancedUrl}!`,
  }), evidence, taskId));
  const excerpt = `The city opened its coastal tram line in 1920; the archive is at ${sourceUrl}.`;
  const sources = studioSearchSources({ results: [{ title: 'City archive', url: sourceUrl, snippet: excerpt }] }, now.toISOString());
  assert.doesNotThrow(() => validateStudioResearch(JSON.stringify({ ...researchOutput, facts: [{
    ...researchOutput.facts[0], supporting_excerpt: excerpt,
  }] }), sources, taskId, now.toISOString()));
});

test('a timed-out invocation can retry claimed and completed tasks without duplicate paid work', async () => {
  const claimed = fixture(); claimed.task.status = 'claimed'; claimed.task.studio_lease_expires_at = '2026-11-19T14:00:00Z';
  assert.equal((await runStudioTask(taskId, claimed.deps)).status, 'claimed');
  assert.equal(claimed.calls.claim.length + claimed.calls.search.length + claimed.calls.generate.length, 0);
  const done = fixture(); await runStudioTask(taskId, done.deps);
  await runStudioTask(taskId, done.deps);
  assert.equal(done.calls.claim.length, 1);
  assert.equal(done.calls.search.length, 1);
  assert.equal(done.calls.generate.length, 1);
});

test('stale generated output is retained for review instead of replacing current content', async () => {
  const f = fixture('draft', { conflict: true });
  const result = await runStudioTask(taskId, f.deps);
  assert.equal(result.status, 'needs_owner');
  assert.deepEqual(f.calls.complete.map(call => call.p_status), ['done', 'needs_owner']);
  assert.equal(f.calls.complete[1].p_result.patch.creative.script, draftOutput.script);
  const stale = fixture(); stale.tables.content_items[0].brief.studio.revision = 2;
  assert.equal((await runStudioTask(taskId, stale.deps)).status, 'needs_owner');
  assert.equal(stale.calls.search.length + stale.calls.generate.length, 0);
});

test('provider errors are recorded with a safe summary instead of echoing raw credentials or failure bodies', async () => {
  const f = fixture(); f.deps.search = async () => { throw new Error('raw provider body: api_key=do-not-show'); };
  const result = await runStudioTask(taskId, f.deps);
  assert.equal(result.status, 'failed');
  assert.equal(JSON.stringify({ result, complete: f.calls.complete }).includes('do-not-show'), false);
});

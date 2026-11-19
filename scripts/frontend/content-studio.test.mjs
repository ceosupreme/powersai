import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve('.');
await mkdir(join(root, 'node_modules/.cache'), { recursive: true });
const dir = await mkdtemp(join(root, 'node_modules/.cache/studio-tests-'));
await build({ entryPoints: [join(root, 'src/lib/contentStudio.ts')], outfile: join(dir, 'studio.mjs'), bundle: true, platform: 'node', format: 'esm' });
const studio = await import(pathToFileURL(join(dir, 'studio.mjs')).href);
after(() => rm(dir, { recursive: true, force: true }));

const recipe = {
  format: 'long_form', product_type: 'long_form_video', destinations: ['youtube'],
  fields: [{ key: 'city', label: 'City', required: true, default: 'Dubai', options: [{ value: 'Dubai', label: 'Dubai' }, { value: 'Tokyo', label: 'Tokyo' }] }, { key: 'car', label: 'Car', required: true }],
  defaults: { car: 'Aston Martin', city: '' }, quality_checks: ['Landmarks are real and visible'], steps: [{ title: 'Research and plan' }, { title: 'Produce and review' }],
};
const template = { id: 'template-1', title: 'City Drive Mix', slug: 'city-drive-mix', version: 2, project_id: 'coastal', status: 'ready', recipe, default_tier: 'guided' };
const item = {
  id: 'content-1', project_id: 'coastal', title: 'Night drive', format: 'long_form', stage: 'idea', hook: 'A city after dark', cta: '',
  brief: { unrelated: { keep: true }, script: 'The episode plan', asset_urls: ['https://example.com/video'], studio: {
    revision: 3, step: 'research', tier: 'guided', picks: { city: 'Tokyo', car: 'Aston Martin' },
    template_snapshot: { id: template.id, slug: template.slug, version: 2, title: template.title, recipe },
    decisions: { hooks: [{ id: 'hook-1', label: 'Atmosphere', text: 'A city after dark' }], shot_plan: '00:00 — first view' },
    research: { facts: [{ id: 'f1', kind: 'fact', text: 'A place-specific claim', source_url: 'https://example.com/source' }], source_ids: ['source-1'] }, variants: [],
  } },
};

test('required variable choices accept original entries and preserve explicit empty defaults', () => {
  assert.deepEqual(studio.templatePicks(template), { city: '', car: 'Aston Martin' });
  assert.deepEqual(studio.missingStudioPicks(recipe, studio.templatePicks(template)), ['City']);
  assert.deepEqual(studio.missingStudioPicks(recipe, { city: 'A city not in the options', car: 'A unique car' }), []);
  assert.deepEqual(studio.missingStudioPicks(recipe, { city: '   ', car: 'Aston Martin' }), ['City']);
});

test('template shelf isolates brands and excludes retired templates', () => {
  const rows = [template, { ...template, id: 'other', project_id: 'other-brand' }, { ...template, id: 'global', project_id: null }, { ...template, id: 'old', status: 'retired' }];
  assert.deepEqual(studio.visibleStudioTemplates(rows, 'coastal').map(t => t.id), ['template-1', 'global']);
});

test('reopening an item preserves its saved recipe version, choices, evidence and step', () => {
  const draft = studio.draftForItem(item);
  assert.equal(draft.revision, 3);
  assert.equal(draft.step, 'research');
  assert.equal(draft.template_snapshot.version, 2);
  assert.equal(draft.picks.city, 'Tokyo');
  assert.equal(draft.script, 'The episode plan');
  assert.deepEqual(draft.research.source_ids, ['source-1']);
});

test('save patch separates creative fields and never sends mutable template snapshots or revisions', () => {
  const draft = studio.draftForItem(item);
  draft.asset_urls = [' https://example.com/video ', '', 'https://example.com/video'];
  const patch = studio.draftPatch(draft);
  assert.equal(patch.creative.script, 'The episode plan');
  assert.deepEqual(patch.creative.asset_urls, ['https://example.com/video']);
  assert.equal(patch.revision, undefined);
  assert.equal(patch.template_snapshot, undefined);
  assert.deepEqual(patch.research, draft.research);
});

test('new reusable template copies variable defaults without copying episode evidence, hooks or files', () => {
  const draft = studio.draftForItem(item);
  const cloned = studio.templateRecipeFromDraft(draft);
  assert.equal(cloned.defaults.city, 'Tokyo');
  assert.equal(cloned.fields[0].default, 'Tokyo');
  assert.deepEqual(cloned.quality_checks, recipe.quality_checks);
  assert.deepEqual(cloned.steps, recipe.steps);
  assert.equal(cloned.research, undefined);
  assert.equal(cloned.hooks, undefined);
  assert.equal(cloned.script, undefined);
  assert.equal(cloned.asset_urls, undefined);
  assert.equal(recipe.fields[0].default, 'Dubai', 'source recipe must remain untouched');
});

test('an original idea can become an editable reusable format without a previous template', () => {
  const draft = studio.draftForItem({ ...item, brief: { studio: { picks: { audience: 'New creators', promise: 'One clear next step' } } } });
  const reusable = studio.templateRecipeFromDraft(draft);
  assert.equal(reusable.fields.find(f => f.key === 'audience').default, 'New creators');
  assert.ok(reusable.fields.find(f => f.key === 'original_angle'));
});

test('review distinguishes factual claims without support from explicitly fictional assumptions', () => {
  const draft = studio.draftForItem(item);
  draft.research.facts = [
    { id: 'fact', kind: 'fact', text: 'A claim needing verification', source_url: '' },
    { id: 'scenario', kind: 'scenario', text: 'A fictional event', source_url: '' },
  ];
  const notes = studio.studioReviewNotes(draft);
  assert.ok(notes.includes('Add source links for 1 factual claim.'));
  assert.equal(notes.some(n => /2 factual/.test(n)), false);
});

test('external links reject executable and malformed URLs', () => {
  assert.equal(studio.studioUrl('javascript:alert(1)'), undefined);
  assert.equal(studio.studioUrl('data:text/html,hello'), undefined);
  assert.equal(studio.studioUrl('/file'), undefined);
  assert.equal(studio.studioUrl('https://example.com/evidence'), 'https://example.com/evidence');
});

test('queue status never claims a saved request has already been completed', () => {
  assert.equal(studio.studioTaskStatus('new'), 'Queued · awaiting a worker');
  assert.equal(studio.studioTaskStatus('claimed'), 'Worker is preparing this');
  assert.equal(studio.studioTaskStatus('done'), 'Results saved');
  assert.equal(studio.studioTaskStatus('needs_owner'), 'Needs your review');
});

test('legacy briefs remain readable without a Studio state', () => {
  assert.equal(studio.studioState('An old plain-text brief').revision, 0);
  assert.equal(studio.draftForItem({ ...item, brief: { full_text: 'An existing article' } }).script, 'An existing article');
  assert.equal(studio.studioState({ studio: { revision: 'broken', step: 'unknown' } }).step, 'choices');
});

test('result capture preserves unknown metrics and distinguishes explicit zero', () => {
  const result = studio.studioResultMetrics({ platform: 'youtube', post_url: 'https://example.com/post', views: '1000', shares: '0', likes: '', saves: ' ' });
  assert.deepEqual(result, { platform: 'youtube', post_url: 'https://example.com/post', views: 1000, shares: 0 });
  assert.throws(() => studio.studioResultMetrics({ views: '', shares: '' }), /at least one measured/);
  assert.throws(() => studio.studioResultMetrics({ views: '-1' }), /whole number/);
  assert.throws(() => studio.studioResultMetrics({ views: '1.5' }), /whole number/);
});

test('repeat warning finds prior combinations across recipe versions and accepts original choices', () => {
  const repeatTemplate = { ...template, recipe: { ...recipe, repeat_guard: { keys: ['city', 'car'] } } };
  assert.deepEqual(studio.studioRepeatMatches(repeatTemplate, { city: ' tokyo ', car: 'ASTON MARTIN' }, [item]).map(i => i.id), ['content-1']);
  assert.deepEqual(studio.studioRepeatMatches(repeatTemplate, { city: 'Miami', car: 'Aston Martin' }, [item]), []);
  assert.deepEqual(studio.studioRepeatMatches(repeatTemplate, { city: '', car: 'Aston Martin' }, [item]), []);
  assert.deepEqual(studio.studioRepeatMatches(repeatTemplate, { city: 'Tokyo', car: 'Aston Martin' }, [{ ...item, project_id: 'another-brand' }]), []);
});

test('a one-time repeat note is never inherited as permission for another episode', () => {
  const draft = studio.draftForItem(item);
  draft.picks.repeat_override_note = 'This episode follows a different route';
  assert.equal(studio.templateRecipeFromDraft(draft).defaults.repeat_override_note, undefined);
  assert.equal(studio.templatePicks({ ...template, recipe: { ...recipe, defaults: { repeat_override_note: 'Old permission' } } }).repeat_override_note, undefined);
});

test('navigation-only saves preserve published creative fields including legacy nulls', () => {
  const published = { ...item, stage: 'published', cta: null, hook: null };
  const draft = studio.draftForItem(published);
  draft.step = 'review';
  const patch = studio.draftPatch(draft, published);
  assert.deepEqual(patch.creative, {});
  assert.equal(patch.step, 'review');
  draft.caption = 'A real edit';
  assert.deepEqual(studio.draftPatch(draft, published).creative, { caption: 'A real edit' });
});

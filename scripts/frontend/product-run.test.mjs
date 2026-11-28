import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { currentRunStep, selectedChoices, stageForStep, transitionRun, validLiveUrl, productTypeFromTask } from '../../src/lib/productRun.ts';
const recipe = JSON.parse(await readFile('supabase/recipes/written_book.recipe.json', 'utf8'));
const stage = recipe.stages.find(s => s.key === 'approve_brief');
const state = () => ({ product_template: { id: 'template', version: 2, recipe }, stage_steps: { approve_brief: 'a' }, stage_results: {} });
const at = '2026-11-28T07:00:00Z';
test('recommended choices are preselected from the frozen recipe, not positions', () => {
  assert.equal(selectedChoices(stage).author_name, 'allmighty_supreme');
  assert.equal(stageForStep(state(), { id: 'a' }).key, 'approve_brief');
});
test('choose persists value, timestamp and keyed history without completing the stage', () => {
  const s = transitionRun(state(), stage, { action: 'choose', key: 'approve_brief', choice: 'author_name', value: 'sean_powers' }, at);
  assert.equal(s.stage_results.approve_brief.choices.author_name, 'sean_powers');
  assert.equal(s.stage_results.approve_brief.at, at);
  assert.equal(s.stage_results.approve_brief.status, undefined);
  assert.equal(s.stage_results.approve_brief.events.length, 1);
});
test('approve persists recommended defaults and completes an owner stage', () => {
  const s = transitionRun(state(), stage, { action: 'approve', key: stage.key }, at);
  assert.equal(s.stage_results.approve_brief.status, 'done');
  assert.equal(s.stage_results.approve_brief.choices.author_name, 'allmighty_supreme');
});
test('a false skip rule waits for the owner; a true rule permits skip', () => {
  const required = { ...stage, skip: { can_skip: false, rule: 'Owner must approve.' } };
  assert.throws(() => transitionRun(state(), required, { action: 'skip', key: stage.key }, at), /cannot be skipped/);
  const s = transitionRun(state(), { ...required, skip: { can_skip: true, rule: 'Use the saved brief.' } }, { action: 'skip', key: stage.key }, at);
  assert.equal(s.stage_results.approve_brief.status, 'skipped');
});
test('reopen retains the chosen answers and the approval history', () => {
  const done = transitionRun(state(), stage, { action: 'approve', key: stage.key }, at);
  const s = transitionRun(done, stage, { action: 'reopen', key: stage.key }, at);
  assert.equal(s.stage_results.approve_brief.status, 'open');
  assert.equal(s.stage_results.approve_brief.choices.author_name, 'allmighty_supreme');
  assert.equal(s.stage_results.approve_brief.events.length, 2);
});
test('resume finds the first unfinished saved step even with an extra setup step', () => {
  const steps = [{ id: 'setup', step_order: 1, status: 'Done' }, { id: 'a', step_order: 2, status: 'Open' }, { id: 'b', step_order: 3, status: 'Open' }];
  assert.equal(currentRunStep([...steps].reverse()).id, 'a');
});
test('agent output requires real text or a link and is saved under its stage key', () => {
  const agent = recipe.stages[0];
  assert.throws(() => transitionRun(state(), agent, { action: 'output', key: agent.key, value: ' ' }, at), /output/);
  const s = transitionRun(state(), agent, { action: 'output', key: agent.key, value: 'Research evidence: https://example.com/research' }, at);
  assert.equal(s.stage_results.check_shelf.output, 'Research evidence: https://example.com/research');
  assert.equal(s.stage_results.check_shelf.status, 'done');
});
test('saving a link rejects non-URLs and publication requires the primary paperback, not a Kindle link', () => {
  const publish = recipe.stages.find(s => s.key === 'publish_kdp');
  assert.equal(validLiveUrl('javascript:alert(1)'), false);
  assert.throws(() => transitionRun(state(), publish, { action: 'link', key: publish.key, outlet: 'Paperback', value: '' }, at), /URL/);
  let s = transitionRun(state(), publish, { action: 'link', key: publish.key, outlet: 'Kindle', value: 'https://example.com/kindle' }, at);
  assert.throws(() => transitionRun(s, publish, { action: 'approve', key: publish.key }, at), /primary/);
  s = transitionRun(s, publish, { action: 'link', key: publish.key, outlet: 'Paperback', value: 'https://example.com/paperback' }, at);
  assert.equal(transitionRun(s, publish, { action: 'approve', key: publish.key }, at).stage_results.publish_kdp.status, 'done');
});
test('product task types use the four ready recipe types', () => {
  assert.equal(productTypeFromTask('Create a course'), 'course');
  assert.equal(productTypeFromTask('Make a printable guide'), 'ebook_guide');
  assert.equal(productTypeFromTask('Create a puzzle book'), 'puzzle_book');
  assert.equal(productTypeFromTask('Write a book'), 'written_book');
});
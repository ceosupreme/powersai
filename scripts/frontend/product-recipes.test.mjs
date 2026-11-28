import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkProductRecipe, assertProductRecipe, productStageByKey } from '../../src/lib/productRecipes.ts';
import { visibleStudioTemplates } from '../../src/lib/contentStudio.ts';

const counts = { written_book: 12, ebook_guide: 11, course: 11, puzzle_book: 10 };
const files = {};
for (const [key, count] of Object.entries(counts)) {
  const recipe = JSON.parse(await readFile(`supabase/recipes/${key}.recipe.json`, 'utf8'));
  files[key] = recipe;
  test(`${key} passes the source-file load check with ${count} unique stages`, () => {
    assert.deepEqual(checkProductRecipe(recipe), []);
    assert.equal(recipe.stages.length, count);
    assert.equal(new Set(recipe.stages.map(s => s.key)).size, count);
  });
}
const changed = mutate => { const r = structuredClone(files.written_book); mutate(r); return r; };
test('duplicate stage keys are refused', () => {
  assert.throws(() => assertProductRecipe(changed(r => r.stages[1].key = r.stages[0].key)), /unique/);
});
test('stage owner is only claude or owner', () => {
  assert.throws(() => assertProductRecipe(changed(r => r.stages[0].owner = 'muse')), /claude or owner/);
});
test('choices with options require exactly one recommendation', () => {
  for (const all of [false, true]) assert.throws(() => assertProductRecipe(changed(r => r.stages[1].choices[0].options.forEach(o => o.recommended = all))), /exactly one/);
});
test('every owner stage must have an explicit skip rule', () => {
  assert.throws(() => assertProductRecipe(changed(r => delete r.stages[1].skip)), /skip/);
});
test('false can_skip is valid and stays false', () => {
  const r = changed(r => r.stages[1].skip.can_skip = false);
  assertProductRecipe(r);
  assert.equal(r.stages[1].skip.can_skip, false);
});
test('upload_kit is required', () => {
  assert.throws(() => assertProductRecipe(changed(r => delete r.upload_kit)), /upload_kit/);
});
test('stage lookup uses its key even when setup changes order', () => {
  const r = changed(r => r.stages.reverse());
  assert.equal(productStageByKey(r, 'check_shelf').key, 'check_shelf');
  assert.equal(productStageByKey(r, 'extra:brand_rules'), undefined);
});
test('global product recipes do not appear in the post/video picker', () => {
  const product = { id: 'book', project_id: null, status: 'ready', recipe: { kind: 'product' } };
  const post = { ...product, id: 'post', recipe: { format: 'written_post' } };
  assert.deepEqual(visibleStudioTemplates([product, post], 'brand').map(t => t.id), ['post']);
});
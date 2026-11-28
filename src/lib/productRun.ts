import { assertProductRecipe, type ProductRecipe, type ProductStage } from './productRecipes';

export type StageResult = { status?: string; choices?: Record<string, unknown>; output?: string; at?: string; events?: unknown[] };
export type RunState = { product_template: { id: string; version: number; recipe: ProductRecipe }; stage_steps: Record<string, string>; stage_results: Record<string, StageResult>; revision?: number; upload_kit?: { fields?: Record<string, string>; ai_answer?: string }; listings?: Record<string, string> };
export type RunStep = { id: string; title: string; detail?: string; owner_kind: string; assignee?: string; status: string; step_order: number; facts?: string };
export type RunEvent = { action: 'choose' | 'approve' | 'skip' | 'output' | 'reopen' | 'link'; key: string; choice?: string; value?: unknown; outlet?: string };
export const runDone = (result?: StageResult) => ['done', 'skipped'].includes(result?.status ?? '');
export const isPublishStage = (stage: { title: string }) => /^(Publish|List it)/i.test(stage.title);
export function primaryOutletNames(stage: ProductStage, recipe: ProductRecipe, state: RunState): string[] {
  const t = stage.title.toLowerCase();
  if (t.includes('paperback')) return ['Paperback'];
  if (t.includes('twin')) return ['Etsy', 'Payhip'];
  if (t.includes('payhip')) return ['Payhip'];
  const hostStage = recipe.stages.find(s => s.choices.some(c => c.key === 'host'));
  const host = hostStage ? selectedChoices(hostStage, state.stage_results[hostStage.key]).host : 'own_engine';
  return [host === 'own_engine' ? 'Brand site' : String(host).replace(/^./, c => c.toUpperCase())];
}
export const validLiveUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try { const u = new URL(value.trim()); return ['https:', 'http:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password; } catch { return false; }
};
export function stageForStep(state: RunState, step: RunStep): ProductStage {
  const key = Object.keys(state.stage_steps).find(k => state.stage_steps[k] === step.id);
  if (!key) throw new Error('This step has no saved stage key.');
  return state.product_template.recipe.stages.find(s => s.key === key) ?? { key, title: step.title, what: step.detail ?? '', why: '', owner: step.owner_kind === 'owner' ? 'owner' : 'claude', doer: step.assignee ?? 'claude', choices: [], output: [step.detail ?? step.title], check: 'Complete the saved setup work.', skip: { can_skip: false, rule: 'Finish this setup step before continuing.' } };
}
export function selectedChoices(stage: ProductStage, result?: StageResult): Record<string, unknown> {
  return Object.fromEntries(stage.choices.map(c => [c.key, result?.choices?.[c.key] ?? c.options?.find(o => o.recommended)?.value ?? '']));
}
/** One keyed transition model, used by the owner screen and concrete tests; the RPC repeats validation atomically. */
export function transitionRun(state: RunState, stage: ProductStage, event: RunEvent, at: string): RunState {
  assertProductRecipe(state.product_template.recipe);
  const next = structuredClone(state);
  if (event.key !== stage.key) throw new Error('Stage key mismatch.');
  const old = next.stage_results[stage.key] ?? {};
  const result = { ...old, choices: selectedChoices(stage, old), at, events: [...(old.events ?? []), { ...event, at }] };
  if (event.action === 'choose') {
    const c = stage.choices.find(c => c.key === event.choice);
    if (!c || (c.options?.length && !c.options.some(o => o.value === event.value))) throw new Error('Choose an available option.');
    result.choices = { ...result.choices, [c.key]: event.value };
  } else if (event.action === 'skip') {
    if (stage.owner !== 'owner' || stage.skip?.can_skip !== true) throw new Error('This stage cannot be skipped.');
    result.status = 'skipped';
  } else if (event.action === 'approve') {
    if (stage.owner !== 'owner') throw new Error('Agent stages need an output.');
    if (isPublishStage(stage) && !primaryOutletNames(stage, state.product_template.recipe, state).some(o => validLiveUrl(next.listings?.[o]))) throw new Error('Save the primary live link first.');
    result.status = 'done';
  } else if (event.action === 'output') {
    if (stage.owner === 'owner') throw new Error('Owner stages need approval.');
    if (typeof event.value !== 'string' || !event.value.trim()) throw new Error('Add the output link or text.');
    result.output = event.value.trim(); result.status = 'done';
  } else if (event.action === 'reopen') {
    if (!runDone(old)) throw new Error('Only finished stages can be reopened.');
    result.status = 'open';
  } else if (event.action === 'link') {
    if (!event.outlet || !validLiveUrl(event.value)) throw new Error('Enter a full http or https URL.');
    next.listings = { ...next.listings, [event.outlet]: event.value.trim() };
  }
  next.stage_results[stage.key] = result; next.revision = (state.revision ?? 0) + 1;
  return next;
}
export function currentRunStep(steps: RunStep[]): RunStep | undefined {
  return [...steps].sort((a, b) => a.step_order - b.step_order).find(s => s.status !== 'Done');
}
export function productTypeFromTask(title: string): string {
  if (/puzzle|word search/i.test(title)) return 'puzzle_book';
  if (/course/i.test(title)) return 'course';
  if (/guide|ebook|printable/i.test(title)) return 'ebook_guide';
  return 'written_book';
}
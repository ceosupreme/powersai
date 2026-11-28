/** Saved Content Studio state lives on the existing content item, never a second board. */
export type StudioTier = 'guided' | 'one_tap' | 'automated';
export type StudioTaskType = 'research' | 'draft' | 'production';
export type StudioStep = 'choices' | 'research' | 'hooks' | 'script' | 'production' | 'review';
export interface StudioOption { value: string; label: string; description?: string }
export interface StudioField { key: string; label: string; help?: string; required?: boolean; default?: string; options?: StudioOption[] }
export interface StudioRecipe {
  format?: string; product_type?: string; destinations?: string[]; fields?: StudioField[];
  defaults?: Record<string, unknown>; research_brief?: string; quality_checks?: string[];
  hook_directions?: string[]; platform_defaults?: Record<string, unknown>; [key: string]: unknown;
}
export interface ContentTemplate {
  id: string; slug: string; version: number; title: string; description: string | null;
  project_id: string | null; status: 'draft' | 'ready' | 'validated' | 'retired';
  default_tier: StudioTier; recipe: StudioRecipe; created_at?: string;
}
export interface StudioFact {
  id: string; text: string; source_url: string; source_title?: string;
  kind: 'fact' | 'scenario'; verified_at?: string;
}
export interface StudioHook { id: string; label: string; text: string; rationale?: string }
export interface StudioVariant {
  id: string; platform: string; format: string; hook: string; caption: string; notes: string; asset_url: string;
}
export interface StudioState {
  revision: number; tier: StudioTier; step: StudioStep; picks: Record<string, unknown>;
  template_snapshot?: { id: string; slug: string; version: number; title: string; recipe: StudioRecipe };
  decisions: Record<string, unknown>; research: Record<string, unknown>; variants: StudioVariant[];
  updated_at?: string;
}
export interface StudioItem {
  id: string; project_id: string; title: string; format: string | null; stage: string;
  hook: string | null; cta: string | null; brief: unknown; purpose: string | null;
  purpose_type: string | null; idea_score: number | null; idea_evidence: unknown;
  quality_score: number | null; quality_fails: string[] | null; approved_at: string | null;
  created_at: string; updated_at: string;
}
export interface StudioDraft extends StudioState {
  title: string; hook: string; cta: string; format: string; script: string; caption: string; asset_urls: string[];
}
export interface StudioPatch {
  template_id?: string; tier?: StudioTier; picks?: Record<string, unknown>; decisions?: Record<string, unknown>;
  research?: Record<string, unknown>; variants?: StudioVariant[]; step?: StudioStep;
  creative?: { title?: string; hook?: string; cta?: string; format?: string; script?: string; caption?: string; asset_urls?: string[] };
}
export interface StudioTask {
  id: string; title: string; status: string; created_at: string; updated_at?: string;
  completed_at?: string | null; claimed_at?: string | null; notes?: string | null;
  spec: Record<string, unknown>; result?: Record<string, unknown> | null; result_links?: unknown;
}

export const STUDIO_STEPS: { key: StudioStep; title: string; help: string }[] = [
  { key: 'choices', title: 'Your direction', help: 'Choose what makes this piece yours.' },
  { key: 'research', title: 'Research', help: 'Keep real evidence and creative assumptions separate.' },
  { key: 'hooks', title: 'Opening', help: 'Pick the promise your content will deliver.' },
  { key: 'script', title: 'Script & scenes', help: 'Build the story before generating the assets.' },
  { key: 'production', title: 'Make & adapt', help: 'Save the finished files and shape each platform version.' },
  { key: 'review', title: 'Review', help: 'Finish through your existing HQ approval workflow.' },
];
export const STUDIO_TIERS = [
  { value: 'guided' as const, title: 'Guided', description: 'Review the direction, opening and scenes as you go.' },
  { value: 'one_tap' as const, title: 'Prepare a full draft', description: 'Use your saved choices to prepare the package for your review.' },
  { value: 'automated' as const, title: 'Automated', description: 'Requires explicit activation for this brand, template and destination.' },
];
export const STUDIO_DRIVE = [
  { label: 'Content Studio hub', url: 'https://drive.google.com/drive/folders/1Nz5RoB4CLLvwV2K4ltxl7HWD-JJxMWwh' },
  { label: 'Productions', url: 'https://drive.google.com/drive/folders/1jhpfIUjxAy1UqyFXRJ0EEBB5y5gLCMg_' },
  { label: 'Generation Library', url: 'https://drive.google.com/drive/folders/1mfM-Y177PDtVisJYXIJSA5pKFh7EqkSl' },
  { label: 'For your approval', url: 'https://drive.google.com/drive/folders/1LChacEqIMtMrFA2pZJddmdRyh4gLgY4U' },
  { label: 'Ready to post', url: 'https://drive.google.com/drive/folders/1uR2Oj5y8R9XijfrXVLnRTkqdG8WWXpta' },
];

export function studioObject(value: unknown): Record<string, any> {
  if (typeof value === 'string') { try { return studioObject(JSON.parse(value)); } catch { return { summary: value }; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}
export function studioText(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function studioLines(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
export function studioUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? value : undefined; } catch { return undefined; }
}
export function studioState(brief: unknown): StudioState {
  const saved = studioObject(studioObject(brief).studio);
  return { ...saved, revision: Number.isInteger(saved.revision) ? saved.revision : 0,
    tier: ['guided', 'one_tap', 'automated'].includes(saved.tier) ? saved.tier : 'guided',
    step: STUDIO_STEPS.some(s => s.key === saved.step) ? saved.step : 'choices',
    picks: studioObject(saved.picks), decisions: studioObject(saved.decisions), research: studioObject(saved.research),
    variants: Array.isArray(saved.variants) ? saved.variants : [],
  } as StudioState;
}
export function draftForItem(item: StudioItem): StudioDraft {
  const brief = studioObject(item.brief);
  return { ...studioState(brief), title: item.title, hook: item.hook ?? '', cta: item.cta ?? '', format: item.format ?? 'reel',
    script: studioText(brief.script || brief.body || brief.full_text || brief.text), caption: studioText(brief.caption), asset_urls: studioLines(brief.asset_urls) };
}
export function recipeFields(recipe: StudioRecipe | undefined): StudioField[] {
  if (!Array.isArray(recipe?.fields)) return [];
  return recipe.fields.filter(f => f && typeof f.key === 'string' && typeof f.label === 'string').map(f => ({ ...f,
    options: Array.isArray(f.options) ? f.options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
      .filter(o => typeof o?.value === 'string' && typeof o?.label === 'string') : [],
  }));
}
export function templatePicks(template: ContentTemplate): Record<string, unknown> {
  const picks = { ...studioObject(template.recipe.defaults) };
  delete picks.repeat_override_note;
  for (const field of recipeFields(template.recipe)) if (!(field.key in picks) && field.default != null) picks[field.key] = field.default;
  return picks;
}
export function missingStudioPicks(recipe: StudioRecipe | undefined, picks: Record<string, unknown>): string[] {
  return recipeFields(recipe).filter(f => f.required && !String(picks[f.key] ?? '').trim()).map(f => f.label);
}
export function visibleStudioTemplates(templates: ContentTemplate[], projectId: string): ContentTemplate[] {
  return templates.filter(t => t.recipe.kind !== 'product' && t.status !== 'retired' && (!t.project_id || t.project_id === projectId));
}
export function studioRepeatMatches(template: ContentTemplate, picks: Record<string, unknown>, items: StudioItem[]): StudioItem[] {
  const keys = studioLines(studioObject(template.recipe.repeat_guard).keys);
  const normalize = (value: unknown) => ['string', 'number'].includes(typeof value) ? String(value).trim().toLowerCase() : '';
  if (!keys.length || keys.some(key => !normalize(picks[key]))) return [];
  return items.filter(item => {
    const saved = studioState(item.brief).template_snapshot;
    return item.project_id === (template.project_id || item.project_id) && saved && (saved.id === template.id || saved.slug === template.slug);
  }).slice(0, 20).filter(item => keys.every(key => normalize(studioState(item.brief).picks[key]) === normalize(picks[key])));
}
export function draftPatch(draft: StudioDraft, baseline?: StudioItem): StudioPatch {
  const creative: StudioPatch['creative'] = { title: draft.title.trim(), hook: draft.hook, cta: draft.cta, format: draft.format,
    script: draft.script, caption: draft.caption, asset_urls: [...new Set(draft.asset_urls.map(u => u.trim()).filter(Boolean))] };
  if (baseline && studioState(baseline.brief).revision > 0) {
    const saved = draftForItem(baseline);
    for (const key of Object.keys(creative) as (keyof NonNullable<StudioPatch['creative']>)[]) {
      if (JSON.stringify(creative[key]) === JSON.stringify(saved[key])) delete creative[key];
    }
  }
  return { tier: draft.tier, step: draft.step, picks: draft.picks, decisions: draft.decisions, research: draft.research, variants: draft.variants, creative };
}
export function studioFacts(research: Record<string, unknown>): StudioFact[] {
  return Array.isArray(research.facts) ? research.facts.filter(f => f && typeof f === 'object').map((f: any, i) => ({
    ...f, id: typeof f.id === 'string' ? f.id : `fact-${i}`, text: studioText(f.text), source_url: studioText(f.source_url), kind: f.kind === 'scenario' ? 'scenario' : 'fact',
  })) : [];
}
export function studioHooks(decisions: Record<string, unknown>): StudioHook[] {
  return Array.isArray(decisions.hooks) ? decisions.hooks.filter(h => h && typeof h === 'object').map((h: any, i) => ({
    ...h, id: studioText(h.id) || `hook-${i}`, label: studioText(h.label) || `Opening ${i + 1}`, text: studioText(h.text), rationale: studioText(h.rationale),
  })) : [];
}
export function studioTaskType(task: StudioTask): string {
  const input = studioObject(task.spec);
  return studioText(input.task_type) || studioText(input.studio_task_type) || 'Work';
}
export function studioTaskStatus(status: string): string {
  if (['new', 'queued', 'pending'].includes(status)) return 'Queued · awaiting a worker';
  if (['claimed', 'running', 'in_progress'].includes(status)) return 'Worker is preparing this';
  if (['done', 'completed', 'succeeded'].includes(status)) return 'Results saved';
  if (['failed', 'error'].includes(status)) return 'Needs attention';
  if (status === 'needs_owner') return 'Needs your review';
  if (status === 'cancelled') return 'Cancelled';
  if (['conflict', 'stale', 'needs_review'].includes(status)) return 'Saved result needs review';
  return status;
}
export function studioReviewNotes(draft: StudioDraft): string[] {
  const notes = missingStudioPicks(draft.template_snapshot?.recipe, draft.picks).map(label => `Choose ${label.toLowerCase()}.`);
  if (!draft.hook.trim()) notes.push('Choose or write an opening.');
  if (!draft.script.trim()) notes.push('Save the script or finished written content.');
  const unsupported = studioFacts(draft.research).filter(f => f.kind === 'fact' && f.text.trim() && !studioUrl(f.source_url));
  if (unsupported.length) notes.push(`Add source links for ${unsupported.length} factual ${unsupported.length === 1 ? 'claim' : 'claims'}.`);
  if (draft.asset_urls.some(u => !studioUrl(u))) notes.push('Fix the asset links that do not open an HTTP or HTTPS address.');
  if (draft.tier === 'automated') notes.push('Automated publishing is not activated by this draft.');
  return notes;
}
export function templateRecipeFromDraft(draft: StudioDraft): StudioRecipe {
  const base = draft.template_snapshot?.recipe ?? {};
  // Save the recipe and variable defaults, never this episode's evidence, hooks or private content.
  const fields = recipeFields(base);
  const ownFields: StudioField[] = [
    { key: 'audience', label: 'Audience', help: 'Who should this reach?' },
    { key: 'promise', label: 'Audience takeaway', help: 'What should they feel, understand or do?' },
    { key: 'original_angle', label: 'Original angle', help: 'What makes this version different?' },
  ];
  const defaults = { ...draft.picks }; delete defaults.repeat_override_note;
  return { ...base, format: draft.format, defaults,
    fields: (fields.length ? fields : ownFields).map(field => ({ ...field, default: String(draft.picks[field.key] ?? field.default ?? '') })) };
}
export const STUDIO_METRICS = [
  { key: 'views', label: 'Views' }, { key: 'reach', label: 'Reach' }, { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' }, { key: 'shares', label: 'Shares' }, { key: 'saves', label: 'Saves' },
  { key: 'follows_gained', label: 'Follows gained' },
] as const;
export function studioResultMetrics(values: Record<string, string>): Record<string, unknown> {
  const metrics: Record<string, unknown> = {};
  for (const key of ['platform', 'post_url', 'captured_on', 'notes']) if (values[key]?.trim()) metrics[key] = values[key].trim();
  let count = 0;
  for (const { key, label } of STUDIO_METRICS) {
    if (!values[key]?.trim()) continue;
    const value = Number(values[key]);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a whole number of zero or more.`);
    metrics[key] = value; count++;
  }
  if (!count) throw new Error('Enter at least one measured result. Leave unknown numbers blank.');
  if (metrics.post_url && !studioUrl(metrics.post_url)) throw new Error('Add the complete live post URL.');
  return metrics;
}

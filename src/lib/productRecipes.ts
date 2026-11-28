/** Product recipes are source data. Validate before loading or freezing a run. */
export interface ProductChoice {
  key: string;
  options?: { recommended?: boolean; [key: string]: unknown }[];
  [key: string]: unknown;
}
export interface ProductStage {
  key: string; title: string; owner: 'claude' | 'owner'; doer: string;
  choices: ProductChoice[]; output: unknown[]; check: string;
  skip?: { can_skip: boolean; rule: string };
  what?: string; why?: string;
  [key: string]: unknown;
}
export interface ProductRecipe {
  key: string; title: string; version: string; kind?: 'product'; kb_id?: string;
  stages: ProductStage[]; upload_kit: Record<string, unknown>;
  [key: string]: unknown;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();

export function checkProductRecipe(value: unknown): string[] {
  if (!object(value)) return ['Recipe must be an object.'];
  const errors: string[] = [];
  for (const key of ['key', 'title', 'version']) if (!text(value[key])) errors.push(`${key} is required.`);
  if (!object(value.upload_kit) || !Object.keys(value.upload_kit).length) errors.push('upload_kit is required.');
  if (!Array.isArray(value.stages) || !value.stages.length) return [...errors, 'stages must be a nonempty list.'];
  const keys = new Set<string>();
  for (const stage of value.stages) {
    if (!object(stage)) { errors.push('Every stage must be an object.'); continue; }
    const key = text(stage.key) ? stage.key : '(missing key)';
    if (!text(stage.key) || keys.has(key)) errors.push(`Stage key must be present and unique: ${key}.`);
    keys.add(key);
    if (!['claude', 'owner'].includes(String(stage.owner))) errors.push(`${key}: owner must be claude or owner.`);
    if (stage.owner === 'owner' && (!object(stage.skip) || typeof stage.skip.can_skip !== 'boolean' || !text(stage.skip.rule))) {
      errors.push(`${key}: every owner stage needs skip.can_skip and a skip.rule.`);
    }
    if (!Array.isArray(stage.choices)) { errors.push(`${key}: choices must be a list.`); continue; }
    for (const choice of stage.choices) {
      if (!object(choice)) { errors.push(`${key}: choice must be an object.`); continue; }
      if (choice.options != null && !Array.isArray(choice.options)) errors.push(`${key}: options must be a list.`);
      if (Array.isArray(choice.options) && choice.options.length && choice.options.filter(o => object(o) && o.recommended === true).length !== 1) {
        errors.push(`${key}/${choice.key}: exactly one option must be recommended.`);
      }
    }
  }
  return errors;
}
export function assertProductRecipe(value: unknown): asserts value is ProductRecipe {
  const errors = checkProductRecipe(value);
  if (errors.length) throw new Error(errors.join('\n'));
}

/** Never infer stage identity from ordinal position or title. */
export function productStageByKey(recipe: ProductRecipe, key: string): ProductStage | undefined {
  return recipe.stages.find(stage => stage.key === key);
}
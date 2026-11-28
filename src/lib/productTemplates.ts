import { supabase } from '@/integrations/supabase/client';
import { assertProductRecipe, type ProductRecipe } from './productRecipes';

export interface ProductTemplate {
  id: string; slug: string; title: string; version: number; recipe: ProductRecipe;
}
export async function loadProductTemplate(slug: string): Promise<ProductTemplate | null> {
  const { data, error } = await supabase.from('content_templates').select('id,slug,title,version,recipe')
    .eq('slug', slug).eq('recipe->>kind', 'product').in('status', ['ready', 'validated'])
    .is('project_id', null).order('version', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  assertProductRecipe(data.recipe);
  return { ...data, recipe: data.recipe };
}

/** Used for owner-supplied source files only; there is intentionally no import screen. */
export async function loadUploadedProductRecipes(files: unknown[]): Promise<ProductTemplate[]> {
  files.forEach(assertProductRecipe);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in to load product recipes.');
  const result: ProductTemplate[] = [];
  for (const file of files) {
    assertProductRecipe(file);
    const { data: methods, error: kbError } = await supabase.from('knowledge_base').select('id,status,updated_at')
      .contains('tags', [`key:${file.key}`]).in('status', ['active', 'draft']).order('updated_at', { ascending: false });
    if (kbError) throw kbError;
    const kb = methods?.find(m => m.status === 'active') ?? methods?.[0];
    if (!kb) throw new Error(`No active or draft playbook tagged key:${file.key}.`);
    // The table's version is an integer; the original semantic version stays in the full JSON.
    const version = Number(file.version.split('.')[0]);
    if (!Number.isSafeInteger(version) || version < 1) throw new Error(`Unsupported template version: ${file.version}.`);
    const recipe = { ...file, kind: 'product' as const, kb_id: kb.id };
    const { data: existing, error: existingError } = await supabase.from('content_templates')
      .select('id,slug,title,version,recipe').eq('slug', file.key).eq('version', version).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      assertProductRecipe(existing.recipe);
      if (JSON.stringify(existing.recipe) !== JSON.stringify(recipe)) {
        // JSONB key order is not meaningful; compare recursively through a canonical representation.
        const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x)
          ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
        if (canonical(existing.recipe) !== canonical(recipe)) throw new Error(`Released ${file.key} version differs; do not overwrite it.`);
      }
      result.push({ ...existing, recipe: existing.recipe });
      continue;
    }
    const { data, error } = await supabase.from('content_templates').insert({ slug: file.key, title: file.title,
      version, recipe: JSON.parse(JSON.stringify(recipe)), status: 'ready', default_tier: 'guided', project_id: null, created_by: user.id })
      .select('id,slug,title,version,recipe').single();
    if (error) throw error;
    assertProductRecipe(data.recipe);
    result.push({ ...data, recipe: data.recipe });
  }
  return result;
}
import { supabase } from '@/integrations/supabase/client';
import { fetchRowsIn, groupBy, omit } from '@/lib/batchFetch';

/**
 * Project type ids are now data-driven — the source of truth is the
 * `project_types` table (see `useProjectTypes`). Admins can add/duplicate/
 * remove types without a code change. `'client'` is the system-wide fallback
 * used whenever an unknown id is encountered.
 */
export type ProjectType = string;

/** System-default fallback id — never deleted, resolves generic behavior. */
export const CLIENT_PROJECT_TYPE: ProjectType = 'client';

export interface EffectivePillar {
  pillar_key: string;
  pillar_label: string;
  weight: number;
  sort_order: number;
  data_source: string | null;
  source: 'override' | 'template';
}

const PILLAR_COLUMNS = 'pillar_key,pillar_label,weight,sort_order,data_source';

/** A project's own pillar list REPLACES its type's list; with no own list, the type's list applies. */
export function mergeEffectivePillars(overrides: any[], templates: any[]): EffectivePillar[] {
  if (overrides.length > 0) {
    return overrides.map((o) => ({ ...o, source: 'override' as const }));
  }
  return templates.map((t) => ({ ...t, source: 'template' as const }));
}

/**
 * Resolve effective pillars for a project:
 *   1. project_pillar_overrides for this project (if any rows exist) — REPLACE template
 *   2. else pillar_templates for the project's type
 */
export async function fetchEffectivePillars(
  projectId: string,
  projectType: ProjectType,
): Promise<EffectivePillar[]> {
  const { data: overrides, error: overridesError } = await supabase
    .from('project_pillar_overrides')
    .select(PILLAR_COLUMNS)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (overridesError) throw overridesError;

  if (overrides && overrides.length > 0) {
    return mergeEffectivePillars(overrides, []);
  }

  const { data: templates, error: templatesError } = await supabase
    .from('pillar_templates')
    .select(PILLAR_COLUMNS)
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });
  if (templatesError) throw templatesError;

  return mergeEffectivePillars([], templates || []);
}

/** fetchEffectivePillars for many projects at once: two requests in total instead of up to two per project. */
export async function fetchEffectivePillarsBatch(
  projects: { id: string; project_type: ProjectType }[],
): Promise<Map<string, EffectivePillar[]>> {
  const overrides = await fetchRowsIn(
    'project_pillar_overrides', `project_id,${PILLAR_COLUMNS}`, 'project_id', projects.map((p) => p.id),
    (q) => q.order('sort_order', { ascending: true }),
  );
  const overridesBy = groupBy(overrides, 'project_id');
  const needTemplates = projects.filter((p) => !overridesBy.get(p.id)?.length);
  const templates = await fetchRowsIn(
    'pillar_templates', `project_type,${PILLAR_COLUMNS}`, 'project_type', needTemplates.map((p) => p.project_type),
    (q) => q.order('sort_order', { ascending: true }),
  );
  const templatesBy = groupBy(templates, 'project_type');
  return new Map(
    projects.map((p) => {
      const own = (overridesBy.get(p.id) ?? []).map((r) => omit(r, 'project_id'));
      const base = own.length ? [] : (templatesBy.get(p.project_type) ?? []).map((r) => omit(r, 'project_type'));
      return [p.id, mergeEffectivePillars(own, base)];
    }),
  );
}

/** Canonical client template — used to short-circuit "visual diff = 0" check. */
export const CANONICAL_CLIENT_KEYS = ['revenue', 'labor', 'operations', 'guest'] as const;

export function isCanonicalClientSetup(
  projectType: ProjectType,
  pillars: EffectivePillar[],
): boolean {
  if (projectType !== 'client') return false;
  if (pillars.some((p) => p.source === 'override')) return false;
  // Canonical client template renders via the existing hardcoded path unchanged.
  return CANONICAL_CLIENT_KEYS.every((k) => pillars.some((p) => p.pillar_key === k));
}

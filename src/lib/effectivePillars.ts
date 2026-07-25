import { supabase } from '@/integrations/supabase/client';

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

/**
 * Resolve effective pillars for a project:
 *   1. project_pillar_overrides for this project (if any rows exist) — REPLACE template
 *   2. else pillar_templates for the project's type
 */
export async function fetchEffectivePillars(
  projectId: string,
  projectType: ProjectType,
): Promise<EffectivePillar[]> {
  const { data: overrides } = await supabase
    .from('project_pillar_overrides')
    .select('pillar_key,pillar_label,weight,sort_order,data_source')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (overrides && overrides.length > 0) {
    return overrides.map((o) => ({ ...o, source: 'override' as const }));
  }

  const { data: templates } = await supabase
    .from('pillar_templates')
    .select('pillar_key,pillar_label,weight,sort_order,data_source')
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });

  return (templates || []).map((t) => ({ ...t, source: 'template' as const }));
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
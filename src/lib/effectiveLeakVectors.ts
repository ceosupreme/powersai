import { supabase } from '@/integrations/supabase/client';
import type { ProjectType } from './effectivePillars';

export type LeakVectorSeverity = 'headline' | 'supporting';

export interface EffectiveLeakVector {
  name: string;
  detect_signal: string | null;
  dollarize_formula: string | null;
  benchmark: string | null;
  severity: LeakVectorSeverity;
  sort_order: number;
  source: 'override' | 'template';
}

/**
 * Resolve effective leak vectors for a project — mirrors fetchEffectivePillars:
 *   1. project_leak_vector_overrides (REPLACE if any rows)
 *   2. else project_type_leak_vectors for the project's type
 */
export async function fetchEffectiveLeakVectors(
  projectId: string,
  projectType: ProjectType,
): Promise<EffectiveLeakVector[]> {
  const { data: overrides } = await (supabase as any)
    .from('project_leak_vector_overrides')
    .select('name,detect_signal,dollarize_formula,benchmark,severity,sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (overrides && overrides.length > 0) {
    return overrides.map((o: any) => ({ ...o, source: 'override' as const }));
  }

  const { data: templates } = await (supabase as any)
    .from('project_type_leak_vectors')
    .select('name,detect_signal,dollarize_formula,benchmark,severity,sort_order')
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });

  return (templates || []).map((t: any) => ({ ...t, source: 'template' as const }));
}
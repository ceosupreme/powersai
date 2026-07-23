import { supabase } from '@/integrations/supabase/client';
import type { ProjectType } from './effectivePillars';

export type QualifierFieldType = 'text' | 'select' | 'number' | 'boolean';
export type QualifierChannel = 'web_voice' | 'phone' | 'chat' | 'sms' | 'form';

export interface EffectiveQualifierField {
  field_key: string;
  field_label: string;
  field_type: QualifierFieldType;
  is_shared: boolean;
  channel: QualifierChannel | null;
  sort_order: number;
  source: 'override' | 'template';
}

/**
 * Resolve effective qualifier fields for a project — mirrors fetchEffectivePillars:
 *   1. project_qualifier_field_overrides (REPLACE if any rows)
 *   2. else project_type_qualifier_fields for the project's type
 */
export async function fetchEffectiveQualifierFields(
  projectId: string | null,
  projectType: ProjectType,
): Promise<EffectiveQualifierField[]> {
  if (projectId) {
    const { data: overrides } = await (supabase as any)
      .from('project_qualifier_field_overrides')
      .select('field_key,field_label,field_type,is_shared,channel,sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    if (overrides && overrides.length > 0) {
      return overrides.map((o: any) => ({ ...o, source: 'override' as const }));
    }
  }

  const { data: templates } = await (supabase as any)
    .from('project_type_qualifier_fields')
    .select('field_key,field_label,field_type,is_shared,channel,sort_order')
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });

  return (templates || []).map((t: any) => ({ ...t, source: 'template' as const }));
}

export interface QualifierConfig {
  ready_definition: string | null;
  primary_channel: QualifierChannel | null;
  urgency_options: Record<string, { label: string; guidance: string }> | null;
}

/** Fetch the per-type qualifier config (ready_definition + primary_channel). */
export async function fetchQualifierConfig(
  projectType: ProjectType,
): Promise<QualifierConfig | null> {
  const { data } = await (supabase as any)
    .from('project_type_qualifier_config')
    .select('ready_definition,primary_channel,urgency_options')
    .eq('project_type', projectType)
    .maybeSingle();
  return (data as QualifierConfig) ?? null;
}
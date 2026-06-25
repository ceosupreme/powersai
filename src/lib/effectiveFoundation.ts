import { supabase } from '@/integrations/supabase/client';

export type FoundationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EffectiveFoundationCategory {
  category_key: string;
  label: string;
  description: string | null;
  weight: number;
  sort_order: number;
  source: 'template' | 'override';
}

export interface EffectiveFoundationItem {
  category_key: string;
  item_key: string;
  label: string;
  description: string | null;
  detection_signal: string;
  is_manual_only: boolean;
  severity: FoundationSeverity;
  sort_order: number;
  recommended_fix: string | null;
  source: 'template' | 'override';
}

/** REPLACE-if-overrides-exist resolver, matching effectivePillars. */
export async function fetchEffectiveFoundationCategories(
  projectId: string,
  projectType: string,
): Promise<EffectiveFoundationCategory[]> {
  const { data: overrides } = await supabase
    .from('project_foundation_category_overrides')
    .select('category_key,label,description,weight,sort_order,is_hidden')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (overrides && overrides.length > 0) {
    return overrides
      .filter((o: any) => !o.is_hidden)
      .map((o: any) => ({ ...o, source: 'override' as const }));
  }

  const { data: templates } = await supabase
    .from('foundation_category_templates')
    .select('category_key,label,description,weight,sort_order')
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });

  return (templates ?? []).map((t: any) => ({ ...t, source: 'template' as const }));
}

export async function fetchEffectiveFoundationItems(
  projectId: string,
  projectType: string,
): Promise<EffectiveFoundationItem[]> {
  const { data: overrides } = await supabase
    .from('project_foundation_item_overrides')
    .select('category_key,item_key,label,description,detection_signal,is_manual_only,severity,sort_order,recommended_fix,is_hidden')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (overrides && overrides.length > 0) {
    return overrides
      .filter((o: any) => !o.is_hidden)
      .map((o: any) => ({ ...o, source: 'override' as const }));
  }

  const { data: templates } = await supabase
    .from('foundation_item_templates')
    .select('category_key,item_key,label,description,detection_signal,is_manual_only,severity,sort_order,recommended_fix')
    .eq('project_type', projectType)
    .order('sort_order', { ascending: true });

  return (templates ?? []).map((t: any) => ({ ...t, source: 'template' as const }));
}
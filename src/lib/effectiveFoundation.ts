import { supabase } from '@/integrations/supabase/client';
import { CLIENT_PROJECT_TYPE } from '@/lib/effectivePillars';

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
  /** Ranking numbers — all nullable; a score needs all four. */
  est_dollars_90d: number | null;
  confidence: number | null;
  leverage: number | null;
  est_hours: number | null;
  source: 'template' | 'override';
}

const ITEM_COLUMNS =
  'category_key,item_key,label,description,detection_signal,is_manual_only,severity,sort_order,recommended_fix,est_dollars_90d,confidence,leverage,est_hours';
const CATEGORY_COLUMNS = 'category_key,label,description,weight,sort_order';

/** Value of the ranked lane: 90-day dollars x confidence x leverage / hours. */
export function laneScore(item: {
  est_dollars_90d: number | null;
  confidence: number | null;
  leverage: number | null;
  est_hours: number | null;
}): number | null {
  const { est_dollars_90d: d, confidence: c, leverage: l, est_hours: h } = item;
  if (d == null || c == null || l == null || h == null) return null;
  if (!(h > 0)) return null;
  return (Number(d) * Number(c) * Number(l)) / Number(h);
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function pick<T>(over: T | null | undefined, base: T): T {
  return over == null ? base : over;
}

/**
 * Client project types keep the historical REPLACE behaviour. Non-client types
 * merge templates with per-project overrides by item_key / category_key.
 */
export async function fetchEffectiveFoundationCategories(
  projectId: string,
  projectType: string,
): Promise<EffectiveFoundationCategory[]> {
  const [{ data: overrides }, { data: templates }] = await Promise.all([
    supabase
      .from('project_foundation_category_overrides')
      .select(`${CATEGORY_COLUMNS},is_hidden`)
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('foundation_category_templates')
      .select(CATEGORY_COLUMNS)
      .eq('project_type', projectType)
      .order('sort_order', { ascending: true }),
  ]);

  const overrideRows = (overrides ?? []) as any[];
  const templateRows = (templates ?? []) as any[];

  if (projectType === CLIENT_PROJECT_TYPE) {
    if (overrideRows.length > 0) {
      return overrideRows
        .filter((o) => !o.is_hidden)
        .map((o) => ({ ...o, source: 'override' as const }));
    }
    return templateRows.map((t) => ({ ...t, source: 'template' as const }));
  }

  const overrideByKey = new Map(overrideRows.map((o) => [o.category_key as string, o]));
  const merged: EffectiveFoundationCategory[] = [];

  for (const t of templateRows) {
    const o = overrideByKey.get(t.category_key);
    if (o?.is_hidden) {
      overrideByKey.delete(t.category_key);
      continue;
    }
    merged.push({
      category_key: t.category_key,
      label: pick(o?.label, t.label),
      description: pick(o?.description, t.description ?? null),
      weight: Number(pick(o?.weight, t.weight)),
      sort_order: Number(pick(o?.sort_order, t.sort_order)),
      source: o ? 'override' : 'template',
    });
    overrideByKey.delete(t.category_key);
  }

  // Override-only categories.
  for (const o of overrideByKey.values()) {
    if (o.is_hidden) continue;
    merged.push({
      category_key: o.category_key,
      label: o.label,
      description: o.description ?? null,
      weight: Number(o.weight ?? 1),
      sort_order: Number(o.sort_order ?? 999),
      source: 'override',
    });
  }

  return merged.sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchEffectiveFoundationItems(
  projectId: string,
  projectType: string,
): Promise<EffectiveFoundationItem[]> {
  const [{ data: overrides }, { data: templates }] = await Promise.all([
    supabase
      .from('project_foundation_item_overrides')
      .select(`${ITEM_COLUMNS},is_hidden`)
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('foundation_item_templates')
      .select(ITEM_COLUMNS)
      .eq('project_type', projectType)
      .order('sort_order', { ascending: true }),
  ]);

  const overrideRows = (overrides ?? []) as any[];
  const templateRows = (templates ?? []) as any[];

  const shape = (row: any, source: 'template' | 'override'): EffectiveFoundationItem => ({
    category_key: row.category_key,
    item_key: row.item_key,
    label: row.label,
    description: row.description ?? null,
    detection_signal: row.detection_signal,
    is_manual_only: !!row.is_manual_only,
    severity: row.severity,
    sort_order: Number(row.sort_order ?? 999),
    recommended_fix: row.recommended_fix ?? null,
    est_dollars_90d: num(row.est_dollars_90d),
    confidence: num(row.confidence),
    leverage: num(row.leverage),
    est_hours: num(row.est_hours),
    source,
  });

  if (projectType === CLIENT_PROJECT_TYPE) {
    if (overrideRows.length > 0) {
      return overrideRows.filter((o) => !o.is_hidden).map((o) => shape(o, 'override'));
    }
    return templateRows.map((t) => shape(t, 'template'));
  }

  const overrideByKey = new Map(overrideRows.map((o) => [o.item_key as string, o]));
  const merged: EffectiveFoundationItem[] = [];

  for (const t of templateRows) {
    const o = overrideByKey.get(t.item_key);
    if (o?.is_hidden) {
      overrideByKey.delete(t.item_key);
      continue;
    }
    if (!o) {
      merged.push(shape(t, 'template'));
      continue;
    }
    merged.push(
      shape(
        {
          ...t,
          label: pick(o.label, t.label),
          description: pick(o.description, t.description ?? null),
          detection_signal: pick(o.detection_signal, t.detection_signal),
          is_manual_only: pick(o.is_manual_only, t.is_manual_only),
          severity: pick(o.severity, t.severity),
          sort_order: pick(o.sort_order, t.sort_order),
          recommended_fix: pick(o.recommended_fix, t.recommended_fix ?? null),
          est_dollars_90d: pick(o.est_dollars_90d, t.est_dollars_90d ?? null),
          confidence: pick(o.confidence, t.confidence ?? null),
          leverage: pick(o.leverage, t.leverage ?? null),
          est_hours: pick(o.est_hours, t.est_hours ?? null),
        },
        'override',
      ),
    );
    overrideByKey.delete(t.item_key);
  }

  // Override-only items.
  for (const o of overrideByKey.values()) {
    if (o.is_hidden) continue;
    merged.push(shape(o, 'override'));
  }

  return merged.sort((a, b) => a.sort_order - b.sort_order);
}

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function radarShelf(title: string): 'PROVEN' | 'EMERGING' | 'UNCLASSIFIED' {
  if (/\bPROVEN\b/i.test(title)) return 'PROVEN';
  if (/\bEMERGING\b/i.test(title)) return 'EMERGING';
  return 'UNCLASSIFIED';
}

export function researchUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function radarEvidence(value: Json | null): { note: string; url?: string }[] {
  const entries = Array.isArray(value) ? value : value && typeof value === 'object' ? value.evidence : null;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.note !== 'string') return [];
    const video = typeof item.v === 'string' && /^[\w-]{11}$/.test(item.v) ? item.v : undefined;
    return [{ note: item.note, url: video ? `https://www.youtube.com/watch?v=${video}` : undefined }];
  });
}

export function groupRadarBriefs<T extends { project_id: string; idea_score: number | null; venues: { name: string } | null }>(items: T[]) {
  const groups = new Map<string, { id: string; brand: string; items: T[] }>();
  for (const item of items) {
    const group = groups.get(item.project_id) ?? { id: item.project_id, brand: item.venues?.name ?? '—', items: [] };
    group.items.push(item);
    groups.set(item.project_id, group);
  }
  return [...groups.values()].sort((a, b) => a.brand.localeCompare(b.brand)).map(group => ({
    ...group,
    items: group.items.sort((a, b) => (b.idea_score ?? -Infinity) - (a.idea_score ?? -Infinity)),
  }));
}

async function allRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export const fetchRadarSources = (sourceType: 'niche_profile' | 'radar_dimension') => allRows((from, to) =>
  supabase.from('content_sources').select('id,project_id,title,summary,url,updated_at,venues(name)')
    .eq('source_type', sourceType).order('updated_at', { ascending: false }).order('id').range(from, to));

export const fetchRadarBriefs = () => allRows((from, to) =>
  supabase.from('content_items').select('id,project_id,title,idea_score,stage,hook,primary_keyword,idea_evidence,venues(name)')
    .like('purpose', 'Radar brief%').order('idea_score', { ascending: false, nullsFirst: false }).order('id').range(from, to));

export const fetchRadarRuns = () => allRows((from, to) =>
  supabase.from('context_source_runs').select('id,completed_at,started_at,items_fetched,status,venues(name)')
    .eq('source_type', 'winner_radar').order('started_at', { ascending: false }).order('id').range(from, to));
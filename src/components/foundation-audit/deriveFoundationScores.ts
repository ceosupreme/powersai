// Foundation Audit scoring. Clones Growth Audit discipline:
// honest unscored categories (no fake 100s), severity-weighted item math,
// weighted average across scored categories using template weights.

import type {
  EffectiveFoundationCategory,
  EffectiveFoundationItem,
} from '@/lib/effectiveFoundation';

export type FoundationStatus =
  | 'satisfied'
  | 'partial'
  | 'missing'
  | 'unknown'
  | 'not_applicable';

export interface VenueFoundationItemStatus {
  item_key: string;
  status: FoundationStatus;
  evidence_url: string | null;
  notes: string | null;
  source: 'auto' | 'manual';
  detected_at: string | null;
  updated_at: string | null;
}

export interface FoundationItemView {
  category_key: string;
  item_key: string;
  label: string;
  description: string | null;
  detection_signal: string;
  is_manual_only: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommended_fix: string | null;
  status: FoundationStatus;
  evidence_url: string | null;
  notes: string | null;
  source: 'auto' | 'manual' | null;
  detected_at: string | null;
}

export interface FoundationCategoryScore {
  category_key: string;
  label: string;
  description: string | null;
  weight: number;
  score: number | null;
  unscored: boolean;
  satisfied: number;
  partial: number;
  missing: number;
  total: number;
  items: FoundationItemView[];
  gaps: FoundationItemView[];
}

export interface FoundationScoreResult {
  overall: number | null;
  unscoredCategoryCount: number;
  categories: FoundationCategoryScore[];
  topGaps: FoundationItemView[];
  recommendedActions: FoundationItemView[];
  totals: { satisfied: number; partial: number; missing: number; unknown: number; total: number };
}

const SEV_WEIGHT: Record<FoundationItemView['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_FACTOR: Partial<Record<FoundationStatus, number>> = {
  satisfied: 1,
  partial: 0.5,
  missing: 0,
};

const round = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function deriveFoundationScores(
  categories: EffectiveFoundationCategory[],
  items: EffectiveFoundationItem[],
  statuses: VenueFoundationItemStatus[],
): FoundationScoreResult {
  const statusByKey = new Map<string, VenueFoundationItemStatus>();
  for (const s of statuses) statusByKey.set(s.item_key, s);

  const totals = { satisfied: 0, partial: 0, missing: 0, unknown: 0, total: 0 };

  const catScores: FoundationCategoryScore[] = categories.map((cat) => {
    const inCat = items.filter((i) => i.category_key === cat.category_key);
    const itemViews: FoundationItemView[] = inCat.map((i) => {
      const s = statusByKey.get(i.item_key);
      const status: FoundationStatus = s?.status ?? 'unknown';
      totals.total += 1;
      if (status === 'satisfied') totals.satisfied += 1;
      else if (status === 'partial') totals.partial += 1;
      else if (status === 'missing') totals.missing += 1;
      else if (status === 'unknown') totals.unknown += 1;
      return {
        category_key: i.category_key,
        item_key: i.item_key,
        label: i.label,
        description: i.description,
        detection_signal: i.detection_signal,
        is_manual_only: i.is_manual_only,
        severity: i.severity,
        recommended_fix: i.recommended_fix,
        status,
        evidence_url: s?.evidence_url ?? null,
        notes: s?.notes ?? null,
        source: s?.source ?? null,
        detected_at: s?.detected_at ?? null,
      };
    });

    const scored = itemViews.filter(
      (iv) => iv.status === 'satisfied' || iv.status === 'partial' || iv.status === 'missing',
    );

    let score: number | null = null;
    let unscored = true;
    if (scored.length > 0) {
      let num = 0;
      let den = 0;
      for (const iv of scored) {
        const w = SEV_WEIGHT[iv.severity];
        num += w * (STATUS_FACTOR[iv.status] ?? 0);
        den += w;
      }
      if (den > 0) {
        score = round((num / den) * 100);
        unscored = false;
      }
    }

    return {
      category_key: cat.category_key,
      label: cat.label,
      description: cat.description,
      weight: cat.weight,
      score,
      unscored,
      satisfied: itemViews.filter((iv) => iv.status === 'satisfied').length,
      partial: itemViews.filter((iv) => iv.status === 'partial').length,
      missing: itemViews.filter((iv) => iv.status === 'missing').length,
      total: itemViews.length,
      items: itemViews,
      gaps: itemViews.filter((iv) => iv.status === 'missing' || iv.status === 'partial'),
    };
  });

  // Weighted average across scored categories only (honest unscored).
  let weighted = 0;
  let totalW = 0;
  for (const c of catScores) {
    if (c.unscored || c.score === null) continue;
    weighted += c.score * (c.weight ?? 1);
    totalW += c.weight ?? 1;
  }
  const overall = totalW > 0 ? round(weighted / totalW) : null;

  // Top gaps & recommended actions: missing first, then partial, ranked by severity * categoryWeight.
  const rankable = catScores
    .flatMap((c) => c.gaps.map((g) => ({ g, catWeight: c.weight ?? 1 })))
    .map((x) => ({
      ...x,
      rank:
        (SEV_WEIGHT[x.g.severity] ?? 1) * (x.catWeight ?? 1) *
        (x.g.status === 'missing' ? 1 : 0.6),
    }))
    .sort((a, b) => b.rank - a.rank);

  const topGaps = rankable.slice(0, 8).map((x) => x.g);
  const recommendedActions = rankable.slice(0, 5).map((x) => x.g);

  return {
    overall,
    unscoredCategoryCount: catScores.filter((c) => c.unscored).length,
    categories: catScores,
    topGaps,
    recommendedActions,
    totals,
  };
}
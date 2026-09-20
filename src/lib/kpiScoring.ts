/**
 * KPI scoring for non-client projects.
 *
 * A KPI is "not tracked" when either `actual` or `target` is null.
 * Tracked KPIs score 0–100:
 *   higher    → min(actual / target, 1) * 100
 *   lower     → min(target / actual, 1) * 100  (actual 0 scores 100)
 *   checklist → actual treated as percent complete, capped at 100
 *
 * Pillar score = weighted average of tracked KPI scores, with weights
 * renormalized over tracked KPIs only. Pillars with no KPIs stay manual.
 */

export type KpiDirection = 'higher' | 'lower' | 'checklist';

export interface KpiDef {
  pillar_key: string;
  kpi_key: string;
  kpi_label: string;
  weight: number;
  direction: KpiDirection;
  target: number | null;
  unit: string | null;
  source: string;
  sort_order: number;
}

export interface KpiValue {
  pillar_key: string;
  kpi_key: string;
  actual: number | null;
  score: number | null;
  note: string | null;
}

/** Returns 0–100, or null when the KPI is not tracked. */
export function scoreKpi(
  direction: KpiDirection,
  actual: number | null | undefined,
  target: number | null | undefined,
): number | null {
  if (direction === 'checklist') {
    if (actual == null || target == null) return null;
    return Math.max(0, Math.min(Number(actual), 100));
  }
  if (actual == null || target == null) return null;
  const a = Number(actual);
  const t = Number(target);
  if (Number.isNaN(a) || Number.isNaN(t)) return null;

  if (direction === 'lower') {
    if (a === 0) return 100;
    if (t === 0) return 0;
    return Math.max(0, Math.min(t / a, 1) * 100);
  }
  // higher
  if (t === 0) return 0;
  return Math.max(0, Math.min(a / t, 1) * 100);
}

export interface ScoredKpi extends KpiDef {
  actual: number | null;
  note: string | null;
  score: number | null;
  tracked: boolean;
}

export function scoreKpisForPillar(
  defs: KpiDef[],
  values: KpiValue[],
): { kpis: ScoredKpi[]; pillarScore: number | null } {
  const byKey = new Map(values.map((v) => [v.kpi_key, v]));
  const kpis: ScoredKpi[] = defs.map((d) => {
    const v = byKey.get(d.kpi_key);
    const actual = v?.actual == null ? null : Number(v.actual);
    const score = scoreKpi(d.direction, actual, d.target);
    return {
      ...d,
      actual,
      note: v?.note ?? null,
      score,
      tracked: score != null,
    };
  });

  const tracked = kpis.filter((k) => k.tracked);
  if (tracked.length === 0) return { kpis, pillarScore: null };

  const weightSum = tracked.reduce((s, k) => s + Number(k.weight || 0), 0);
  // Fall back to equal weights when every tracked KPI has weight 0.
  const pillarScore =
    weightSum > 0
      ? tracked.reduce((s, k) => s + k.score! * Number(k.weight || 0), 0) / weightSum
      : tracked.reduce((s, k) => s + k.score!, 0) / tracked.length;

  return { kpis, pillarScore };
}

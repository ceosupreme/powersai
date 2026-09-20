import { useEffect, useMemo, useRef } from 'react';
import {
  useProjectPillarScores,
  useUpsertProjectPillarScore,
} from '@/hooks/useProjectPillarScores';
import { useProjectKpis, useProjectKpiValues } from '@/hooks/useProjectKpis';
import { scoreKpisForPillar, ScoredKpi } from '@/lib/kpiScoring';
import { EffectivePillar } from '@/lib/effectivePillars';
import { ManualPillarCard } from './ManualPillarCard';
import { ProjectOneGlance } from './ProjectOneGlance';

interface Props {
  projectId: string;
  weekStart: string;
  pillars: EffectivePillar[];
  canEdit: boolean;
  /** Hide the one-glance sections (e.g. when embedded in a page that has them). */
  showOneGlance?: boolean;
}

/**
 * Dashboard view for non-client projects. Renders one tile per effective
 * pillar — KPI-driven where KPIs are defined, manual entry otherwise.
 * Composite score is the weighted average of present scores; pillars
 * without a score don't contribute.
 */
export const NonClientPillarsDashboard = ({
  projectId,
  weekStart,
  pillars,
  canEdit,
  showOneGlance = true,
}: Props) => {
  const { data: scoreRows = [] } = useProjectPillarScores(projectId, weekStart);
  const { data: kpiDefs = [] } = useProjectKpis(projectId);
  const { data: kpiValues = [] } = useProjectKpiValues(projectId, weekStart);
  const upsertPillar = useUpsertProjectPillarScore();
  const syncedRef = useRef<Set<string>>(new Set());

  const byKey = new Map(scoreRows.map((r) => [r.pillar_key, r]));

  // Per-pillar KPI scoring
  const kpiByPillar = useMemo(() => {
    const map = new Map<string, { kpis: ScoredKpi[]; pillarScore: number | null }>();
    for (const p of pillars) {
      const defs = kpiDefs.filter((d) => d.pillar_key === p.pillar_key);
      if (defs.length === 0) continue;
      const values = kpiValues.filter((v) => v.pillar_key === p.pillar_key);
      map.set(p.pillar_key, scoreKpisForPillar(defs, values));
    }
    return map;
  }, [pillars, kpiDefs, kpiValues]);

  // Keep project_pillar_scores in sync so every screen reading it keeps working.
  useEffect(() => {
    if (!projectId || !weekStart) return;
    for (const [pillarKey, { pillarScore }] of kpiByPillar) {
      if (pillarScore == null) continue;
      const existing = byKey.get(pillarKey)?.score;
      const rounded = Math.round(pillarScore * 100) / 100;
      if (existing != null && Math.abs(Number(existing) - rounded) < 0.01) continue;
      const marker = `${projectId}:${weekStart}:${pillarKey}:${rounded}`;
      if (syncedRef.current.has(marker)) continue;
      syncedRef.current.add(marker);
      upsertPillar.mutate({
        project_id: projectId,
        week_start: weekStart,
        pillar_key: pillarKey,
        score: rounded,
        note: byKey.get(pillarKey)?.note ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, weekStart, kpiByPillar, scoreRows]);

  // Weighted overall across pillars with a score (computed wins over manual)
  const scored = pillars
    .map((p) => ({
      pillar: p,
      score: kpiByPillar.has(p.pillar_key)
        ? kpiByPillar.get(p.pillar_key)!.pillarScore
        : byKey.get(p.pillar_key)?.score ?? null,
    }))
    .filter((x) => x.score != null);
  const weightSum = scored.reduce((s, x) => s + Number(x.pillar.weight || 0), 0);
  const overall =
    weightSum > 0
      ? scored.reduce(
          (s, x) => s + Number(x.score) * Number(x.pillar.weight || 0),
          0,
        ) / weightSum
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-5 bg-[#1e293b] border border-[#334155]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Overall (weighted)
            </p>
            <h2 className="text-3xl font-bold font-mono text-foreground mt-1">
              {overall == null ? '—' : Math.round(overall)}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs text-right">
            Pillar scores come from tracked KPIs where defined, manual entry
            otherwise. Weeks without entries render as empty — never a
            fabricated number.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p) => {
          const row = byKey.get(p.pillar_key);
          const kpi = kpiByPillar.get(p.pillar_key);
          return (
            <ManualPillarCard
              key={p.pillar_key}
              projectId={projectId}
              weekStart={weekStart}
              pillarKey={p.pillar_key}
              pillarLabel={p.pillar_label}
              weight={Number(p.weight)}
              currentScore={row?.score ?? null}
              note={row?.note ?? null}
              canEdit={canEdit}
              kpis={kpi?.kpis ?? []}
              computedScore={kpi?.pillarScore ?? null}
            />
          );
        })}
      </div>

      {showOneGlance && <ProjectOneGlance projectId={projectId} pillars={pillars} />}
    </div>
  );
};

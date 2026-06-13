import { useProjectPillarScores } from '@/hooks/useProjectPillarScores';
import { EffectivePillar } from '@/lib/effectivePillars';
import { ManualPillarCard } from './ManualPillarCard';

interface Props {
  projectId: string;
  weekStart: string;
  pillars: EffectivePillar[];
  canEdit: boolean;
}

/**
 * Dashboard view for non-client projects. Renders one tile per effective
 * pillar; manual entry where data_source is null. Composite score is the
 * weighted average of present scores; pillars without a score don't
 * contribute (so a single missing pillar can't drag the overall to 0).
 */
export const NonClientPillarsDashboard = ({
  projectId,
  weekStart,
  pillars,
  canEdit,
}: Props) => {
  const { data: scoreRows = [] } = useProjectPillarScores(projectId, weekStart);
  const byKey = new Map(scoreRows.map((r) => [r.pillar_key, r]));

  // Weighted overall across pillars with a score
  const scored = pillars
    .map((p) => ({ pillar: p, row: byKey.get(p.pillar_key) }))
    .filter((x) => x.row?.score != null);
  const weightSum = scored.reduce((s, x) => s + Number(x.pillar.weight || 0), 0);
  const overall =
    weightSum > 0
      ? scored.reduce(
          (s, x) => s + Number(x.row!.score) * Number(x.pillar.weight || 0),
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
            Manual pillar scores. Weeks without entries render as empty —
            never a fabricated number.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p) => {
          const row = byKey.get(p.pillar_key);
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
            />
          );
        })}
      </div>
    </div>
  );
};
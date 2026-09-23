import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useUpsertProjectPillarScore } from '@/hooks/useProjectPillarScores';
import { useUpsertProjectKpiValue } from '@/hooks/useProjectKpis';
import { ScoredKpi, scoreKpi } from '@/lib/kpiScoring';
import { toast } from 'sonner';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

interface ManualPillarCardProps {
  projectId: string;
  weekStart: string;
  pillarKey: string;
  pillarLabel: string;
  weight: number;
  currentScore: number | null | undefined;
  note: string | null | undefined;
  canEdit: boolean;
  /** KPI definitions + values for this pillar/week. Empty = pure manual pillar. */
  kpis?: ScoredKpi[];
  /** Weighted score computed from tracked KPIs (null when nothing is tracked). */
  computedScore?: number | null;
}

/**
 * Pillar tile for non-client projects.
 * - Pillars with no KPIs defined stay manual-entry exactly as before.
 * - Pillars with KPIs show a computed score plus an expandable KPI list;
 *   the manual score input is hidden.
 * Never shows a fabricated number — missing data renders as '—'.
 */
export const ManualPillarCard = ({
  projectId,
  weekStart,
  pillarKey,
  pillarLabel,
  weight,
  currentScore,
  note,
  canEdit,
  kpis = [],
  computedScore = null,
}: ManualPillarCardProps) => {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(
    currentScore == null ? '' : String(currentScore),
  );
  const [draftNote, setDraftNote] = useState<string>(note ?? '');
  const upsert = useUpsertProjectPillarScore();

  useEffect(() => {
    setDraft(currentScore == null ? '' : String(currentScore));
    setDraftNote(note ?? '');
  }, [currentScore, note]);

  const save = async () => {
    const num = draft.trim() === '' ? null : Number(draft);
    if (num != null && (Number.isNaN(num) || num < 0 || num > 100)) {
      toast.error('Score must be 0–100');
      return;
    }
    try {
      await upsert.mutateAsync({
        project_id: projectId,
        week_start: weekStart,
        pillar_key: pillarKey,
        score: num,
        note: draftNote.trim() || null,
      });
      toast.success('Saved');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
  };

  const hasKpis = kpis.length > 0;
  const displayScore = hasKpis ? computedScore : (currentScore ?? null);
  const hasScore = displayScore != null;
  const grade = hasScore ? getGradeFromScore(displayScore!) : null;
  const gradeColor = grade ? getGradeColor(grade) : '#6b7280';

  return (
    <div
      className={cn(
        'block rounded-xl p-5 bg-card border border-border text-card-foreground',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-foreground">{pillarLabel}</h3>
          <span className="text-xs text-muted-foreground">
            Weight {weight}
            {hasKpis && ' · computed from KPIs'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: hasScore ? gradeColor : '#475569' }}
          >
            {hasScore ? Math.round(displayScore!) : '—'}
          </span>
          {grade && (
            <span
              className="px-3 py-1 rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: gradeColor }}
            >
              {grade}
            </span>
          )}
        </div>
      </div>

      {note && !editing && (
        <p className="text-xs text-muted-foreground mb-3 italic">"{note}"</p>
      )}

      {hasKpis ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>
                {kpis.filter((k) => k.tracked).length} of {kpis.length} KPIs tracked
              </span>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            {kpis.map((k) => (
              <KpiRow
                key={k.kpi_key}
                kpi={k}
                projectId={projectId}
                weekStart={weekStart}
                canEdit={canEdit}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="0–100"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9"
            />
            <Button size="sm" onClick={save} disabled={upsert.isPending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(currentScore == null ? '' : String(currentScore));
                setDraftNote(note ?? '');
              }}
            >
              Cancel
            </Button>
          </div>
          <Input
            placeholder="Optional note"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            className="h-9"
          />
        </div>
      ) : canEdit ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          className="w-full"
        >
          {hasScore ? 'Update score' : 'Set score'}
        </Button>
      ) : (
        !hasScore && (
          <p className="text-xs text-muted-foreground">No score yet for this week.</p>
        )
      )}
    </div>
  );
};

/** One KPI line: label, inline-editable actual, target, unit, score chip, source. */
const KpiRow = ({
  kpi,
  projectId,
  weekStart,
  canEdit,
}: {
  kpi: ScoredKpi;
  projectId: string;
  weekStart: string;
  canEdit: boolean;
}) => {
  const [value, setValue] = useState(kpi.actual == null ? '' : String(kpi.actual));
  const upsert = useUpsertProjectKpiValue();

  useEffect(() => {
    setValue(kpi.actual == null ? '' : String(kpi.actual));
  }, [kpi.actual]);

  const commit = async () => {
    const trimmed = value.trim();
    const num = trimmed === '' ? null : Number(trimmed);
    if (num != null && Number.isNaN(num)) {
      toast.error('Enter a number');
      setValue(kpi.actual == null ? '' : String(kpi.actual));
      return;
    }
    if (num === kpi.actual) return;
    try {
      await upsert.mutateAsync({
        project_id: projectId,
        week_start: weekStart,
        pillar_key: kpi.pillar_key,
        kpi_key: kpi.kpi_key,
        actual: num,
        score: scoreKpi(kpi.direction, num, kpi.target),
      });
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
      setValue(kpi.actual == null ? '' : String(kpi.actual));
    }
  };

  const unit = kpi.unit ? ` ${kpi.unit}` : '';

  return (
    <div className="flex items-center gap-2 text-xs border-t border-border pt-2">
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate">{kpi.kpi_label}</p>
        <p className="text-muted-foreground">
          Target {kpi.target == null ? '—' : `${kpi.target}${unit}`} ·{' '}
          <span className="capitalize">{kpi.direction}</span>
        </p>
      </div>

      {canEdit ? (
        <Input
          type="number"
          value={value}
          placeholder="—"
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="h-8 w-20 text-xs"
          aria-label={`${kpi.kpi_label} actual`}
        />
      ) : (
        <span className="w-20 text-right font-mono text-foreground">
          {kpi.actual == null ? '—' : `${kpi.actual}${unit}`}
        </span>
      )}

      {kpi.tracked ? (
        <Badge
          variant="outline"
          className="font-mono"
          style={{ borderColor: getGradeColor(getGradeFromScore(kpi.score!)) }}
        >
          {Math.round(kpi.score!)}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Not tracked
        </Badge>
      )}

      <Badge variant="secondary" className="text-[10px] uppercase">
        {kpi.source}
      </Badge>
    </div>
  );
};

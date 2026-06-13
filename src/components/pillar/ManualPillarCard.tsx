import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpsertProjectPillarScore } from '@/hooks/useProjectPillarScores';
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
}

/**
 * Manual-entry pillar tile for non-client projects whose pillar has
 * data_source = null. Empty state when no score has been entered —
 * NEVER shows a fabricated number.
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
}: ManualPillarCardProps) => {
  const [editing, setEditing] = useState(false);
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

  const hasScore = currentScore != null;
  const grade = hasScore ? getGradeFromScore(currentScore!) : null;
  const gradeColor = grade ? getGradeColor(grade) : '#6b7280';

  return (
    <div
      className={cn(
        'block rounded-xl p-5 bg-[#1e293b] border border-[#334155]',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-foreground">{pillarLabel}</h3>
          <span className="text-xs text-muted-foreground">Weight {weight}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-4xl font-bold font-mono"
            style={{ color: hasScore ? gradeColor : '#475569' }}
          >
            {hasScore ? Math.round(currentScore!) : '—'}
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

      {editing ? (
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
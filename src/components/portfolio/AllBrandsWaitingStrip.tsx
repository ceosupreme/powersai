import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { priorityLabel } from '@/hooks/useNextTen';
import { pipelineHref } from '@/lib/ownerWork';
import { TaskExplainer } from '@/components/tasks/TaskExplainer';
import type { BrandWorkCard } from '@/hooks/useBrandWorkspace';

export const PRIORITY_CHIP: Record<number, string> = {
  1: 'bg-destructive/15 text-destructive border-destructive/40',
  2: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  3: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  4: 'bg-muted text-muted-foreground border-border',
  5: 'bg-muted text-muted-foreground border-border',
};

/** Up to 8 owner steps across active brands. */
export function AllBrandsWaitingStrip({
  cards,
  workById,
  onOpenProject,
}: {
  cards: { id: string; name: string }[];
  workById: Map<string, BrandWorkCard> | undefined;
  onOpenProject: (id: string) => void;
}) {
  const navigate = useNavigate();
  if (!workById) return null;
  const rows = cards
    .flatMap((c) => (workById.get(c.id)?.waitingActions ?? []).map((a) => ({ ...a, brand: c.name })))
    .sort((a, b) => a.priorityRank - b.priorityRank)
    .slice(0, 8);

  return (
    <section aria-label="All brands: waiting on you" className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">All brands: waiting on you</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is waiting on you across active brands.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <TaskExplainer
                task={{
                  title: r.title, detail: r.detail, why: r.why, ownerKind: r.ownerKind, minutes: r.minutes,
                  brand: r.brand, priority: priorityLabel(r.priorityRank) === '—' ? null : priorityLabel(r.priorityRank),
                  dueDate: r.dueDate, pillar: r.pillar, status: r.status, projectId: r.projectId,
                }}
                header={<>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.brand}</p>
                  <p className="text-sm text-foreground font-medium">{r.title}</p>
                </>}
                trailing={
                  <Badge variant="outline" className={cn('text-xs shrink-0 mt-2', PRIORITY_CHIP[r.priorityRank])}>
                    {priorityLabel(r.priorityRank) === '—' ? 'No priority' : priorityLabel(r.priorityRank)}
                  </Badge>
                }
                actions={
                  <button
                    type="button"
                    className="mt-1 text-sm text-primary underline underline-offset-2 min-h-11"
                    onClick={() => (r.jobId ? navigate(pipelineHref(r.projectId, r.jobId, r.id)) : onOpenProject(r.projectId))}
                  >
                    {r.jobId ? 'Open the related step and instructions' : 'Open the brand'}
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

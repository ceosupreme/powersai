import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { useUpsertFoundationItemStatus } from '@/hooks/useFoundationItemStatus';
import type { FoundationItemView, FoundationStatus } from '@/components/foundation-audit/deriveFoundationScores';
import { cn } from '@/lib/utils';

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<string, number> = {
  missing: 0,
  unknown: 1,
  partial: 2,
  satisfied: 3,
  not_applicable: 4,
};

const SEV_TONE: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/40',
  high: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  low: 'bg-muted text-muted-foreground border-border',
};

const CONTROLS: { label: string; status: FoundationStatus }[] = [
  { label: 'On', status: 'satisfied' },
  { label: 'Started', status: 'partial' },
  { label: 'Not on yet', status: 'missing' },
  { label: 'Not applicable', status: 'not_applicable' },
];

function LaneRow({
  lane,
  projectId,
  disabled,
}: {
  lane: FoundationItemView;
  projectId: string;
  disabled: boolean;
}) {
  const upsert = useUpsertFoundationItemStatus();
  return (
    <li className="py-3 border-t border-border first:border-0 first:pt-0">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm text-foreground">{lane.label}</p>
          <p className="text-xs text-muted-foreground">
            {lane.recommended_fix || lane.description || 'No first step recorded yet.'}
          </p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] capitalize shrink-0', SEV_TONE[lane.severity])}>
          {lane.severity}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {CONTROLS.map((c) => (
          <Button
            key={c.status}
            size="sm"
            variant={lane.status === c.status ? 'default' : 'outline'}
            className="h-8 text-xs"
            disabled={disabled || upsert.isPending}
            onClick={() =>
              upsert.mutate({
                venue_id: projectId,
                item_key: lane.item_key,
                status: c.status,
                notes: lane.notes,
                evidence_url: lane.evidence_url,
              })
            }
          >
            {c.label}
          </Button>
        ))}
      </div>
    </li>
  );
}

/**
 * Money Lanes — the foundation audit for a non-client project, surfaced on the
 * project page. Nothing is hidden except lanes explicitly marked not applicable.
 */
export const MoneyLanesSection = ({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) => {
  const { result, isLoading } = useFoundationScores(projectId);
  const [naOpen, setNaOpen] = useState(false);

  const { active, notApplicable, onCount, total } = useMemo(() => {
    const all = (result?.categories ?? []).flatMap((c) => c.items);
    const sorted = [...all].sort(
      (a, b) =>
        (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) ||
        (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
        a.label.localeCompare(b.label),
    );
    const na = sorted.filter((i) => i.status === 'not_applicable');
    const act = sorted.filter((i) => i.status !== 'not_applicable');
    return {
      active: act,
      notApplicable: na,
      onCount: act.filter((i) => i.status === 'satisfied').length,
      total: act.length,
    };
  }, [result]);

  const potential = result?.overall ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Money lanes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">
              {potential == null ? '—' : `${potential}%`}
            </span>
            <span className="text-xs text-muted-foreground">
              {onCount} of {total} lanes on
            </span>
          </div>
          <Progress value={potential ?? 0} className="h-2" />
          <p className="text-[11px] text-muted-foreground">Potential — how much of this project's earning setup is live.</p>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading lanes…</p>
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground">No lanes defined for this project type yet.</p>
        ) : (
          <ul>
            {active.map((lane) => (
              <LaneRow key={lane.item_key} lane={lane} projectId={projectId} disabled={!canEdit} />
            ))}
          </ul>
        )}

        {notApplicable.length > 0 && (
          <Collapsible open={naOpen} onOpenChange={setNaOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Not applicable ({notApplicable.length})</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', naOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ul>
                {notApplicable.map((lane) => (
                  <LaneRow key={lane.item_key} lane={lane} projectId={projectId} disabled={!canEdit} />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

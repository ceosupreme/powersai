import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isSnoozed, needsDecision, priorityLabel, priorityRank } from '@/hooks/useNextTen';

export interface WaitingRow {
  id: string;
  title: string;
  priority: string | null;
  priorityRank: number;
  approval_status: string | null;
  status: string | null;
  created_at: string | null;
  due_date: string | null;
  snoozed_until: string | null;
  projectId: string | null;
  projectName: string;
}

/** Badge colors keyed by priority rank (1 = critical … 4 = low). */
const PRIORITY_TONE: Record<number, string> = {
  1: 'bg-destructive/15 text-destructive border-destructive/40',
  2: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  3: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  4: 'bg-muted text-muted-foreground border-border',
};

export const waitingOnMeKey = (ids: string[]) => ['waiting-on-me', ids.join(',')] as const;

/**
 * Open action items across the given projects. Decisions (Proposed, Unreviewed,
 * Pending or no approval state) rank first; completed items never show; snoozed
 * items are returned separately so they can be un-snoozed.
 */
export function useWaitingOnMe(projects: { id: string; name: string }[]) {
  const ids = projects.map((p) => p.id);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  return useQuery({
    queryKey: waitingOnMeKey(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<{ open: WaitingRow[]; snoozed: WaitingRow[] }> => {
      const { data, error } = await supabase
        .from('action_items')
        .select('id,title,priority,approval_status,status,created_at,due_date,snoozed_until,bar_id,venue_id')
        .or(`bar_id.in.(${ids.join(',')}),venue_id.in.(${ids.join(',')})`)
        .neq('status', 'Done')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const now = Date.now();
      const seen = new Set<string>();
      const rows = ((data ?? []) as any[])
        .filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          if (a.approval_status === 'Rejected') return false;
          return a.status !== 'Done';
        })
        .map((a) => {
          const projectId = (a.bar_id ?? a.venue_id) as string | null;
          return {
            id: a.id as string,
            title: (a.title as string) ?? 'Untitled action',
            priority: (a.priority as string) ?? null,
            priorityRank: priorityRank(a.priority),
            approval_status: (a.approval_status as string) ?? null,
            status: (a.status as string) ?? null,
            created_at: (a.created_at as string) ?? null,
            due_date: (a.due_date as string) ?? null,
            snoozed_until: (a.snoozed_until as string) ?? null,
            projectId,
            projectName: (projectId && nameById.get(projectId)) || 'Project',
          } as WaitingRow;
        });
      return {
        open: rows.filter((r) => !isSnoozed(r.snoozed_until, now)),
        snoozed: rows.filter((r) => isSnoozed(r.snoozed_until, now)),
      };
    },
  });
}

type WaitingAction = 'approve' | 'reject' | 'snooze' | 'unsnooze' | 'complete';

function useWaitingMutation(ids: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: WaitingAction }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();
      let patch: Record<string, any> = {};
      if (action === 'approve') {
        patch = { approval_status: 'Approved', approved_at: nowIso, approved_by_id: user?.id ?? null, snoozed_until: null };
      } else if (action === 'reject') {
        patch = { approval_status: 'Rejected' };
      } else if (action === 'snooze') {
        patch = { snoozed_until: new Date(Date.now() + 7 * 86400_000).toISOString() };
      } else if (action === 'unsnooze') {
        patch = { snoozed_until: null };
      } else {
        patch = { status: 'Done', completed_at: nowIso, completed_by: user?.id ?? null };
      }
      const { error } = await supabase.from('action_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: waitingOnMeKey(ids) });
      qc.invalidateQueries({ queryKey: ['next-ten-all'] });
      qc.invalidateQueries({ queryKey: ['next-ten'] });
      qc.invalidateQueries({ queryKey: ['actionItems'] });
      toast.success(
        v.action === 'approve'
          ? 'Approved'
          : v.action === 'reject'
            ? 'Rejected'
            : v.action === 'snooze'
              ? 'Snoozed for a week'
              : v.action === 'unsnooze'
                ? 'Back on the list'
                : 'Marked done',
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not update that item'),
  });
}

function RowActions({
  row,
  onRun,
  busy,
}: {
  row: WaitingRow;
  onRun: (action: WaitingAction) => void;
  busy: boolean;
}) {
  const decision = needsDecision(row.approval_status);
  const snoozed = isSnoozed(row.snoozed_until);
  return (
    <div className="flex flex-wrap gap-1.5">
      {decision && (
        <>
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => onRun('approve')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('reject')}>
            Reject
          </Button>
        </>
      )}
      {snoozed ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('unsnooze')}>
          Un-snooze
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('snooze')}>
          Snooze
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('complete')}>
        Complete
      </Button>
    </div>
  );
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** "Waiting on me" — decisions first, then open work across the chosen projects. */
export const WaitingOnMe = ({ projects }: { projects: { id: string; name: string }[] }) => {
  const ids = projects.map((p) => p.id);
  const { data, isLoading, isError, error, refetch } = useWaitingOnMe(projects);
  const mutation = useWaitingMutation(ids);
  const [showSnoozed, setShowSnoozed] = useState(false);

  const open = data?.open ?? [];
  const snoozed = data?.snoozed ?? [];

  // Decisions first, then priority, then earliest due date, then oldest.
  const ranked = [...open].sort(
    (a, b) =>
      Number(needsDecision(b.approval_status)) - Number(needsDecision(a.approval_status)) ||
      a.priorityRank - b.priorityRank ||
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const decisions = open.filter((r) => needsDecision(r.approval_status)).length;

  const renderRow = (row: WaitingRow, highlight = false) => {
    const due = fmtDate(row.due_date);
    const overdue = row.due_date ? new Date(row.due_date).getTime() < Date.now() - 86400_000 : false;
    return (
      <li
        key={row.id}
        className={cn(
          'py-3 border-t border-border first:border-0 first:pt-0',
          highlight && 'px-3 rounded-md bg-muted/40 border-0 mb-2',
        )}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm text-foreground">{row.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.projectName}
              {needsDecision(row.approval_status) ? ' · needs your decision' : row.approval_status ? ` · ${row.approval_status}` : ''}
              {due ? (
                <span className={cn(overdue && 'text-destructive')}>{` · due ${due}`}</span>
              ) : null}
              {row.snoozed_until ? ` · snoozed until ${fmtDate(row.snoozed_until)}` : ''}
            </p>
          </div>
          {row.priorityRank <= 4 && (
            <Badge variant="outline" className={cn('text-[10px] shrink-0', PRIORITY_TONE[row.priorityRank])}>
              {priorityLabel(row.priorityRank)}
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <RowActions
            row={row}
            busy={mutation.isPending}
            onRun={(action) => mutation.mutate({ id: row.id, action })}
          />
        </div>
      </li>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Waiting on me
          {!isLoading && !isError && open.length > 0 && (
            <span className="ml-2 normal-case tracking-normal text-xs text-muted-foreground">
              {decisions} to decide · {open.length - decisions} to do
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : isError ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>Could not load your action items, so this list is not trustworthy right now.</p>
              <p className="text-xs text-muted-foreground mt-1">{(error as any)?.message}</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : open.length === 0 && snoozed.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing waiting on you right now.</p>
        ) : (
          <>
            {top.length > 0 && (
              <ul className="mb-3">{top.map((row) => renderRow(row, true))}</ul>
            )}
            <ul>{rest.map((row) => renderRow(row))}</ul>
            {snoozed.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSnoozed((v) => !v)}
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showSnoozed && 'rotate-180')} />
                  Snoozed ({snoozed.length})
                </button>
                {showSnoozed && <ul className="mt-2">{snoozed.map((row) => renderRow(row))}</ul>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

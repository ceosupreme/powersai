import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface WaitingRow {
  id: string;
  title: string;
  priority: string | null;
  approval_status: string | null;
  status: string | null;
  created_at: string | null;
  due_date: string | null;
  projectId: string | null;
  projectName: string;
}

const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const PRIORITY_TONE: Record<string, string> = {
  Critical: 'bg-destructive/15 text-destructive border-destructive/40',
  High: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  Medium: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  Low: 'bg-muted text-muted-foreground border-border',
};

export const waitingOnMeKey = (ids: string[]) => ['waiting-on-me', ids.join(',')] as const;

/** Open action items awaiting a decision across the given projects, oldest first. */
export function useWaitingOnMe(projects: { id: string; name: string }[]) {
  const ids = projects.map((p) => p.id);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  return useQuery({
    queryKey: waitingOnMeKey(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<WaitingRow[]> => {
      const { data, error } = await supabase
        .from('action_items')
        .select('id,title,priority,approval_status,status,created_at,due_date,bar_id,venue_id')
        .or(`bar_id.in.(${ids.join(',')}),venue_id.in.(${ids.join(',')})`)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const seen = new Set<string>();
      return ((data ?? []) as any[])
        .filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          if (a.approval_status === 'Rejected') return false;
          const isProposed = a.approval_status === 'Proposed' || a.approval_status === 'Unreviewed';
          const isOpen = a.status !== 'Done';
          return isProposed || isOpen;
        })
        .map((a) => {
          const projectId = (a.bar_id ?? a.venue_id) as string | null;
          return {
            id: a.id as string,
            title: (a.title as string) ?? 'Untitled action',
            priority: (a.priority as string) ?? null,
            approval_status: (a.approval_status as string) ?? null,
            status: (a.status as string) ?? null,
            created_at: (a.created_at as string) ?? null,
            due_date: (a.due_date as string) ?? null,
            projectId,
            projectName: (projectId && nameById.get(projectId)) || 'Project',
          };
        });
    },
  });
}

type WaitingAction = 'approve' | 'reject' | 'snooze' | 'complete';

function useWaitingMutation(ids: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: WaitingAction }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();
      let patch: Record<string, any> = {};
      if (action === 'approve') {
        patch = { approval_status: 'Approved', approved_at: nowIso, approved_by_id: user?.id ?? null };
      } else if (action === 'reject') {
        patch = { approval_status: 'Rejected' };
      } else if (action === 'snooze') {
        patch = { snoozed_until: new Date(Date.now() + 7 * 86400_000).toISOString() };
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
  const needsDecision = row.approval_status === 'Proposed' || row.approval_status === 'Unreviewed';
  return (
    <div className="flex flex-wrap gap-1.5">
      {needsDecision && (
        <>
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => onRun('approve')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('reject')}>
            Reject
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('snooze')}>
        Snooze
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onRun('complete')}>
        Complete
      </Button>
    </div>
  );
}

/** "Waiting on me" — decisions and open work across the chosen projects. */
export const WaitingOnMe = ({ projects }: { projects: { id: string; name: string }[] }) => {
  const ids = projects.map((p) => p.id);
  const { data: rows = [], isLoading } = useWaitingOnMe(projects);
  const mutation = useWaitingMutation(ids);

  const ranked = [...rows].sort(
    (a, b) =>
      (PRIORITY_RANK[a.priority ?? ''] ?? 9) - (PRIORITY_RANK[b.priority ?? ''] ?? 9) ||
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
  const top = ranked.slice(0, 3);
  const topIds = new Set(top.map((r) => r.id));
  const rest = rows.filter((r) => !topIds.has(r.id));

  const renderRow = (row: WaitingRow, highlight = false) => (
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
            {row.approval_status ? ` · ${row.approval_status}` : ''}
            {row.due_date ? ` · due ${row.due_date}` : ''}
          </p>
        </div>
        {row.priority && (
          <Badge variant="outline" className={cn('text-[10px] shrink-0', PRIORITY_TONE[row.priority])}>
            {row.priority}
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Waiting on me
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing waiting on you right now.</p>
        ) : (
          <>
            {top.length > 0 && (
              <ul className="mb-3">{top.map((row) => renderRow(row, true))}</ul>
            )}
            <ul>{rest.map((row) => renderRow(row))}</ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
import { DriveLink } from '@/components/drive/DrivePreview';
import { driveId } from '@/lib/brandDrive';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchActionStatusMap, fetchInactiveJobIds, isSnoozed, needsDecision, priorityLabel, priorityRank } from '@/hooks/useNextTen';
import {
  CHANGES_REQUESTED, approvalKindWord, approvalOpenLink, isApprovalCard, isOwnerVisible,
  parseFacts, pipelineHref, taskLinks,
} from '@/lib/ownerWork';
import { Textarea } from '@/components/ui/textarea';
import { TaskExplainer } from '@/components/tasks/TaskExplainer';
import { useAuth } from '@/context/AuthContext';
import { useAgentDesk } from '@/hooks/useAgentDesk';
import { buildNeedsYou, needsYouActionIds, type AgentHandoffRow } from '@/lib/agentDesk';
import { NeedsYouStrip } from '@/components/agent-desk/AgentDeskSections';
import { AgentDeskTaskSheet } from '@/components/agent-desk/AgentDeskTaskSheet';
import { useDailyPosts } from '@/hooks/useDailyPosts';
import { plainWaitingReason } from '@/lib/dailyPosts';

export interface WaitingRow {
  id: string;
  title: string;
  priority: string | null;
  priorityRank: number;
  approval_status: string | null;
  status: string | null;
  created_at: string | null;
  due_date: string | null;
  detail: string | null;
  source: string | null;
  jobId: string | null;
  sourceStepId: string | null;
  snoozed_until: string | null;
  projectId: string | null;
  projectName: string;
  why: string | null;
  ownerKind: string | null;
  minutes: number | null;
  pillar: string | null;
  facts: string | null;
  outputUrl: string | null;
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
 * Decisions awaiting the owner. Approved work stays in Next 10; snoozed open
 * work is returned separately so it can still be restored.
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
        .select('id,title,detail,insight_summary,problem_detail,estimated_minutes,pillar,source,job_id,facts,output_url,priority,approval_status,status,created_at,due_date,snoozed_until,bar_id,venue_id,owner_kind,depends_on')
        .or(`bar_id.in.(${ids.join(',')}),venue_id.in.(${ids.join(',')})`)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const now = Date.now();
      const seen = new Set<string>();
      const [statusById, inactiveJobIds] = await Promise.all([
        fetchActionStatusMap((data ?? []) as any[]),
        fetchInactiveJobIds((data ?? []) as any[]),
      ]);
      const rows = ((data ?? []) as any[])
        .filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          if (a.job_id && inactiveJobIds.has(a.job_id)) return false;
          if (a.approval_status === 'Rejected') return false;
          if (!isOwnerVisible(a, statusById)) return false;
          return a.status !== 'Done';
        })
        .map((a) => {
          const projectId = (a.bar_id ?? a.venue_id) as string | null;
          let helpFacts: Record<string, unknown> = {};
          if (a.source === 'brand_help') {
            try {
              const parsed = typeof a.facts === 'string' ? JSON.parse(a.facts) : a.facts;
              helpFacts = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
            } catch { /* Legacy non-JSON notes do not have a linked source step. */ }
          }
          return {
            id: a.id as string,
            title: (a.title as string) ?? 'Untitled action',
            priority: (a.priority as string) ?? null,
            priorityRank: priorityRank(a.priority),
            approval_status: (a.approval_status as string) ?? null,
            status: (a.status as string) ?? null,
            created_at: (a.created_at as string) ?? null,
            due_date: (a.due_date as string) ?? null,
            detail: (a.detail as string) ?? null,
            source: (a.source as string) ?? null,
            jobId: a.source === 'brand_help'
              ? (typeof helpFacts.source_job_id === 'string' ? helpFacts.source_job_id : null)
              : (a.job_id as string) ?? null,
            sourceStepId: a.source === 'brand_help'
              ? (typeof helpFacts.source_step_id === 'string' ? helpFacts.source_step_id : null)
              : (a.job_id ? a.id as string : null),
            snoozed_until: (a.snoozed_until as string) ?? null,
            projectId,
            projectName: (projectId && nameById.get(projectId)) || 'Project',
            why: (a.insight_summary || a.problem_detail || null) as string | null,
            ownerKind: (a.owner_kind as string) ?? null,
            minutes: (a.estimated_minutes as number) ?? null,
            pillar: (a.pillar as string) ?? null,
            facts: typeof a.facts === 'string' ? a.facts : null,
            outputUrl: (a.output_url as string) ?? null,
          } as WaitingRow;
        });
      return {
        open: rows.filter((r) => needsDecision(r.approval_status) && !isSnoozed(r.snoozed_until, now)),
        snoozed: rows.filter((r) => isSnoozed(r.snoozed_until, now)),
      };
    },
  });
}

type WaitingAction = 'approve' | 'reject' | 'snooze' | 'unsnooze' | 'changes';

function useWaitingMutation(ids: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, card, note }: { id: string; action: WaitingAction; card?: boolean; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();
      let patch: Record<string, any> = {};
      if (action === 'approve') {
        patch = { approval_status: 'Approved', approved_at: nowIso, approved_by_id: user?.id ?? null, snoozed_until: null };
        // An approval card has no further step for the owner: the OK is the whole job.
        if (card) patch = { ...patch, status: 'Done', completed_at: nowIso };
      } else if (action === 'reject') {
        patch = { approval_status: 'Rejected' };
        if (card) patch = { ...patch, rejected_at: nowIso, rejected_by_id: user?.id ?? null, rejection_reason: note?.trim() || null };
      } else if (action === 'changes') {
        // Sent back with notes: it leaves the owner's lists and becomes the reviser's work.
        patch = { approval_status: CHANGES_REQUESTED, feedback_note: note?.trim() || null, owner_kind: 'claude', snoozed_until: null };
      } else if (action === 'snooze') {
        patch = { snoozed_until: new Date(Date.now() + 7 * 86400_000).toISOString() };
      } else if (action === 'unsnooze') {
        patch = { snoozed_until: null };
      }
      const { data, error } = await supabase.from('action_items').update(patch)
        .eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This decision was not saved. The task may be unavailable or your access may have changed.');
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
            : v.action === 'changes'
              ? 'Sent back with your notes'
              : v.action === 'snooze'
                ? 'Snoozed for a week'
                : 'Back on the list',
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
    </div>
  );
}

/** Open the piece, then approve it, send it back with notes, or turn it down. */
function ApprovalActions({
  row, busy, onRun,
}: {
  row: WaitingRow;
  busy: boolean;
  onRun: (action: WaitingAction, note?: string) => void;
}) {
  const [mode, setMode] = useState<'changes' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const open = approvalOpenLink(taskLinks({
    title: row.title, detail: row.detail, why: row.why, facts: row.facts, outputUrl: row.outputUrl,
  }));
  return (
    <div className="mt-2 space-y-2">
      {open && (driveId(open.url) ? <DriveLink href={open.url} projectId={row.projectId ?? undefined}>{open.label}</DriveLink> : (
        <a
          href={open.url}
          target={open.internal ? undefined : '_blank'}
          rel="noreferrer"
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20"
        >
          {open.label}<ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
        </a>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <Button className="min-h-11" disabled={busy} onClick={() => onRun('approve')}>Approve</Button>
        <Button variant="outline" className="min-h-11" disabled={busy}
          onClick={() => setMode((m) => (m === 'changes' ? null : 'changes'))}>Change it</Button>
        <Button variant="outline" className="min-h-11" disabled={busy}
          onClick={() => setMode((m) => (m === 'reject' ? null : 'reject'))}>No</Button>
      </div>
      {!mode && !isSnoozed(row.snoozed_until) && (
        <button type="button" className="min-h-11 text-sm text-muted-foreground underline" disabled={busy}
          onClick={() => onRun('snooze')}>
          Not now, ask me again in a week
        </button>
      )}
      {mode && (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-base"
            rows={3}
            placeholder={mode === 'changes' ? 'What should change?' : 'Why not? (optional)'}
          />
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={busy || (mode === 'changes' && !note.trim())}
              onClick={() => onRun(mode, note)}>
              {mode === 'changes' ? 'Send it back' : 'Turn it down'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** "Waiting on me" contains decisions; approved execution lives in Next 10. */
export const WaitingOnMe = ({ projects }: { projects: { id: string; name: string }[] }) => {
  const ids = projects.map((p) => p.id);
  const { data, isLoading, isError, error, refetch } = useWaitingOnMe(projects);
  const mutation = useWaitingMutation(ids);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const { isAdmin } = useAuth();
  const desk = useAgentDesk();
  const dailyPosts = useDailyPosts(projects.map((p) => p.id));
  const waitingDailyPosts = (dailyPosts.data ?? []).filter((p) => p.post_status === 'waiting_on_owner');
  const asks = buildNeedsYou(desk.rows).filter(i => !i.brandIds.length || i.brandIds.some(id => ids.includes(id)));
  const linkedIds = needsYouActionIds(asks);
  const [selectedAgentRow, setSelectedAgentRow] = useState<AgentHandoffRow | null>(null);
  const [answerMode, setAnswerMode] = useState(false);
  const brandNames = new Map(desk.brands.map(b => [b.id, b.name]));

  const open = (data?.open ?? []).filter(r => !linkedIds.has(r.id));
  const snoozed = (data?.snoozed ?? []).filter(r => !linkedIds.has(r.id));

  // Decisions first, then priority, then earliest due date, then oldest.
  const ranked = [...open].sort(
    (a, b) =>
      Number(needsDecision(b.approval_status)) - Number(needsDecision(a.approval_status)) ||
      a.priorityRank - b.priorityRank ||
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
  // Scripts, ideas and other pieces waiting for an OK come first, in their own group.
  const approvals = ranked.filter(isApprovalCard);
  const others = ranked.filter((r) => !isApprovalCard(r));
  const top = others.slice(0, 3);
  const rest = others.slice(3);
  const decisions = others.filter((r) => needsDecision(r.approval_status)).length;

  const renderApproval = (row: WaitingRow) => {
    const { facts } = parseFacts(row.facts);
    const since = fmtDate(row.created_at);
    return (
      <li key={row.id} className="mb-2 rounded-md border border-primary/30 bg-primary/5 p-3">
        <TaskExplainer
          task={{
            title: row.title,
            detail: row.detail,
            why: row.why,
            ownerKind: row.ownerKind,
            minutes: row.minutes,
            brand: row.projectName,
            status: 'Needs your OK',
            projectId: row.projectId,
            facts: row.facts,
            outputUrl: row.outputUrl,
            hideYourPart: true,
          }}
          header={
            <div className="min-w-0">
              <p className="text-sm text-foreground font-medium">
                <Badge variant="outline" className="mr-2 text-xs border-primary/40 text-primary">{approvalKindWord(facts)}</Badge>
                {row.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {row.projectName}
                {row.minutes ? ` · about ${row.minutes} min to review` : ''}
                {since ? ` · waiting since ${since}` : ''}
              </p>
            </div>
          }
          actions={
            <ApprovalActions
              row={row}
              busy={mutation.isPending}
              onRun={(action, note) => mutation.mutate({ id: row.id, action, card: true, note })}
            />
          }
        />
      </li>
    );
  };

  const renderRow = (row: WaitingRow, highlight = false, defaultOpen = false) => {
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
        <TaskExplainer
          defaultOpen={defaultOpen}
          task={{
            title: row.title,
            detail: row.source === 'brand_help' ? null : row.detail,
            why: row.why,
            ownerKind: row.ownerKind,
            minutes: row.minutes,
            brand: row.projectName,
            priority: row.priorityRank <= 4 ? priorityLabel(row.priorityRank) : null,
            dueDate: row.due_date,
            pillar: row.pillar,
            status: needsDecision(row.approval_status) ? 'Needs your decision' : row.approval_status ?? row.status,
            jobId: row.jobId,
            stepId: row.source === 'brand_help' ? null : row.id,
            projectId: row.projectId,
            facts: row.source === 'brand_help' ? null : row.facts,
            outputUrl: row.outputUrl,
          }}
          header={
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm text-foreground font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">
                  {row.projectName}
                  {needsDecision(row.approval_status) ? ' · needs your decision' : row.approval_status ? ` · ${row.approval_status}` : ''}
                  {due ? (
                    <span className={cn(overdue && 'text-destructive')}>{` · due ${due}`}</span>
                  ) : null}
                  {row.snoozed_until ? ` · snoozed until ${fmtDate(row.snoozed_until)}` : ''}
                </p>
              </div>
              {row.priorityRank <= 4 && (
                <Badge variant="outline" className={cn('text-xs shrink-0', PRIORITY_TONE[row.priorityRank])}>
                  {priorityLabel(row.priorityRank)}
                </Badge>
              )}
            </div>
          }
          actions={<>
            {row.source === 'brand_help' && row.detail && (
              <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                <p className="font-medium text-xs mb-1">Message from the brand manager</p>
                {row.detail}
              </div>
            )}
            {row.projectId && row.jobId && (
              <Link className="mt-2 inline-flex text-sm text-primary underline"
                to={pipelineHref(row.projectId, row.jobId, row.sourceStepId)}>
                Open the related step and instructions
              </Link>
            )}
            {row.source === 'brand_help' && row.projectId && !row.jobId && (
              <Link className="mt-2 inline-flex text-sm text-primary underline" to={`/project/${row.projectId}`}>
                Open the related brand
              </Link>
            )}
            <div className="mt-2">
              <RowActions
                row={row}
                busy={mutation.isPending}
                onRun={(action) => mutation.mutate({ id: row.id, action })}
              />
            </div>
          </>}
        />
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
              {[approvals.length ? `${approvals.length} to approve` : null, decisions ? `${decisions} to decide` : null]
                .filter(Boolean).join(' · ')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {desk.error ? <p role="alert" className="text-sm text-destructive">Agent asks could not be loaded. <Button variant="outline" onClick={() => desk.refetch()}>Try again</Button></p> :
          desk.isLoading ? <p className="text-sm text-muted-foreground">Checking agent asks…</p> :
          <NeedsYouStrip items={asks} brandNames={brandNames} isAdmin={isAdmin}
            onAnswer={r => { setSelectedAgentRow(r); setAnswerMode(true); }}
            onSelect={r => { setSelectedAgentRow(r); setAnswerMode(false); }} />}
        {waitingDailyPosts.length > 0 && (
          <div className="mb-3 space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Daily posts waiting on you ({waitingDailyPosts.length})
            </p>
            <ul className="space-y-1.5">
              {waitingDailyPosts.map((p) => (
                <li key={p.id} className="text-sm flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong className="font-medium text-foreground">{p.brand_name}</strong> ({p.post_date}): {plainWaitingReason(p.waiting_reason, p.waiting_detail)}
                  </span>
                  <Link to={`/projects/${p.project_id}`} className="text-xs text-primary underline shrink-0">
                    Open brand
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          !asks.length && !desk.isLoading && !desk.error ? <p className="text-xs text-muted-foreground">No decisions waiting on you right now.</p> : null
        ) : (
          <>
            {approvals.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Scripts and content to approve</p>
                <ul>{approvals.map(renderApproval)}</ul>
                {others.length > 0 && <p className="mt-4 text-sm font-semibold text-foreground">Other decisions</p>}
              </div>
            )}
            {top.length > 0 && (
              <ul className="mb-3">{top.map((row, i) => renderRow(row, true, i === 0 && approvals.length === 0))}</ul>
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
                {showSnoozed && <ul className="mt-2">{snoozed.map((row) => (isApprovalCard(row) ? renderApproval(row) : renderRow(row)))}</ul>}
              </div>
            )}
          </>
        )}
      </CardContent>
      <AgentDeskTaskSheet row={desk.rows.find(r => r.id === selectedAgentRow?.id) ?? selectedAgentRow} historyRows={[]} brandNames={brandNames}
        isAdmin={isAdmin} actions={desk.actions} initialAction={answerMode ? 'answer' : null} onClose={() => setSelectedAgentRow(null)} />
    </Card>
  );
};

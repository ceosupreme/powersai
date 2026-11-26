import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bot, Search, RefreshCw, Share2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAgentDesk, useAgentTaskSheet } from '@/hooks/useAgentDesk';
import { useCrewStatus, needsALook } from '@/components/admin/CrewActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AGENTS, agentLabel, buildNeedsYou, groupFailures, isHistoryRow, isSocialPost,
  isStuck, socialPostState, statusLabel, isFinishedWork, finishedAt, type AgentHandoffRow,
} from '@/lib/agentDesk';
import {
  AgentCardsRow, NeedsYouStrip, RecentlyFinishedSection, RepeatingJobsSection, StuckAndLateSection,
} from '@/components/agent-desk/AgentDeskSections';
import { AgentDeskPostsView } from '@/components/agent-desk/AgentDeskPostsView';
import { AgentDeskTaskSheet } from '@/components/agent-desk/AgentDeskTaskSheet';

const MY_AGENT_KEY = 'agent_desk_my_agent';

export default function AgentDesk() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rows, brands, isLoading, error, refetch, actions } = useAgentDesk();
  const { data: crews } = useCrewStatus(isAdmin);

  const [view, setView] = useState<'desk' | 'posts'>('desk');
  const [myAgent, setMyAgent] = useState<string>(() => localStorage.getItem(MY_AGENT_KEY) || 'all');
  const [brandFilter, setBrandFilter] = useState<string>(() => searchParams.get('brand') || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('task'));
  const [sheetAction, setSheetAction] = useState<'answer' | 'posted' | null>(null);
  const selected = useAgentTaskSheet(selectedId);
  useEffect(() => { setBrandFilter(searchParams.get('brand') || 'all'); setSelectedId(searchParams.get('task')); }, [searchParams]);

  useEffect(() => { localStorage.setItem(MY_AGENT_KEY, myAgent); }, [myAgent]);

  const brandNames = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  const workRows = useMemo(() => rows.filter((r) => !isHistoryRow(r)), [rows]);
  const historyByParent = useMemo(() => {
    const m = new Map<string, AgentHandoffRow[]>();
    for (const r of rows) {
      if (isHistoryRow(r) && r.parent_id) {
        const list = m.get(r.parent_id) ?? [];
        list.push(r);
        m.set(r.parent_id, list);
      }
    }
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workRows.filter((r) => {
      if (myAgent !== 'all' && r.to_agent !== myAgent && r.from_agent !== myAgent) return false;
      if (brandFilter !== 'all' && !(r.brand_ids ?? []).includes(brandFilter)) return false;
      if (statusFilter !== 'all' && statusLabel(r) !== statusFilter) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workRows, myAgent, brandFilter, statusFilter, query]);

  const socialPosts = useMemo(() => filtered.filter(isSocialPost), [filtered]);
  const madeNotPostedCount = useMemo(
    () => filtered.filter((r) => isSocialPost(r) && socialPostState(r) === 'made_not_posted').length,
    [filtered]
  );

  const needsYou = useMemo(() => buildNeedsYou(filtered), [filtered]);
  const stuckRows = useMemo(() => filtered.filter((r) => isStuck(r)), [filtered]);
  const failureGroups = useMemo(() => groupFailures(stuckRows.filter((r) => r.status === 'failed')), [stuckRows]);
  const otherStuck = useMemo(() => stuckRows.filter((r) => r.status !== 'failed'), [stuckRows]);
  const repeating = useMemo(() => filtered.filter((r) => r.kind === 'standing_task' && r.status === 'active'), [filtered]);
  const recentlyFinished = useMemo(
    () => filtered
      .filter((r) => isFinishedWork(r) && (finishedAt(r) ?? '') >= new Date(Date.now() - 60 * 86400_000).toISOString())
      .sort((a, b) => (finishedAt(b) ?? '').localeCompare(finishedAt(a) ?? '')),
    [filtered]
  );

  const selectedRow = selected.row ?? rows.find((r) => r.id === selectedId) ?? null;
  const openSheet = (row: AgentHandoffRow, action: 'answer' | 'posted' | null = null) => {
    setSelectedId(row.id);
    setSheetAction(action);
  };
  const closeSheet = () => {
    setSelectedId(null);
    setSheetAction(null);
    if (searchParams.has('task')) { searchParams.delete('task'); setSearchParams(searchParams, { replace: true }); }
  };

  const crewsCount = crews?.length ?? 0;
  const crewsBad = (crews ?? []).filter((c) => needsALook(c.state)).length;

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />Agent Desk
          </h1>
          {isAdmin && crewsCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <Link to="/admin?tab=crews" className="hover:underline">
                {crewsBad === 0
                  ? `All ${crewsCount} scheduled runs ran`
                  : `${crewsBad} of ${crewsCount} scheduled runs need a look`}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {madeNotPostedCount > 0 && (
            <Button size="sm" variant={view === 'posts' ? 'default' : 'outline'} onClick={() => setView('posts')}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              {madeNotPostedCount} made, not posted
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
          <Button size="sm" variant={view === 'desk' ? 'secondary' : 'ghost'} className="h-8" onClick={() => setView('desk')}>Desk</Button>
          <Button size="sm" variant={view === 'posts' ? 'secondary' : 'ghost'} className="h-8 gap-1.5" onClick={() => setView('posts')}>
            Social posts
            {madeNotPostedCount > 0 && <Badge variant="default" className="text-[11px] px-1.5 py-0">{madeNotPostedCount}</Badge>}
          </Button>
        </div>

        <Select value={myAgent} onValueChange={setMyAgent}>
          <SelectTrigger className="w-[165px] h-9 text-xs"><SelectValue placeholder="Show my tasks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {AGENTS.map((a) => <SelectItem key={a} value={a}>My tasks: {agentLabel(a)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="All brands" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[155px] h-9 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['Needs you', 'Working on it', 'Waiting to start', 'Failed', 'Made, not posted', 'Posted', 'Finished', 'Repeating', 'Cancelled'].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title..." className="pl-8 h-9 text-xs" />
        </div>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">Agent work could not be loaded. <Button variant="outline" onClick={() => refetch()}>Try again</Button></p> : isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : view === 'posts' ? (
        <AgentDeskPostsView posts={socialPosts} brandNames={brandNames} isAdmin={isAdmin} onSelect={(r, act) => openSheet(r, act ?? null)} />
      ) : (
        <div className="space-y-6">
          <NeedsYouStrip items={needsYou} brandNames={brandNames} isAdmin={isAdmin} onAnswer={(r) => openSheet(r, 'answer')} onSelect={(r) => openSheet(r)} />
          <AgentCardsRow rows={filtered} selectedAgent={myAgent} onPickAgent={setMyAgent} />
          <StuckAndLateSection
            failureGroups={failureGroups}
            otherStuck={otherStuck}
            brandNames={brandNames}
            isAdmin={isAdmin}
            retrying={actions.retryGroup.isPending}
            onRetryGroup={(ids) => actions.retryGroup.mutate({ ids })}
            onSelect={(r) => openSheet(r)}
          />
          <RepeatingJobsSection rows={repeating} onSelect={(r) => openSheet(r)} />
          <RecentlyFinishedSection rows={recentlyFinished} brandNames={brandNames} onSelect={(r) => openSheet(r)} />
        </div>
      )}

      <AgentDeskTaskSheet
        row={selectedRow}
        historyRows={selectedRow ? (historyByParent.get(selectedRow.id) ?? []) : []}
        brandNames={brandNames}
        isAdmin={isAdmin}
        actions={actions}
        initialAction={sheetAction}
        onClose={closeSheet}
      />
    </div>
  );
}
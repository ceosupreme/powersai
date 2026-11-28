import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MineProspectsCard } from '@/components/prospects/MineProspectsCard';
import { ProspectCheckupDialog } from '@/components/prospects/ProspectCheckupDialog';
import { FirstTouchDialog } from '@/components/prospects/FirstTouchDialog';
import { LeadList } from '@/components/prospects/LeadList';
import { LeadBoard } from '@/components/prospects/LeadBoard';
import { LeadDetailSheet } from '@/components/prospects/LeadDetailSheet';
import { AddLeadDialog } from '@/components/prospects/AddLeadDialog';
import { MyNextLead } from '@/components/prospects/MyNextLead';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { useLeadPeople, useMinerRuns, useProspects, useProspectMutations, type Prospect, type ProspectStatus } from '@/hooks/useProspects';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, KanbanSquare, List, Plus, Search } from 'lucide-react';
import {
  DEFAULT_FILTERS, LEAD_STAGES, filterLeads, sortLeads, sourceLabel, stageLabel, type LeadFilters, type LeadStage,
} from '@/lib/leads';
import { exportLeadsCsv, exportLeadsPdf } from '@/lib/leadExport';

export default function ProspectDock() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: runs = [] } = useMinerRuns(3);
  const { data: types = [] } = useProjectTypes();
  const { data: team = [] } = useLeadPeople();
  const people = useMemo(() => team.filter((x) => x.active), [team]);
  const { promote, moveStage } = useProspectMutations();
  const { user, isAdmin, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab,setTab]=useState(isAdmin?'all':'next');
  useEffect(()=>{setTab(isAdmin?'all':'next');},[isAdmin]);

  const [view, setView] = useState<'list' | 'board'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'board'));
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [assignedTouched, setAssignedTouched] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get('lead'));
  const [findOpen, setFindOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [checkupFor, setCheckupFor] = useState<Prospect | null>(null);
  const [draftFor, setDraftFor] = useState<Prospect | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // All leads remain shared; personal queue priority is not an access filter.
  const effective = useMemo<LeadFilters>(
    () => filters,
    [filters, assignedTouched, isAdmin],
  );
  const setF = <K extends keyof LeadFilters>(k: K, v: LeadFilters[K]) => {
    if (k === 'assigned') setAssignedTouched(true);
    setFilters({ ...effective, [k]: v });
  };

  useEffect(() => {
    const q = params.get('lead');
    if (q && q !== openId) setOpenId(q);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const names = useMemo(() => {
    const m: Record<string, string> = Object.fromEntries(team.map((p) => [p.id, p.name]));
    if (user?.id && !m[user.id]) m[user.id] = profile?.full_name || profile?.email || 'You';
    return m;
  }, [team, user?.id, profile?.full_name, profile?.email]);

  const nicheLabels = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t.label])), [types]);
  const sources = useMemo(() => [...new Set(prospects.map((p) => sourceLabel(p.source, p.platform)))].sort(), [prospects]);
  const offers = useMemo(() => [...new Set(prospects.map((p) => p.offer).filter(Boolean) as string[])].sort(), [prospects]);
  const visible = useMemo(() => sortLeads(filterLeads(prospects, effective, user?.id ?? null)), [prospects, effective, user?.id]);
  const open = prospects.find((p) => p.id === openId) ?? null;

  const openLead = (p: Prospect | null) => {
    setOpenId(p?.id ?? null);
    const next = new URLSearchParams(params);
    if (p) next.set('lead', p.id); else next.delete('lead');
    setParams(next, { replace: true });
  };

  const move = (p: Prospect, stage: LeadStage) =>
    moveStage.mutate(
      { id: p.id, status: stage as ProspectStatus, label: stageLabel(stage) },
      {
        onSuccess: () => toast({ title: `Moved to ${stageLabel(stage)}` }),
        onError: (e: any) => toast({ title: 'Could not move', description: e?.message, variant: 'destructive' }),
      },
    );

  const doPromote = (p: Prospect) => {
    setBusyId(p.id);
    promote.mutate(p, {
      onSuccess: () => { setBusyId(null); toast({ title: 'Sent to the CRM pipeline' }); },
      onError: (e: any) => { setBusyId(null); toast({ title: 'Could not send to CRM', description: e?.message, variant: 'destructive' }); },
    });
  };

  const lastRun = runs[0];
  const sel = 'h-10 w-full sm:w-auto sm:min-w-36';

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 md:pb-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">Every lead from every source, with its stage and everything we know.</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11" disabled={!visible.length}><Download className="mr-1.5 h-4 w-4" />Export<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportLeadsCsv(visible, names)}>CSV spreadsheet</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportLeadsPdf(visible, names)}>PDF call sheet</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="h-11" onClick={() => setAddOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add lead</Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="next">My next lead</TabsTrigger><TabsTrigger value="all">All leads</TabsTrigger></TabsList></Tabs>
      {tab==='next'?<MyNextLead leads={prospects} names={names} onOpen={openLead} />:<>

      <Collapsible open={findOpen} onOpenChange={setFindOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-10 px-2 -ml-2">
            <ChevronDown className={`mr-1.5 h-4 w-4 transition-transform ${findOpen ? '' : '-rotate-90'}`} />Find leads on Google
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <MineProspectsCard />
          {lastRun && (
            <p className="text-xs text-muted-foreground">
              Last run: {nicheLabels[lastRun.niche ?? ''] ?? lastRun.niche} · {lastRun.city} · {lastRun.found} found · {lastRun.kept} kept · {lastRun.checked} checked · {lastRun.status}
              {lastRun.error ? ` · ${lastRun.error}` : ''}
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={effective.search} onChange={(e) => setF('search', e.target.value)} placeholder="Search name, contact, city or what they said" className="h-11 pl-9 text-base" aria-label="Search leads" />
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as 'list' | 'board')} variant="outline" className="justify-start">
            <ToggleGroupItem value="list" className="h-11 px-4" aria-label="List view"><List className="mr-1.5 h-4 w-4" />List</ToggleGroupItem>
            <ToggleGroupItem value="board" className="h-11 px-4" aria-label="Board view"><KanbanSquare className="mr-1.5 h-4 w-4" />Board</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select value={effective.stage} onValueChange={(v) => setF('stage', v as LeadFilters['stage'])}>
            <SelectTrigger className={sel} aria-label="Stage"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All stages</SelectItem>{LEAD_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effective.source} onValueChange={(v) => setF('source', v)}>
            <SelectTrigger className={sel} aria-label="Source"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All sources</SelectItem>{sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effective.offer} onValueChange={(v) => setF('offer', v)}>
            <SelectTrigger className={sel} aria-label="Offer"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All offers</SelectItem>{offers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effective.assigned} onValueChange={(v) => setF('assigned', v)}>
            <SelectTrigger className={sel} aria-label="Assigned to"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {people.filter((x) => x.id !== user?.id).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={effective.outreach} onValueChange={(v) => setF('outreach', v as LeadFilters['outreach'])}>
            <SelectTrigger className={sel} aria-label="Outreach"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Manual and Auto</SelectItem><SelectItem value="manual">Manual</SelectItem><SelectItem value="auto">Auto</SelectItem></SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length} of {prospects.length} lead{prospects.length === 1 ? '' : 's'} showing
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading leads…</p>
      ) : !visible.length ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {prospects.length ? 'No leads match these filters.' : 'No leads yet. Add one, or open "Find leads on Google".'}
        </CardContent></Card>
      ) : view === 'board' ? (
        <LeadBoard leads={visible} names={names} onOpen={openLead} onMove={move} />
      ) : (
        <LeadList leads={visible} names={names} onOpen={openLead} />
      )}

      </>}
      <LeadDetailSheet
        prospect={open} people={people} names={names} busy={busyId === open?.id}
        onOpenChange={(v) => !v && openLead(null)} onMove={move}
        onCheckup={setCheckupFor} onDraft={setDraftFor} onPromote={doPromote}
      />
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onAdded={(id) => { setOpenId(id); }} />
      <ProspectCheckupDialog prospect={checkupFor} onOpenChange={(v) => !v && setCheckupFor(null)} />
      <FirstTouchDialog prospect={draftFor} onOpenChange={(v) => !v && setDraftFor(null)} />
    </div>
  );
}

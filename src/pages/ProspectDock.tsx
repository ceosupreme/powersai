import { useMemo, useState } from 'react';
import { MineProspectsCard } from '@/components/prospects/MineProspectsCard';
import { ProspectDockList } from '@/components/prospects/ProspectDockList';
import { ProspectCheckupDialog } from '@/components/prospects/ProspectCheckupDialog';
import { FirstTouchDialog } from '@/components/prospects/FirstTouchDialog';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { useMinerRuns, useProspects, useProspectMutations, type Prospect } from '@/hooks/useProspects';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'checked', label: 'Checked' },
  { key: 'promoted', label: 'Promoted' },
  { key: 'all', label: 'All' },
] as const;

export default function ProspectDock() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: runs = [] } = useMinerRuns(3);
  const { data: types = [] } = useProjectTypes();
  const { promote, setStatus } = useProspectMutations();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active');
  const [checkupFor, setCheckupFor] = useState<Prospect | null>(null);
  const [draftFor, setDraftFor] = useState<Prospect | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nicheLabels = useMemo(
    () => Object.fromEntries(types.map((t) => [t.id, t.label])),
    [types],
  );

  const visible = useMemo(() => {
    const rows = prospects.filter((p) => {
      if (filter === 'all') return true;
      if (filter === 'checked') return p.status === 'checked';
      if (filter === 'promoted') return p.status === 'promoted';
      return p.status !== 'dead' && p.status !== 'promoted';
    });
    return [...rows].sort((a, b) => (b.leak_total ?? -1) - (a.leak_total ?? -1));
  }, [prospects, filter]);

  const lastRun = runs[0];

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-24 md:pb-6 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold">Prospect Dock</h1>
        <p className="text-sm text-muted-foreground">
          Cold businesses mined from Google, ranked by estimated monthly leak.
        </p>
      </header>

      <MineProspectsCard />

      {lastRun && (
        <p className="text-xs text-muted-foreground">
          Last run: {nicheLabels[lastRun.niche ?? ''] ?? lastRun.niche} · {lastRun.city} ·{' '}
          {lastRun.found} found · {lastRun.kept} kept · {lastRun.checked} checked · {lastRun.status}
          {lastRun.error ? ` · ${lastRun.error}` : ''}
        </p>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key} className="text-xs">{f.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading prospects…</p>
      ) : (
        <ProspectDockList
          prospects={visible}
          nicheLabels={nicheLabels}
          busyId={busyId}
          onOpenCheckup={setCheckupFor}
          onDraft={setDraftFor}
          onMarkDead={(p) =>
            setStatus.mutate(
              { id: p.id, status: 'dead' },
              { onError: (e: any) => toast({ title: 'Update failed', description: e?.message, variant: 'destructive' }) },
            )
          }
          onPromote={(p) => {
            setBusyId(p.id);
            promote.mutate(p, {
              onSuccess: (r) => {
                setBusyId(null);
                toast({
                  title: 'Promoted to CRM',
                  description: `Company ${r.company_id.slice(0, 8)}… created${r.lead_id ? ` from lead ${r.lead_id.slice(0, 8)}…` : ''}`,
                });
              },
              onError: (e: any) => {
                setBusyId(null);
                toast({ title: 'Promote failed', description: e?.message, variant: 'destructive' });
              },
            });
          }}
        />
      )}

      <ProspectCheckupDialog prospect={checkupFor} onOpenChange={(v) => !v && setCheckupFor(null)} />
      <FirstTouchDialog prospect={draftFor} onOpenChange={(v) => !v && setDraftFor(null)} />
    </div>
  );
}
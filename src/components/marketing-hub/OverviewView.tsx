import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useCampaignStore } from './useCampaignStore';
import { StatusBadge, OriginBadge, SyncStatusBadge } from './badges';
import {
  Activity, CalendarClock, CheckCircle2, AlertTriangle, Trophy, DollarSign,
  Plus, RefreshCw, AlertCircle,
} from 'lucide-react';
import { NewCampaignDialog } from './NewCampaignDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const fmt$ = (n?: number | null) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString()}`;

const KpiTile = ({
  icon: Icon, label, value, hint, accent = 'text-foreground',
}: { icon: any; label: string; value: string; hint?: string; accent?: string }) => (
  <Card className="p-4 flex items-start gap-3">
    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><Icon className="w-4 h-4" /></div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${accent}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  </Card>
);

const dateRange = (a: string, b: string) =>
  `${new Date(a + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(b + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

export const OverviewView = ({ onOpen }: { onOpen: (id: string) => void }) => {
  const { campaigns, refresh } = useCampaignStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

  const live = useMemo(() => campaigns.filter(c => c.status === 'Live'), [campaigns]);
  const upcoming = useMemo(
    () => campaigns.filter(c => c.status === 'Scheduled' && c.startDate <= in7),
    [campaigns, in7],
  );
  const recent = useMemo(
    () => campaigns.filter(c => c.status === 'Ended').sort((a, b) => b.endDate.localeCompare(a.endDate)).slice(0, 5),
    [campaigns],
  );

  const totalSpend = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalAttributed = campaigns.reduce((s, c) => s + (c.results?.attributedRevenue ?? 0), 0);

  const bestPerformer = useMemo(() => {
    const ended = campaigns.filter(c => c.results?.roi != null);
    return ended.sort((a, b) => (b.results!.roi! - a.results!.roi!))[0];
  }, [campaigns]);

  const needsAttention = campaigns.filter(c =>
    c.status === 'Draft' ||
    c.needsDetails ||
    c.executionAdapter?.sync_status === 'Sync Failed' ||
    (c.status === 'Ended' && !c.results?.attributedRevenue && c.endDate < today)
  );

  const syncFromAsana = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-asana-pull', {
        body: { sweep: true },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      const flagged = data?.needs_details ?? 0;
      const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
      const description = (created + updated) === 0
        ? 'No new Asana tasks to import.'
        : `Imported ${plural(created, 'new campaign')}, ${plural(flagged, 'flagged Needs Details')}, ${plural(updated, 'already synced')}`;
      toast({ title: 'Asana sync complete', description });
      refresh();
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={syncFromAsana} disabled={syncing} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync from Asana'}
        </Button>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiTile icon={Activity} label="Live now" value={String(live.length)} accent="text-emerald-600" />
        <KpiTile icon={CalendarClock} label="Upcoming (7d)" value={String(upcoming.length)} accent="text-indigo-600" />
        <KpiTile icon={CheckCircle2} label="Recently ended" value={String(recent.length)} />
        <KpiTile
          icon={DollarSign}
          label="Spend vs. attributed"
          value={`${fmt$(totalSpend)} / ${fmt$(totalAttributed)}`}
          hint={totalSpend > 0 ? `${(totalAttributed / totalSpend).toFixed(1)}x return` : undefined}
        />
        <KpiTile
          icon={Trophy}
          label="Best performer"
          value={bestPerformer ? `${bestPerformer.results!.roi!.toFixed(1)}x` : '—'}
          hint={bestPerformer?.title}
          accent="text-amber-600"
        />
      </div>

      {needsAttention.length > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500/70">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-foreground">Needs attention</h3>
            <span className="text-xs text-muted-foreground">({needsAttention.length})</span>
          </div>
          <div className="space-y-2">
            {needsAttention.map(c => (
              <button
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="w-full text-left flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                    {c.title}
                    {c.needsDetails && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Needs details
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.venueName}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={c.status} />
                  {c.executionAdapter && <SyncStatusBadge status={c.executionAdapter.sync_status} />}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <SectionList title="Live now" items={live} onOpen={onOpen} fmtRange={dateRange} empty="No live campaigns." />
        <SectionList title="Upcoming (next 7 days)" items={upcoming} onOpen={onOpen} fmtRange={dateRange} empty="Nothing scheduled this week." />
        <SectionList title="Recently ended" items={recent} onOpen={onOpen} fmtRange={dateRange} empty="No ended campaigns yet." />
      </div>

      <NewCampaignDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={c => onOpen(c.id)} />
    </div>
  );
};

const SectionList = ({ title, items, onOpen, fmtRange, empty }: {
  title: string;
  items: any[];
  onOpen: (id: string) => void;
  fmtRange: (a: string, b: string) => string;
  empty: string;
}) => (
  <Card className="p-4">
    <h3 className="font-semibold text-foreground mb-3 text-sm">{title}</h3>
    {items.length === 0 ? (
      <div className="text-xs text-muted-foreground py-6 text-center">{empty}</div>
    ) : (
      <div className="space-y-2">
        {items.map(c => (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="w-full text-left p-2 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-medium text-foreground truncate flex-1">{c.title}</div>
              <OriginBadge origin={c.origin} subsource={c.externalSubsource} />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{c.venueName}</span>
              <span>•</span>
              <span>{fmtRange(c.startDate, c.endDate)}</span>
            </div>
          </button>
        ))}
      </div>
    )}
  </Card>
);

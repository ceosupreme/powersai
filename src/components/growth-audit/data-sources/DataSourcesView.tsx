import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, ShieldCheck, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { DATA_SOURCE_CATALOG, type DataSource, type SourceStatus } from './mockDataSources';
import { DataSourceCard } from './DataSourceCard';
import { GbpLiveExtras } from './GbpLiveExtras';
import { useGbpStatus } from './useGbpStatus';
import { WebsiteLiveExtras } from './WebsiteLiveExtras';
import { useWebsiteStatus } from './useWebsiteStatus';
import { MapPackLiveExtras } from './MapPackLiveExtras';
import { AiSearchLiveExtras } from './AiSearchLiveExtras';
import { useConnectorStatuses, type ConnectorRecency } from './useConnectorStatuses';

// Recency copy: converts an ISO timestamp into a compact "3 days ago"-style
// label. Kept local to the view because the connector hook only surfaces
// the raw timestamp — the label vocabulary belongs to the display layer.
const relTime = (iso: string): string => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  const days = Math.round(s / 86_400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

// Scheduled-cadence budget: at what age does a scheduled sync stop counting
// as "Connected" and become "Stale"? Two days covers cron misses without
// hiding a real outage.
const SCHEDULED_STALE_DAYS = 2;
// Manual/on-demand cadence has no cron promise, so we only flag Stale after
// two weeks of silence. Anything fresher renders as Connected.
const MANUAL_STALE_DAYS = 14;

type Verdict = { status: SourceStatus; lastSync?: string; note?: string };

const scheduledVerdict = (r: ConnectorRecency): Verdict => {
  if (!r.lastAt || r.ageDays == null) {
    return { status: 'Never Synced', note: 'No successful sync recorded for this project.' };
  }
  const stale = r.ageDays > SCHEDULED_STALE_DAYS;
  return {
    status: stale ? 'Stale' : 'Connected',
    lastSync: relTime(r.lastAt),
    note: stale ? 'Past its refresh cadence — check the sync job.' : undefined,
  };
};

const manualVerdict = (r: ConnectorRecency, emptyNote: string): Verdict => {
  if (!r.lastAt || r.ageDays == null) {
    return { status: 'Never Synced', note: emptyNote };
  }
  const stale = r.ageDays > MANUAL_STALE_DAYS;
  return {
    status: stale ? 'Stale' : 'Connected',
    lastSync: relTime(r.lastAt),
  };
};

export const DataSourcesView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const venueName = selectedBar?.bar_name ?? '';
  const { data: gbp } = useGbpStatus(venueId);
  const { data: web } = useWebsiteStatus(venueId);
  const { data: conn } = useConnectorStatuses(venueId);

  const sources: DataSource[] = DATA_SOURCE_CATALOG.map((s): DataSource => {
    if (s.id === 'gbp' && gbp) {
      const isConnected = gbp.status === 'Connected' || gbp.status === 'Partial';
      const publicOnlyNote = gbp.provenance === 'public_only'
        ? 'Public checkup snapshot only — no management access to this profile.'
        : undefined;
      return {
        ...s,
        status: gbp.status,
        lastSync: gbp.lastSyncLabel ?? s.lastSync,
        note: publicOnlyNote,
        group: isConnected ? 'in-use' : 'available',
        action: isConnected ? 'Configure' : (gbp.status === 'Limited' ? 'Reconnect' : 'Connect'),
      };
    }
    if (s.id === 'website_crawler' && web) {
      const isConnected = web.status === 'Connected' || web.status === 'Partial';
      return {
        ...s,
        status: web.status,
        lastSync: web.lastSyncLabel ?? s.lastSync,
        group: isConnected ? 'in-use' : 'available',
        action: isConnected ? 'Configure' : (web.status === 'Limited' ? 'Reconnect' : 'Connect'),
      };
    }
    if (venueId && conn) {
      let v: Verdict | null = null;
      switch (s.id) {
        case 'toast':          v = scheduledVerdict(conn.toast); break;
        case '7shifts':        v = scheduledVerdict(conn.sevenshifts); break;
        case 'asana':          v = scheduledVerdict(conn.asana); break;
        case 'google_reviews': v = manualVerdict(conn.googleReviews, 'No reviews pulled for this project yet.'); break;
        case 'manager_logs':   v = manualVerdict(conn.managerLogs, 'No manager entries submitted for this project yet.'); break;
        case 'sculpture':      v = manualVerdict(conn.sculpture, 'No inventory uploads for this project yet.'); break;
      }
      if (v) return { ...s, status: v.status, lastSync: v.lastSync, note: v.note };
    }
    return s;
  });

  const inUse = sources.filter((s) => s.group === 'in-use');
  const available = sources.filter((s) => s.group === 'available');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header + Continuous Audit toggle */}
        <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-card">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Data Sources</h2>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                  Every signal the Growth Audit uses, what it powers, and how to expand coverage.
                  More sources connected = higher Data Confidence and more findings unlocked.
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-not-allowed">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Continuous Audit</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
                        Coming Soon
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Background refreshes per source cadence</div>
                  </div>
                  <Switch checked={false} disabled />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Background refreshes on each source's natural cadence — coming in a future release.
                For now, audits run on demand from the Overview tab.
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>

        {/* GBP live panel — only when a venue is selected */}
        {venueId && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Local Search Visibility · GBP</h3>
              <span className="text-xs text-muted-foreground">Per-project connection</span>
            </div>
            <GbpLiveExtras venueId={venueId} venueName={venueName} />
          </section>
        )}

        {/* Website crawler live panel */}
        {venueId && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Website &amp; Conversion · Crawler</h3>
              <span className="text-xs text-muted-foreground">Per-project audit</span>
            </div>
            <WebsiteLiveExtras venueId={venueId} venueName={venueName} />
          </section>
        )}

        {/* Map Pack ranking trends */}
        {venueId && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Local Search Visibility · Map Pack</h3>
              <span className="text-xs text-muted-foreground">Weekly ranking snapshots</span>
            </div>
            <MapPackLiveExtras venueId={venueId} venueName={venueName} />
          </section>
        )}

        {/* AI Search visibility */}
        {venueId && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Local Search Visibility · AI Search</h3>
              <span className="text-xs text-muted-foreground">Weekly engine snapshots</span>
            </div>
            <AiSearchLiveExtras venueId={venueId} venueName={venueName} />
          </section>
        )}

        {/* Connected & In-Use */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Connected &amp; In-Use</h3>
            <span className="text-xs text-muted-foreground">{inUse.length} sources</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inUse.map(s => <DataSourceCard key={s.id} src={s} />)}
          </div>
        </section>

        {/* Available to Connect */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Available to Connect</h3>
            <span className="text-xs text-muted-foreground">{available.length} sources</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.map(s => <DataSourceCard key={s.id} src={s} />)}
          </div>
        </section>

        {/* Graceful degradation footer */}
        <Card className="p-4 border-l-4 border-l-emerald-500/70 bg-muted/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-foreground flex items-center gap-1">
                Graceful degradation by design
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                When a source is missing or limited, the audit categories it feeds are marked
                <Badge variant="outline" className="mx-1 text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">Limited Data</Badge>
                or
                <Badge variant="outline" className="mx-1 text-[10px] bg-muted text-muted-foreground border-border">Unavailable</Badge>.
                The Growth Audit never fabricates findings to fill gaps — score and confidence
                degrade together so you always know what the data actually supports.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { Search, X, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { useCampaignStore } from './useCampaignStore';
import {
  CAMPAIGN_STATUSES, CAMPAIGN_TYPES, CAMPAIGN_ORIGINS, ORIGIN_LABEL,
  type CampaignStatus, type CampaignType, type CampaignOrigin,
} from './types';
import { StatusBadge, OriginBadge, TypeBadge, SyncStatusBadge } from './badges';
import { NewCampaignDialog } from './NewCampaignDialog';
import { cn } from '@/lib/utils';

const fmt$ = (n?: number | null) => n == null ? '—' : `$${Math.round(n).toLocaleString()}`;
const dateRange = (a: string, b: string) =>
  `${new Date(a + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(b + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

const Pill = <T extends string>({ value, active, onClick, children }: {
  value: T; active: boolean; onClick: (v: T) => void; children: React.ReactNode;
}) => (
  <button
    onClick={() => onClick(value)}
    className={cn(
      'px-2.5 py-1 text-xs rounded-full border transition-colors',
      active
        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
        : 'border-border text-muted-foreground hover:bg-muted/40',
    )}
  >
    {children}
  </button>
);

export const CampaignsView = ({ onOpen }: { onOpen: (id: string) => void }) => {
  const { campaigns } = useCampaignStore();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<CampaignStatus[]>([]);
  const [types, setTypes] = useState<CampaignType[]>([]);
  const [origins, setOrigins] = useState<CampaignOrigin[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const venues = useMemo(
    () => Array.from(new Set(campaigns.map(c => c.venueName))).sort(),
    [campaigns],
  );
  const [venue, setVenue] = useState<string>('');

  const filtered = useMemo(() => campaigns.filter(c => {
    if (statuses.length && !statuses.includes(c.status)) return false;
    if (types.length && !types.includes(c.type)) return false;
    if (origins.length && !origins.includes(c.origin)) return false;
    if (venue && c.venueName !== venue) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) &&
          !c.description.toLowerCase().includes(q) &&
          !c.venueName.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [campaigns, statuses, types, origins, venue, search]);

  const anyFilter = statuses.length || types.length || origins.length || venue || search;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-border bg-background text-foreground"
          >
            <option value="">All venues</option>
            {venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {anyFilter ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setSearch(''); setStatuses([]); setTypes([]); setOrigins([]); setVenue('');
            }}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <FilterRow label="Status">
            {CAMPAIGN_STATUSES.map(s => (
              <Pill key={s} value={s} active={statuses.includes(s)}
                onClick={v => toggle(statuses, v, setStatuses)}>{s}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Origin">
            {CAMPAIGN_ORIGINS.map(o => (
              <Pill key={o} value={o} active={origins.includes(o)}
                onClick={v => toggle(origins, v, setOrigins)}>{ORIGIN_LABEL[o]}</Pill>
            ))}
          </FilterRow>
          <FilterRow label="Type">
            {CAMPAIGN_TYPES.map(t => (
              <Pill key={t} value={t} active={types.includes(t)}
                onClick={v => toggle(types, v, setTypes)}>{t}</Pill>
            ))}
          </FilterRow>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        {filtered.length} of {campaigns.length} campaigns
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          const permalink = (c.executionAdapter as any)?.permalink_url as string | undefined;
          const showAsanaLink = c.executionAdapter?.external_id && (c.origin === 'manual_external' || c.executionAdapter?.sync_status === 'Synced');
          return (
          <Card
            key={c.id}
            className="p-4 cursor-pointer hover:border-indigo-500/40 hover:bg-muted/20 transition-colors"
            onClick={() => onOpen(c.id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{c.title}</span>
                  <StatusBadge status={c.status} />
                  <OriginBadge origin={c.origin} subsource={c.externalSubsource} />
                  <TypeBadge type={c.type} />
                  {c.needsDetails && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-700">
                      <AlertCircle className="w-3 h-3" /> Needs details
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{c.venueName}</span>
                  <span>•</span>
                  <span>{dateRange(c.startDate, c.endDate)}</span>
                  {c.recurrence !== 'One-Time' && (<><span>•</span><span>{c.recurrence}</span></>)}
                  {c.brandPartner && (<><span>•</span><span>w/ {c.brandPartner}</span></>)}
                </div>
                {c.channels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.channels.slice(0, 5).map(ch => (
                      <Badge key={ch} variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                        {ch}
                      </Badge>
                    ))}
                    {c.channels.length > 5 && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                        +{c.channels.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground">Expected → Actual</div>
                <div className="text-sm font-medium">
                  <span className="text-muted-foreground">{fmt$(c.expectedRevenueImpact)}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="text-foreground">{fmt$(c.results?.attributedRevenue)}</span>
                </div>
                {c.executionAdapter && <SyncStatusBadge status={c.executionAdapter.sync_status} />}
                {showAsanaLink && permalink && (
                  <a
                    href={permalink} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                  >
                    View in Asana <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-12 text-center text-sm text-muted-foreground">
            {campaigns.length === 0 ? 'No campaigns yet — click "New Campaign" to create one.' : 'No campaigns match the current filters.'}
          </Card>
        )}
      </div>

      <NewCampaignDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={c => onOpen(c.id)} />
    </div>
  );
};

const FilterRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="text-xs text-muted-foreground w-14 pt-1.5 flex-shrink-0">{label}</div>
    <div className="flex flex-wrap gap-1.5 flex-1">{children}</div>
  </div>
);

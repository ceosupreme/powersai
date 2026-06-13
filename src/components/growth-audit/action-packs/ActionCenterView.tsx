// Action Center inbox — central view of all generated assets across findings,
// for the selected venue. Sectioned per spec, with filters, bulk actions,
// and clickable source-finding badges.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, Search, Archive, Send, FileDown, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/context/AppContext';
import { CATEGORY_LABEL, type Finding, type FindingCategoryKey } from '../findings/mockFindings';
import { ALL_FINDING_TYPES, findingTypeLabel, FINDING_TYPE_TEMPLATES, type FindingType } from '../findings/findingTypes';
import { computeGateState } from '../GateBadge';
import { useFindings } from '../findings/useFindings';
import { useGrowthScores } from '../useGrowthScores';
import {
  useActionPacksStore,
  useActionPacksLoader,
  selectAssetsForVenue,
  archiveAssets,
  approveAssets,
  rejectAsset,
  editAsset,
  replaceAsset,
} from './useActionPacks';
import {
  ASSET_SECTION_ORDER,
  SECTION_LABEL,
  sectionForKind,
  type AssetSectionKey,
  type ActionPackAsset,
  type AssetStatus,
  type VenueContext,
} from './types';
import { AssetRow } from './AssetRow';
import { AssetApprovalPopover } from './AssetApprovalPopover';
import { regenerateAsset, fromFinding } from './generateActionPack';
import { QuickGenerateDialog } from './QuickGenerateDialog';
import { parseAssetSource, sourceCampaignId, SOURCE_LABEL, type AssetSource } from './sourceBadge';
import { useCampaignStore } from '@/components/marketing-hub/useCampaignStore';

const STATUSES: AssetStatus[] = ['Draft', 'In Use', 'Launched', 'Archived'];
const CATEGORIES = Object.keys(CATEGORY_LABEL) as FindingCategoryKey[];
const SOURCES: AssetSource[] = ['finding', 'campaign', 'adhoc'];

export const ActionCenterView = () => {
  useActionPacksStore();
  const { selectedBar } = useApp();
  useActionPacksLoader(selectedBar?.id);
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [cats, setCats] = useState<Set<FindingCategoryKey>>(new Set());
  const [types, setTypes] = useState<Set<FindingType>>(new Set());
  const [statuses, setStatuses] = useState<Set<AssetStatus>>(new Set());
  const [sources, setSources] = useState<Set<AssetSource>>(new Set());
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickOpen, setQuickOpen] = useState(false);
  const { campaigns } = useCampaignStore();
  const campaignById = useMemo(() => {
    const m = new Map<string, { title: string }>();
    campaigns.forEach(c => m.set(c.id, { title: c.title }));
    return m;
  }, [campaigns]);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <h2 className="text-lg font-semibold text-foreground">Select a venue</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a venue to see its Action Center inbox.</p>
      </Card>
    );
  }

  const venueCtx: VenueContext = {
    venueId: selectedBar.id,
    venueName: selectedBar.bar_name,
    city: selectedBar.city,
  };

  const assets = selectAssetsForVenue(selectedBar.id);
  const findingsQ = useFindings(selectedBar.id);
  const { primary } = useGrowthScores(selectedBar.id);
  const findingById = useMemo(() => {
    const map = new Map<string, Finding>();
    (findingsQ.data ?? []).forEach(f => map.set(f.id, f));
    return map;
  }, [findingsQ.data]);

  const cutoff = useMemo(() => {
    const days = dateRange === '1d' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : null;
    if (days === null) return 0;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [dateRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter(a => {
      const f = findingById.get(a.findingId);
      const src = parseAssetSource(a.findingId);
      if (sources.size && !sources.has(src)) return false;
      if (cats.size && f && !cats.has(f.category)) return false;
      // Source-type filter only applies to finding-backed assets.
      if (types.size && src === 'finding' && !types.has(a.findingType)) return false;
      if (statuses.size && !statuses.has(a.status)) return false;
      if (cutoff && new Date(a.createdAt).getTime() < cutoff) return false;
      if (q) {
        const hay = `${a.title} ${a.body} ${f?.title ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, search, cats, types, statuses, sources, cutoff, findingById]);

  const grouped = useMemo(() => {
    const map = new Map<AssetSectionKey, ActionPackAsset[]>();
    ASSET_SECTION_ORDER.forEach(s => map.set(s, []));
    filtered.forEach(a => map.get(sectionForKind(a.kind))?.push(a));
    return map;
  }, [filtered]);

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const clearSelected = () => setSelected(new Set());

  const openFinding = (id: string) => {
    navigate(`/growth-audit?subtab=findings&finding=${id}`);
  };

  const bulkArchive = () => {
    archiveAssets(Array.from(selected));
    toast({ title: `Archived ${selected.size} asset${selected.size === 1 ? '' : 's'}` });
    clearSelected();
  };

  const bulkExport = () => {
    console.log('[GROWTH-AUDIT] PDF export requested for', Array.from(selected));
    toast({ title: 'PDF export', description: 'PDF packet export ships in a later phase.' });
  };

  const bulkApprove = (payload: { assigneeId?: string; dueDate?: string; notes?: string }) => {
    const ids = Array.from(selected);
    approveAssets(ids, payload);
    toast({ title: `Sent ${ids.length} asset${ids.length === 1 ? '' : 's'} to Marketing Hub` });
    clearSelected();
  };

  const isAssetBlocked = (a: ActionPackAsset) => {
    // Synthetic-source assets (campaign / ad-hoc) are never gated — the gate
    // only applies to finding-driven traffic-driving assets.
    if (parseAssetSource(a.findingId) !== 'finding') return { blocked: false };
    const f = findingById.get(a.findingId);
    if (!f) return { blocked: false };
    const tmpl = FINDING_TYPE_TEMPLATES[a.findingType];
    if (!tmpl.defaultTrafficDriving) return { blocked: false };
    const state = computeGateState(f.isTrafficDriving, primary.readiness);
    if (state === 'block') return { blocked: true, reason: f.gateReason ?? 'Blocked by Ops Readiness Gate.' };
    return { blocked: false };
  };

  const hasFilters = cats.size + types.size + statuses.size + sources.size > 0 || dateRange !== 'all' || search.length > 0;
  const clearFilters = () => {
    setCats(new Set()); setTypes(new Set()); setStatuses(new Set()); setSources(new Set());
    setDateRange('all'); setSearch('');
  };

  // Per-asset source label and click handler for the source badge.
  const sourceForAsset = (a: ActionPackAsset): { label: string; onClick?: () => void } => {
    const src = parseAssetSource(a.findingId);
    if (src === 'finding') {
      const f = findingById.get(a.findingId);
      return { label: f?.title ?? 'Finding', onClick: () => openFinding(a.findingId) };
    }
    if (src === 'campaign') {
      const cid = sourceCampaignId(a.findingId);
      const c = cid ? campaignById.get(cid) : null;
      return {
        label: `Campaign · ${c?.title ?? 'Untitled'}`,
        onClick: cid ? () => navigate(`/marketing-hub?subtab=campaigns&open=${cid}`) : undefined,
      };
    }
    return { label: 'Ad-hoc' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Action Center</h2>
          <Badge variant="outline" className="text-[10px]">{filtered.length} of {assets.length}</Badge>
          <span className="text-xs text-muted-foreground">{selectedBar.bar_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="pl-8 h-9 w-[240px]"
            />
          </div>
          <Button size="sm" onClick={() => setQuickOpen(true)} className="gap-1.5 h-9">
            <Sparkles className="w-3.5 h-3.5" /> Quick Generate
          </Button>
        </div>
      </div>

      <QuickGenerateDialog open={quickOpen} onOpenChange={setQuickOpen} venueContext={venueCtx} />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="p-2.5 flex items-center gap-2 flex-wrap bg-primary/5 border-primary/20">
          <span className="text-xs font-medium text-foreground">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelected}>Clear</Button>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={bulkExport}>
              <FileDown className="w-3 h-3" /> Export PDF
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={bulkArchive}>
              <Archive className="w-3 h-3" /> Archive
            </Button>
            <AssetApprovalPopover
              onApprove={bulkApprove}
              showReject={false}
              label="Bulk Send to Marketing Hub"
              trigger={
                <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Send className="w-3 h-3" /> Bulk Send
                </Button>
              }
            />
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3 space-y-2.5">
        <FilterRow label="Category">
          {CATEGORIES.map(c => (
            <Pill key={c} active={cats.has(c)} onClick={() => toggle(cats, c, setCats)}>{CATEGORY_LABEL[c]}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Source">
          {SOURCES.map(s => (
            <Pill key={s} active={sources.has(s)} onClick={() => toggle(sources, s, setSources)}>{SOURCE_LABEL[s]}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Source type">
          {ALL_FINDING_TYPES.map(t => (
            <Pill key={t} active={types.has(t)} onClick={() => toggle(types, t, setTypes)}>{findingTypeLabel(t)}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Status">
          {STATUSES.map(s => (
            <Pill key={s} active={statuses.has(s)} onClick={() => toggle(statuses, s, setStatuses)}>{s}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Generated">
          {(['1d', '7d', '30d', 'all'] as const).map(d => (
            <Pill key={d} active={dateRange === d} onClick={() => setDateRange(d)}>
              {d === '1d' ? 'Today' : d === 'all' ? 'All time' : `Last ${d}`}
            </Pill>
          ))}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 ml-auto" onClick={clearFilters}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </FilterRow>
      </Card>

      {/* Empty state */}
      {assets.length === 0 ? (
        <Card className="p-10 text-center bg-card/30 border-dashed">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-foreground font-medium">No generated assets yet</div>
          <p className="text-xs text-muted-foreground mt-1">
            Open a finding and generate an Action Pack — assets land here automatically.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setSearchParams({ subtab: 'findings' })}>
            Browse findings
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {ASSET_SECTION_ORDER.map(sec => {
            const list = grouped.get(sec) ?? [];
            return (
              <section key={sec}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{SECTION_LABEL[sec]}</h3>
                  <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                </div>
                {list.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic px-1 py-1">No assets yet.</div>
                ) : (
                  <div className="space-y-2">
                    {list.map(a => {
                      const { blocked, reason } = isAssetBlocked(a);
                      const src = sourceForAsset(a);
                      const f = findingById.get(a.findingId);
                      return (
                        <AssetRow
                          key={a.id}
                          asset={a}
                          findingTitle={src.label}
                          onSourceClick={src.onClick}
                          blocked={blocked}
                          blockedReason={reason}
                          selectable
                          selected={selected.has(a.id)}
                          onToggleSelect={() => toggleSelect(a.id)}
                          onRegenerate={async (r) => {
                            // Finding-backed: regenerate via the existing
                            // finding context. Synthetic-source assets keep
                            // their existing body — full regen for those
                            // belongs in their originating surface.
                            if (!f) {
                              toast({ title: 'Regenerate from source', description: 'Open the originating campaign or use Quick Generate to refresh ad-hoc assets.' });
                              return;
                            }
                            const next = await regenerateAsset(a, fromFinding(f), venueCtx, r);
                            replaceAsset(a.id, next);
                          }}
                          onEdit={(body) => editAsset(a.id, body)}
                          onApprove={(payload) => {
                            approveAssets([a.id], payload);
                            toast({ title: 'Approved', description: 'Asset moved to In Use.' });
                          }}
                          onReject={() => { rejectAsset(a.id); toast({ title: 'Rejected' }); }}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground w-24 shrink-0">{label}</div>
    <div className="flex flex-wrap gap-1.5 flex-1">{children}</div>
  </div>
);

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-[11px] px-2 py-1 rounded-full border transition ${
      active
        ? 'bg-primary/15 text-primary border-primary/40'
        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
    }`}
  >
    {children}
  </button>
);

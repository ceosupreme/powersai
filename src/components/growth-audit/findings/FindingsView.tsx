import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, X, Loader2, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABEL, type Finding, type FindingCategoryKey, type FindingSeverity, type FindingStatus } from './mockFindings';
import { ALL_FINDING_TYPES, findingTypeLabel, type FindingType } from './findingTypes';
import { sortFindings } from './findingScales';
import { FindingCard } from './FindingCard';
import { FindingDetail } from './FindingDetail';
import { useFindings, useFindingMutation, findingsKey } from './useFindings';
import { useGrowthScores } from '../useGrowthScores';
import { useIsHospitalityProject, HOSPITALITY_ONLY_CATEGORIES } from '@/hooks/useIsHospitalityProject';

const SEVERITIES: FindingSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: FindingStatus[] = ['New', 'In Progress', 'Sent to Marketing Hub', 'Resolved', 'Dismissed', 'Snoozed'];
const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as FindingCategoryKey[];

type SortKey = 'priority' | 'created' | 'severity' | 'upside';

export const FindingsView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const findingsQ = useFindings(venueId);
  const isHospitality = useIsHospitalityProject(venueId).data ?? false;
  const rawFindings = findingsQ.data ?? [];
  // Hide hospitality-only categories on non-hospitality projects so they don't
  // appear in the list, the count badge, the category filter pills, or detail.
  const findings = isHospitality
    ? rawFindings
    : rawFindings.filter(
        (f) => !(HOSPITALITY_ONLY_CATEGORIES as readonly string[]).includes(f.category),
      );
  const CATEGORIES = isHospitality
    ? ALL_CATEGORIES
    : ALL_CATEGORIES.filter(
        (c) => !(HOSPITALITY_ONLY_CATEGORIES as readonly string[]).includes(c),
      );
  const { primary } = useGrowthScores(venueId);
  const mutate = useFindingMutation(venueId);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [hideDemo, setHideDemo] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const [search, setSearch] = useState('');
  const [cats, setCats] = useState<Set<FindingCategoryKey>>(new Set());
  const [types, setTypes] = useState<Set<FindingType>>(new Set());
  const [sevs, setSevs] = useState<Set<FindingSeverity>>(new Set());
  const [statuses, setStatuses] = useState<Set<FindingStatus>>(new Set());
  const [minUpside, setMinUpside] = useState(0);
  const [minEase, setMinEase] = useState(0);
  const [minConf, setMinConf] = useState(0);
  const [maxOpsRisk, setMaxOpsRisk] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const detailId = searchParams.get('finding');
  const detail = detailId ? findings.find(f => f.id === detailId) ?? null : null;

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = findings.filter(f => {
      if (hideDemo && f.signalKey?.startsWith('seed:')) return false;
      if (cats.size && !cats.has(f.category)) return false;
      if (types.size && !types.has(f.type)) return false;
      if (sevs.size && !sevs.has(f.severity)) return false;
      if (statuses.size && !statuses.has(f.status)) return false;
      if (f.revenueUpside < minUpside) return false;
      if (f.ease < minEase) return false;
      if (f.confidence < minConf) return false;
      if (f.operationalRisk > maxOpsRisk) return false;
      if (q && !(`${f.title} ${CATEGORY_LABEL[f.category]}`.toLowerCase().includes(q))) return false;
      return true;
    });
    return sortFindings(list, sortBy);
  }, [findings, search, cats, types, sevs, statuses, minUpside, minEase, minConf, maxOpsRisk, sortBy, hideDemo]);

  const seedCount = useMemo(
    () => findings.filter(f => f.signalKey?.startsWith('seed:') && f.status !== 'Dismissed').length,
    [findings],
  );

  const cleanupDemo = async () => {
    if (!venueId) return;
    setCleaning(true);
    try {
      const { error } = await supabase
        .from('growth_findings')
        .update({ status: 'Dismissed', dismiss_reason: 'sample_data_cleanup', resolved_at: new Date().toISOString() })
        .eq('venue_id', venueId)
        .like('signal_key', 'seed:%')
        .neq('status', 'Dismissed');
      if (error) throw error;
      qc.invalidateQueries({ queryKey: findingsKey(venueId) });
      toast({ title: 'Demo findings cleaned up', description: `${seedCount} sample finding${seedCount === 1 ? '' : 's'} dismissed.` });
      setCleanupOpen(false);
    } catch (e: any) {
      toast({ title: 'Cleanup failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setCleaning(false); }
  };


  const updateFinding = (id: string, patch: Partial<Finding>) => {
    mutate.mutate({
      id,
      status: (patch.status ?? 'New') as FindingStatus,
      dismissReason: patch.dismissReason,
      snoozedUntil: patch.snoozedUntil,
    });
  };

  const clearFilters = () => {
    setCats(new Set()); setTypes(new Set()); setSevs(new Set()); setStatuses(new Set());
    setMinUpside(0); setMinEase(0); setMinConf(0); setMaxOpsRisk(5);
    setSearch('');
  };

  const hasFilters = cats.size + types.size + sevs.size + statuses.size > 0
    || minUpside > 0 || minEase > 0 || minConf > 0 || maxOpsRisk < 5 || search.length > 0;

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <h2 className="text-lg font-semibold text-foreground">Select a project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a project from the global header to see Growth Audit findings.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Findings</h2>
          <Badge variant="outline" className="text-[10px]">{filtered.length} of {findings.length}</Badge>
          {findingsQ.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <div className="flex items-center gap-1.5 ml-2">
            <Switch id="hide-demo" checked={hideDemo} onCheckedChange={setHideDemo} />
            <Label htmlFor="hide-demo" className="text-xs text-muted-foreground cursor-pointer">Hide demo</Label>
          </div>
          {isAdmin && seedCount > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-1" onClick={() => setCleanupOpen(true)}>
              <Trash2 className="w-3 h-3" /> Clean up demo ({seedCount})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xl ml-auto">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search findings…"
              className="pl-8 h-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort: Priority Score</SelectItem>
              <SelectItem value="created">Sort: Date Created</SelectItem>
              <SelectItem value="severity">Sort: Severity</SelectItem>
              <SelectItem value="upside">Sort: Revenue Upside</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 space-y-3">
        <FilterRow label="Category">
          {CATEGORIES.map(c => (
            <Pill key={c} active={cats.has(c)} onClick={() => toggle(cats, c, setCats)}>
              {CATEGORY_LABEL[c]}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="Type">
          {ALL_FINDING_TYPES.map(t => (
            <Pill key={t} active={types.has(t)} onClick={() => toggle(types, t, setTypes)}>
              {findingTypeLabel(t)}
            </Pill>
          ))}
        </FilterRow>
        <FilterRow label="Severity">
          {SEVERITIES.map(s => (
            <Pill key={s} active={sevs.has(s)} onClick={() => toggle(sevs, s, setSevs)}>{s}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Status">
          {STATUSES.map(s => (
            <Pill key={s} active={statuses.has(s)} onClick={() => toggle(statuses, s, setStatuses)}>{s}</Pill>
          ))}
        </FilterRow>

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? 'Hide' : 'More'} filters
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/50">
            <MinSelect label="Min Revenue Upside" value={minUpside} onChange={setMinUpside} />
            <MinSelect label="Min Ease" value={minEase} onChange={setMinEase} />
            <MinSelect label="Min Confidence" value={minConf} onChange={setMinConf} />
            <MinSelect label="Max Operational Risk" value={maxOpsRisk} onChange={setMaxOpsRisk} max />
          </div>
        )}
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center bg-card/30 border-dashed">
          <div className="text-sm text-muted-foreground">No findings match the current filters.</div>
          {hasFilters && <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => (
            <FindingCard
              key={f.id}
              finding={f}
              gate={primary.readiness}
              onOpen={() => setSearchParams({ subtab: 'findings', finding: f.id })}
            />
          ))}
        </div>
      )}

      <FindingDetail
        finding={detail}
        gate={primary.readiness}
        onClose={() => setSearchParams({ subtab: 'findings' })}
        onUpdate={updateFinding}
      />

      <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove demo findings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will dismiss all {seedCount} sample findings for {selectedBar.bar_name}. Real
              analyzer findings are not affected. Records remain in history but are hidden from
              active views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={cleanupDemo} disabled={cleaning}>
              {cleaning ? 'Cleaning…' : 'Dismiss demo findings'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FilterRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 shrink-0">{label}</div>
    <div className="flex flex-wrap gap-1.5">{children}</div>
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

const MinSelect = ({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {[0, 1, 2, 3, 4, 5].map(n => (
          <SelectItem key={n} value={String(n)}>
            {max ? (n === 5 ? 'Any (≤5)' : `≤ ${n}`) : (n === 0 ? 'Any' : `≥ ${n}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

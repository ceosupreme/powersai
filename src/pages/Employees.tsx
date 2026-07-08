import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeKpis } from '@/hooks/useEmployeeKpis';
import { EmployeeListTable } from '@/components/employees/EmployeeListTable';
import { EmployeePresetChips, type Preset } from '@/components/employees/EmployeePresetChips';
import { EmployeeKpiTiles, type ActiveTile } from '@/components/employees/EmployeeKpiTiles';
import {
  ALLSTAR_TENURE_DAYS,
  NEW_HIRE_TENURE_DAYS,
  NEEDS_ATTENTION_VIOLATIONS,
  NO_CLOCKOUT_THRESHOLD,
  classifyVariance,
} from '@/components/employees/constants';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'active' | 'inactive' | 'all';
type SortKey = 'name' | 'tenure' | 'hours' | 'violations' | 'violations_week' | 'wins' | 'concerns';
const VALID_SORTS: SortKey[] = ['name', 'tenure', 'hours', 'violations', 'violations_week', 'wins', 'concerns'];

// Most recent completed Monday-Sunday week in Pacific Time, returned as ISO YYYY-MM-DD
const lastCompletedWeek = (): { weekStart: string; weekEnd: string } => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  const d = Number(parts.find(p => p.type === 'day')!.value);
  const wd = parts.find(p => p.type === 'weekday')!.value; // Mon, Tue, ...
  const dowMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const todayDow = dowMap[wd] ?? 1;
  // Last Sunday = today - todayDow days (if Mon, that's -1 day)
  const sundayUTC = new Date(Date.UTC(y, m - 1, d));
  sundayUTC.setUTCDate(sundayUTC.getUTCDate() - todayDow);
  const mondayUTC = new Date(sundayUTC);
  mondayUTC.setUTCDate(mondayUTC.getUTCDate() - 6);
  return {
    weekStart: mondayUTC.toISOString().slice(0, 10),
    weekEnd: sundayUTC.toISOString().slice(0, 10),
  };
};

const Employees = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const [searchParams] = useSearchParams();

  const week = useMemo(lastCompletedWeek, []);
  const { data: employees = [], isLoading } = useEmployees(venueId, week);
  const { data: kpis } = useEmployeeKpis(venueId);

  const urlSort = searchParams.get('sort');
  const urlDir = searchParams.get('dir');
  const initialSort = (VALID_SORTS as string[]).includes(urlSort ?? '') ? (urlSort as SortKey) : undefined;
  const initialDir = urlDir === 'asc' || urlDir === 'desc' ? urlDir : undefined;

  const [status, setStatusRaw] = useState<StatusFilter>('active');
  const [role, setRoleRaw] = useState<string>('all');
  const [search, setSearchRaw] = useState('');
  const [preset, setPresetRaw] = useState<Preset>(null);
  const [activeTile, setActiveTile] = useState<ActiveTile>(null);

  // Wrappers: any non-tile filter change clears the tile ring
  const setStatus = (v: StatusFilter) => { setActiveTile(null); setStatusRaw(v); };
  const setRole = (v: string) => { setActiveTile(null); setRoleRaw(v); };
  const setSearch = (v: string) => { setActiveTile(null); setSearchRaw(v); };
  const setPreset = (v: Preset) => { setActiveTile(null); setPresetRaw(v); };

  const onTileClick = (tile: ActiveTile) => {
    if (!tile) return;
    if (activeTile === tile) {
      // Toggle off -> reset filters that this tile applied
      setActiveTile(null);
      if (tile === 'active') setStatusRaw('active');
      if (tile === 'compliance' || tile === 'newhires') setPresetRaw(null);
      return;
    }
    if (tile === 'active') {
      setStatusRaw('active');
      setPresetRaw(null);
    } else if (tile === 'compliance') {
      setPresetRaw('attention');
      setStatusRaw('active');
    } else if (tile === 'newhires') {
      setPresetRaw('newhires');
      setStatusRaw('active');
    }
    setActiveTile(tile);
  };

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) {
      if (e.role_primary) set.add(e.role_primary);
    }
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      if (status === 'active' && !emp.is_active) return false;
      if (status === 'inactive' && emp.is_active) return false;
      if (role !== 'all' && emp.role_primary !== role) return false;
      if (search && !emp.display_name.toLowerCase().includes(search.toLowerCase())) return false;

      if (preset === 'allstars') {
        const variance = classifyVariance(emp.weekly_hours_sd, emp.weekly_hours.length);
        if (
          (emp.tenure_days ?? 0) < ALLSTAR_TENURE_DAYS ||
          emp.violations_90d !== 0 ||
          emp.hours_90d <= 0 ||
          variance !== 'Consistent'
        ) return false;
      } else if (preset === 'attention') {
        if (
          emp.violations_90d < NEEDS_ATTENTION_VIOLATIONS &&
          emp.no_clockout_30d < NO_CLOCKOUT_THRESHOLD
        ) return false;
      } else if (preset === 'newhires') {
        if (emp.tenure_days === null || emp.tenure_days >= NEW_HIRE_TENURE_DAYS) return false;
      }

      return true;
    });
  }, [employees, status, role, search, preset]);

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Team</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedBar?.bar_name || selectedBar?.id || 'Select a project'} · {filtered.length} of {employees.length}
        </p>
      </header>

      {/* KPI tiles */}
      <EmployeeKpiTiles
        employees={employees}
        kpis={kpis}
        activeTile={activeTile}
        onTileClick={onTileClick}
      />

      {/* Preset chips */}
      <EmployeePresetChips active={preset} onChange={setPreset} />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {preset === 'allstars' && filtered.length === 0 && !isLoading && employees.length > 0 ? (
        (() => {
          const maxTenure = employees.reduce(
            (max, e) => Math.max(max, e.tenure_days ?? 0),
            0
          );
          return (
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-2">
              <div className="text-base font-medium text-foreground">No All-Stars yet.</div>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Requires {ALLSTAR_TENURE_DAYS} days of tenure; the longest tenure currently
                visible is <span className="text-foreground font-medium">{maxTenure} day{maxTenure === 1 ? '' : 's'}</span>.
                This list will fill in as the Toast time-entry history grows.
              </p>
            </div>
          );
        })()
      ) : (
        <EmployeeListTable employees={filtered} loading={isLoading} initialSort={initialSort} initialDir={initialDir} />
      )}
    </div>
  );
};

export default Employees;

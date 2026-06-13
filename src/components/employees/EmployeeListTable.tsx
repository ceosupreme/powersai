import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { EmployeeRow } from '@/hooks/useEmployees';
import { Badge } from '@/components/ui/badge';
import { formatTenure } from './utils';

type SortKey = 'name' | 'tenure' | 'hours' | 'violations' | 'violations_week' | 'wins' | 'concerns';
type SortDir = 'asc' | 'desc';

interface Props {
  employees: EmployeeRow[];
  loading?: boolean;
  initialSort?: SortKey;
  initialDir?: SortDir;
}

const compareNum = (a: number | null, b: number | null, dir: SortDir): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;  // nulls last
  if (b === null) return -1;
  return dir === 'asc' ? a - b : b - a;
};

export const EmployeeListTable = ({ employees, loading, initialSort, initialDir }: Props) => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>(initialSort ?? 'name');
  const [sortDir, setSortDir] = useState<SortDir>(initialDir ?? (initialSort && initialSort !== 'name' ? 'desc' : 'asc'));

  const sorted = useMemo(() => {
    const arr = [...employees];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return sortDir === 'asc'
            ? a.display_name.localeCompare(b.display_name)
            : b.display_name.localeCompare(a.display_name);
        case 'tenure':
          return compareNum(a.tenure_days, b.tenure_days, sortDir);
        case 'hours':
          return compareNum(a.hours_90d, b.hours_90d, sortDir);
        case 'violations':
          return compareNum(a.violations_90d, b.violations_90d, sortDir);
        case 'violations_week':
          return compareNum(a.violations_week, b.violations_week, sortDir);
        case 'wins':
          return compareNum(a.wins_90d, b.wins_90d, sortDir);
        case 'concerns':
          return compareNum(a.concerns_90d, b.concerns_90d, sortDir);
      }
    });
    return arr;
  }, [employees, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Loading employees…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No employees match the current filters.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {sorted.map(emp => (
          <button
            key={emp.id}
            onClick={() => navigate(`/employees/${emp.id}`)}
            className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground truncate">{emp.display_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {emp.role_primary || '—'}{emp.role_secondary ? ` · ${emp.role_secondary}` : ''}
                </div>
              </div>
              {!emp.is_active && (
                <Badge variant="outline" className="text-[10px] uppercase">Inactive</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div>
                <div className="text-muted-foreground">Tenure</div>
                <div className="font-medium">{formatTenure(emp.tenure_days)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Hours 90d</div>
                <div className="font-medium">{emp.hours_90d}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Violations</div>
                <div className={`font-medium ${emp.violations_90d >= 3 ? 'text-orange-400' : ''}`}>
                  {emp.violations_90d}
                  {emp.violations_week > 0 && (
                    <span className="ml-1 text-[10px] text-orange-400">· {emp.violations_week} wk</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Wins 90d</div>
                <div className={`font-medium ${emp.wins_90d > 0 ? 'text-emerald-400' : ''}`}>
                  {emp.wins_90d}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Concerns 90d</div>
                <div className={`font-medium ${emp.concerns_90d > 0 ? 'text-red-400' : ''}`}>
                  {emp.concerns_90d}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Name <SortIcon k="name" />
                </button>
              </th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('tenure')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Tenure <SortIcon k="tenure" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort('hours')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Hours 90d <SortIcon k="hours" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort('violations_week')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Violations (Week) <SortIcon k="violations_week" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort('violations')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Violations 90d <SortIcon k="violations" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort('wins')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Wins 90d <SortIcon k="wins" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button onClick={() => toggleSort('concerns')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Concerns 90d <SortIcon k="concerns" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(emp => (
              <tr
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">{emp.display_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {emp.role_primary || '—'}
                  {emp.role_secondary ? <span className="text-xs"> · {emp.role_secondary}</span> : null}
                </td>
                <td className="px-4 py-3">
                  {emp.is_active ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatTenure(emp.tenure_days)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{emp.hours_90d}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${emp.violations_week >= 2 ? 'text-orange-400 font-semibold' : (emp.violations_week === 0 ? 'text-muted-foreground' : '')}`}>
                  {emp.violations_week}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${emp.violations_90d >= 3 ? 'text-orange-400 font-semibold' : ''}`}>
                  {emp.violations_90d}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${emp.wins_90d > 0 ? 'text-emerald-400 font-semibold' : 'text-muted-foreground'}`}>
                  {emp.wins_90d}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${emp.concerns_90d > 0 ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                  {emp.concerns_90d}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

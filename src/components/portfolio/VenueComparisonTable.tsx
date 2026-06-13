import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PortfolioVenue } from '@/hooks/usePortfolioData';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';
import { formatCurrency, formatPercent } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface VenueComparisonTableProps {
  venues: PortfolioVenue[];
  onVenueClick: (venueId: string) => void;
}

type SortKey = 'name' | 'score' | 'grade' | 'weeklyRevenue' | 'laborScore' | 'operationsScore' | 'guestScore' | 'revenueScore';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; hideOnMobile?: boolean }[] = [
  { key: 'name', label: 'Venue' },
  { key: 'score', label: 'Score' },
  { key: 'grade', label: 'Grade', hideOnMobile: true },
  { key: 'weeklyRevenue', label: 'Revenue' },
  { key: 'revenueScore', label: 'Rev', hideOnMobile: true },
  { key: 'laborScore', label: 'Labor', hideOnMobile: true },
  { key: 'operationsScore', label: 'Ops', hideOnMobile: true },
  { key: 'guestScore', label: 'Guest', hideOnMobile: true },
];

export function VenueComparisonTable({ venues, onVenueClick }: VenueComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...venues].sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [venues, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  }

  function PillarCell({ score, className }: { score: number | null; className?: string }) {
    if (score == null) return <td className={cn("px-3 py-2.5 text-muted-foreground text-sm", className)}>--</td>;
    const grade = getGradeFromScore(score);
    const color = getGradeColor(grade);
    return (
      <td className={cn("px-3 py-2.5 text-sm font-medium", className)} style={{ color }}>
        {Math.round(score)} {grade}
      </td>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap",
                    col.hideOnMobile && "hidden sm:table-cell"
                  )}
                >
                  {col.label}<SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(v => {
              const grade = v.grade || (v.score != null ? getGradeFromScore(v.score) : null);
              const gradeColor = grade ? getGradeColor(grade) : undefined;
              return (
                <tr
                  key={v.id}
                  onClick={() => onVenueClick(v.id)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{v.name}</td>
                  <td className="px-3 py-2.5 text-sm font-bold" style={{ color: gradeColor }}>
                    {v.score != null ? v.score : '--'}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium hidden sm:table-cell" style={{ color: gradeColor }}>
                    {grade || '--'}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground">
                    {v.weeklyRevenue != null ? formatCurrency(v.weeklyRevenue) : '--'}
                  </td>
                  <PillarCell score={v.revenueScore} className="hidden sm:table-cell" />
                  <PillarCell score={v.laborScore} className="hidden sm:table-cell" />
                  <PillarCell score={v.operationsScore} className="hidden sm:table-cell" />
                  <PillarCell score={v.guestScore} className="hidden sm:table-cell" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

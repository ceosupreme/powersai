import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { CATEGORY_LABEL, type FindingCategoryKey } from '../findings/mockFindings';
import type { ScoreSnapshotPoint } from './historyTypes';
import type { ScoreRange } from './useAuditHistory';

type SeriesKey = 'overall' | FindingCategoryKey;

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'overall',     label: 'Overall',                 color: 'hsl(160 84% 39%)' },
  { key: 'revenue',     label: CATEGORY_LABEL.revenue,    color: 'hsl(217 91% 60%)' },
  { key: 'menu',        label: CATEGORY_LABEL.menu,       color: 'hsl(280 75% 60%)' },
  { key: 'events',      label: CATEGORY_LABEL.events,     color: 'hsl(330 85% 60%)' },
  { key: 'local',       label: CATEGORY_LABEL.local,      color: 'hsl(195 80% 50%)' },
  { key: 'reputation',  label: CATEGORY_LABEL.reputation, color: 'hsl(38 92% 55%)' },
  { key: 'social',      label: CATEGORY_LABEL.social,     color: 'hsl(0 84% 60%)' },
  { key: 'website',     label: CATEGORY_LABEL.website,    color: 'hsl(245 70% 60%)' },
  { key: 'operational', label: CATEGORY_LABEL.operational,color: 'hsl(150 60% 45%)' },
];

const RANGES: { id: ScoreRange; label: string }[] = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: 'ALL', label: 'All' },
];

type Props = {
  snapshots: ScoreSnapshotPoint[];
  range: ScoreRange;
  onRangeChange: (r: ScoreRange) => void;
  isLoading?: boolean;
};

export const ScoreTrendsChart = ({ snapshots, range, onRangeChange, isLoading }: Props) => {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>(
    () => Object.fromEntries(SERIES.map(s => [s.key, true])) as Record<SeriesKey, boolean>,
  );

  const data = useMemo(
    () =>
      snapshots.map(s => ({
        date: new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        overall: s.overall ?? undefined,
        revenue: s.revenue ?? undefined,
        menu: s.menu ?? undefined,
        events: s.events ?? undefined,
        local: s.local ?? undefined,
        reputation: s.reputation ?? undefined,
        social: s.social ?? undefined,
        website: s.website ?? undefined,
        operational: s.operational ?? undefined,
      })),
    [snapshots],
  );

  const toggle = (k: SeriesKey) => setVisible(v => ({ ...v, [k]: !v[k] }));
  const showOnlyOverall = () =>
    setVisible(Object.fromEntries(SERIES.map(s => [s.key, s.key === 'overall'])) as Record<SeriesKey, boolean>);
  const showAll = () =>
    setVisible(Object.fromEntries(SERIES.map(s => [s.key, true])) as Record<SeriesKey, boolean>);

  const insufficientData = !isLoading && snapshots.length < 7;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Score Trends</h3>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => onRangeChange(r.id)}
                className={`px-2.5 py-1 text-[11px] ${range === r.id ? 'bg-emerald-500/15 text-emerald-600' : 'text-muted-foreground hover:bg-muted/40'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={showOnlyOverall}>
            Overall only
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={showAll}>
            Show all
          </Button>
        </div>
      </div>

      {insufficientData ? (
        <div className="h-[280px] flex items-center justify-center text-center px-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Trends will populate after 7 days of audit history.<br />
          <span className="text-xs opacity-80">Currently {snapshots.length} snapshot{snapshots.length === 1 ? '' : 's'} recorded.</span>
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {SERIES.filter(s => visible[s.key]).map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={s.key === 'overall' ? 2.5 : 1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SERIES.map(s => (
          <button key={s.key} onClick={() => toggle(s.key)}>
            <Badge
              variant="outline"
              className={`text-[10px] gap-1.5 cursor-pointer transition-opacity ${visible[s.key] ? '' : 'opacity-40'}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </Badge>
          </button>
        ))}
      </div>
    </Card>
  );
};

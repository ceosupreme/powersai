// Per-venue Map Pack ranking trends panel rendered inside Data Sources.
// Pulls the same useMapPackSummary the local-visibility blender uses.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUp, ArrowDown, Minus, Loader2 } from 'lucide-react';
import { useMapPackSummary, type KeywordTrend } from './useMapPackSummary';

const NOT_FOUND_RANK = 21;

const trendIcon = (direction: 'up' | 'down' | 'flat') => {
  if (direction === 'up') return <ArrowUp className="w-3 h-3 text-emerald-600" />;
  if (direction === 'down') return <ArrowDown className="w-3 h-3 text-orange-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const Sparkline = ({ history }: { history: KeywordTrend['history'] }) => {
  if (history.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  const values = history.map((h) => h.rank ?? NOT_FOUND_RANK);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const w = 80, h = 20;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    // smaller rank = better → render higher on screen (lower y)
    const y = h - ((max - v) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="text-emerald-600">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
    </svg>
  );
};

const priorityBadge = (p: KeywordTrend['priority']) => {
  const cls = p === 'high'
    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
    : p === 'medium'
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-muted text-muted-foreground border-border';
  return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{p}</Badge>;
};

export const MapPackLiveExtras = ({
  venueId, venueName,
}: { venueId: string; venueName: string }) => {
  const { data, isLoading } = useMapPackSummary(venueId);

  if (isLoading) {
    return (
      <Card className="p-4 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 inline animate-spin mr-2" /> Loading ranking data…
      </Card>
    );
  }

  if (!data || !data.hasKeywords) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
            <Search className="w-4 h-4" />
          </div>
          <div className="text-xs text-muted-foreground">
            No tracked keywords for {venueName} yet. An admin can add them in
            Growth Audit → Launch → Map Pack Keywords.
          </div>
        </div>
      </Card>
    );
  }

  const hitRatePct = data.hitRate !== null ? Math.round(data.hitRate * 100) : null;
  const avgRankLabel = data.avgRank !== null ? data.avgRank.toFixed(1) : '—';
  const lastCheckedDays = data.lastCheckedAt
    ? Math.round((Date.now() - Date.parse(data.lastCheckedAt)) / 86_400_000)
    : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
          <Search className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">Ranking trends · {venueName}</h4>
          <p className="text-[11px] text-muted-foreground">
            {data.totalKeywords} tracked · {data.highPriorityCount} high-priority ·
            {' '}{lastCheckedDays === null ? 'never checked' : lastCheckedDays === 0 ? 'checked today' : `${lastCheckedDays}d ago`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Map Pack hit rate</div>
          <div className="text-xl font-semibold text-foreground mt-1">
            {hitRatePct === null ? '—' : `${hitRatePct}%`}
          </div>
          <div className="text-[10px] text-muted-foreground">{data.highInPack}/{data.highCovered} high-priority in top 3</div>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Average rank</div>
          <div className="text-xl font-semibold text-foreground mt-1">{avgRankLabel}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            {trendIcon(data.trend)}
            <span>{data.trend === 'flat' ? 'flat vs last run' : `${data.trend === 'up' ? 'improving' : 'declining'} vs last run`}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Snapshots</div>
          <div className="text-xl font-semibold text-foreground mt-1">{data.snapshotsCount}</div>
          <div className="text-[10px] text-muted-foreground">across all keywords</div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Keyword</span>
          <span>Priority</span>
          <span className="w-16 text-right">Rank</span>
          <span>Trend</span>
        </div>
        <div className="space-y-1">
          {data.keywords.map((k) => (
            <div key={k.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-2 py-1.5 rounded border border-border text-xs">
              <span className="truncate text-foreground">{k.keyword}</span>
              {priorityBadge(k.priority)}
              <span className={`w-16 text-right font-mono ${k.currentRank !== null && k.currentRank <= 3 ? 'text-emerald-600 font-semibold' : k.currentRank === null ? 'text-muted-foreground' : ''}`}>
                {k.currentRank === null ? 'not in top 20' : `#${k.currentRank}`}
              </span>
              <Sparkline history={k.history} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

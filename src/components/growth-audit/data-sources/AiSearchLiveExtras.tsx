// Per-venue AI Search visibility panel rendered inside Data Sources.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowUp, ArrowDown, Minus, Loader2, Check, X } from 'lucide-react';
import { useAiSearchSummary, type AiQueryTrend, type Engine } from './useAiSearchSummary';

const trendIcon = (direction: 'up' | 'down' | 'flat') => {
  if (direction === 'up') return <ArrowUp className="w-3 h-3 text-emerald-600" />;
  if (direction === 'down') return <ArrowDown className="w-3 h-3 text-orange-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const Sparkline = ({ history }: { history: AiQueryTrend['history'] }) => {
  if (history.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  const values = history.map((h) => h.hitRate);
  const w = 80, h = 20;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - v * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="text-emerald-600">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
    </svg>
  );
};

const priorityBadge = (p: AiQueryTrend['priority']) => {
  const cls = p === 'high'
    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
    : p === 'medium'
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-muted text-muted-foreground border-border';
  return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{p}</Badge>;
};

const ENGINE_LABEL: Record<Engine, string> = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity',
};

export const AiSearchLiveExtras = ({
  venueId, venueName,
}: { venueId: string; venueName: string }) => {
  const { data, isLoading } = useAiSearchSummary(venueId);

  if (isLoading) {
    return (
      <Card className="p-4 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 inline animate-spin mr-2" /> Loading AI search data…
      </Card>
    );
  }

  if (!data || !data.hasQueries) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs text-muted-foreground">
            No AI Search queries tracked for {venueName} yet. An admin can add them in
            Growth Audit → Launch → AI Search Queries.
          </div>
        </div>
      </Card>
    );
  }

  const hitPct = data.hitRate !== null ? Math.round(data.hitRate * 100) : null;
  const highPct = data.highHitRate !== null ? Math.round(data.highHitRate * 100) : null;
  const lastCheckedDays = data.lastCheckedAt
    ? Math.round((Date.now() - Date.parse(data.lastCheckedAt)) / 86_400_000) : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-600">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">AI Search visibility · {venueName}</h4>
          <p className="text-[11px] text-muted-foreground">
            {data.totalQueries} tracked · {data.highPriorityCount} high-priority ·
            {' '}{lastCheckedDays === null ? 'never checked' : lastCheckedDays === 0 ? 'checked today' : `${lastCheckedDays}d ago`}
            {!data.perplexityActive && (
              <span className="ml-2 text-amber-600">· Perplexity inactive (no API key)</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall mention rate</div>
          <div className="text-xl font-semibold text-foreground mt-1">{hitPct === null ? '—' : `${hitPct}%`}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            {trendIcon(data.trend)}
            <span>{data.trend === 'flat' ? 'flat vs last run' : data.trend === 'up' ? 'improving' : 'declining'}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">High-priority hit rate</div>
          <div className="text-xl font-semibold text-foreground mt-1">{highPct === null ? '—' : `${highPct}%`}</div>
          <div className="text-[10px] text-muted-foreground">across {data.highPriorityCount} queries</div>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Engines</div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {(Object.keys(ENGINE_LABEL) as Engine[]).map((eng) => {
              const e = data.perEngine[eng];
              const pct = e.checks > 0 ? Math.round((e.mentions / e.checks) * 100) : null;
              return (
                <div key={eng} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{ENGINE_LABEL[eng]}</span>
                  <span className={e.skipped ? 'text-muted-foreground italic' : 'text-foreground font-mono'}>
                    {e.skipped ? '—' : pct === null ? '·' : `${pct}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-[1fr_auto_repeat(4,_36px)_60px_80px] gap-2 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Query</span>
          <span>Pri</span>
          {(Object.keys(ENGINE_LABEL) as Engine[]).map((e) => (
            <span key={e} className="text-center">{ENGINE_LABEL[e].slice(0, 4)}</span>
          ))}
          <span className="text-right">Hit %</span>
          <span>Trend</span>
        </div>
        <div className="space-y-1">
          {data.queries.map((q) => (
            <div key={q.id} className="grid grid-cols-[1fr_auto_repeat(4,_36px)_60px_80px] gap-2 items-center px-2 py-1.5 rounded border border-border text-xs">
              <span className="truncate text-foreground" title={q.query}>{q.query}</span>
              {priorityBadge(q.priority)}
              {(Object.keys(ENGINE_LABEL) as Engine[]).map((eng) => {
                const r = q.perEngine[eng];
                if (!r) return <span key={eng} className="text-center text-muted-foreground">·</span>;
                if (r.mentioned === null) return <span key={eng} className="text-center text-muted-foreground">·</span>;
                return (
                  <span key={eng} className="text-center">
                    {r.mentioned
                      ? <Check className="w-3 h-3 text-emerald-600 inline" />
                      : <X className="w-3 h-3 text-muted-foreground/60 inline" />}
                    {r.position && r.mentioned && (
                      <span className="text-[9px] text-muted-foreground ml-0.5">#{r.position}</span>
                    )}
                  </span>
                );
              })}
              <span className={`text-right font-mono ${q.hitRate !== null && q.hitRate >= 0.75 ? 'text-emerald-600 font-semibold' : ''}`}>
                {q.hitRate === null ? '—' : `${Math.round(q.hitRate * 100)}%`}
              </span>
              <Sparkline history={q.history} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

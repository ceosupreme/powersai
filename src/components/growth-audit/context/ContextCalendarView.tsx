// Growth Audit — Context Calendar
// 30-day grid of context_items per venue with coverage status drawn from
// active marketing campaigns. Read-only view; click an item to jump to the
// originating finding (if one exists).

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CloudSun, Newspaper, Trophy, Ticket, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { useFindings } from '@/components/growth-audit/findings/useFindings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ContextItem = {
  id: string;
  source_type: 'calendar' | 'weather' | 'news' | 'sports' | 'events';
  source_ref: string;
  event_date: string;
  payload: any;
};

type Campaign = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

const SOURCE_META: Record<string, { icon: typeof Calendar; label: string; tone: string }> = {
  calendar: { icon: Calendar, label: 'Calendar', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  weather:  { icon: CloudSun, label: 'Weather', tone: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
  news:     { icon: Newspaper, label: 'News', tone: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  sports:   { icon: Trophy, label: 'Sports', tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  events:   { icon: Ticket, label: 'Events', tone: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30' },
};

const ContextCalendarView = () => {
  const { selectedBar } = useApp();
  const { toast } = useToast();
  const venueId = selectedBar?.id ?? null;

  const [items, setItems] = useState<ContextItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const findingsQ = useFindings(venueId);

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const load = async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const [{ data: ci }, { data: mc }] = await Promise.all([
        supabase.from('context_items')
          .select('id, source_type, source_ref, event_date, payload')
          .eq('venue_id', venueId)
          .gte('event_date', today)
          .lte('event_date', horizon)
          .order('event_date'),
        supabase.from('marketing_campaigns')
          .select('id, title, start_date, end_date, status')
          .eq('venue_id', venueId)
          .in('status', ['Live', 'Scheduled', 'Ongoing', 'Draft'])
          .gte('end_date', today)
          .lte('start_date', horizon),
      ]);
      setItems((ci ?? []) as ContextItem[]);
      setCampaigns((mc ?? []) as Campaign[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [venueId]);

  const findingByRef = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of findingsQ.data ?? []) {
      const meta = (f as any).metadata ?? {};
      if ((f as any).typeId === 'context_marketing_opportunity' && meta.source_ref) {
        map.set(`${meta.source_type}:${meta.source_ref}`, f.id);
      }
    }
    return map;
  }, [findingsQ.data]);

  const isCovered = (item: ContextItem): Campaign | null => {
    const tokens = String(item.payload?.title ?? '').toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    for (const c of campaigns) {
      if (item.event_date < c.start_date || item.event_date > c.end_date) continue;
      const hay = c.title.toLowerCase();
      if (tokens.some((t) => hay.includes(t))) return c;
    }
    return null;
  };

  const refresh = async () => {
    if (!venueId) return;
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('context-sources-pull', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      toast({ title: 'Context sources refreshed' });
      await load();
    } catch (e: any) {
      toast({ title: 'Refresh failed', description: e?.message ?? 'Unknown', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  if (!venueId) {
    return <Card className="p-6 text-sm text-muted-foreground">Select a venue.</Card>;
  }

  // Group by date
  const byDate = new Map<string, ContextItem[]>();
  for (const it of items) {
    if (!byDate.has(it.event_date)) byDate.set(it.event_date, []);
    byDate.get(it.event_date)!.push(it);
  }
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Context Calendar</h2>
          <p className="text-xs text-muted-foreground">
            Next 30 days — upcoming dates, weather, events that may need marketing.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-1.5">
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh sources
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : dates.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No context items cached. Hit "Refresh sources" to pull weather, news, sports, and events.
        </Card>
      ) : (
        <div className="space-y-2">
          {dates.map((d) => (
            <Card key={d} className="p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{d}</div>
              <div className="grid gap-1.5">
                {byDate.get(d)!.map((it) => {
                  const meta = SOURCE_META[it.source_type] ?? SOURCE_META.calendar;
                  const Icon = meta.icon;
                  const cov = isCovered(it);
                  const findingId = findingByRef.get(`${it.source_type}:${it.source_ref}`);
                  return (
                    <div
                      key={it.id}
                      className="flex items-start gap-2 p-2 rounded-md border border-border/40 hover:bg-muted/30 transition"
                    >
                      <Badge variant="outline" className={cn('text-[10px] gap-1', meta.tone)}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{it.payload?.title ?? it.source_ref}</div>
                        {it.payload?.summary && (
                          <div className="text-[11px] text-muted-foreground truncate">{it.payload.summary}</div>
                        )}
                      </div>
                      {cov ? (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> {cov.title.slice(0, 24)}
                        </Badge>
                      ) : findingId ? (
                        <Link
                          to={`/growth-audit?subtab=findings&finding=${findingId}`}
                          className="shrink-0"
                        >
                          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> Open finding
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0 bg-muted text-muted-foreground">
                          Uncovered
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContextCalendarView;

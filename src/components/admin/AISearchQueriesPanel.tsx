// Admin: per-venue AI Search query editor.
// Mirrors MapPackKeywordsPanel: list venues, manage queries with priority,
// suggest via AI, and Trigger Now (1h cooldown per venue).

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles, Loader2, Plus, Trash2, PlayCircle, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

type QueryRow = {
  id: string;
  venue_id: string;
  query: string;
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  last_checked_at: string | null;
  consecutive_failures: number;
  source_keyword_id: string | null;
};

type Suggestion = {
  query: string;
  priority: 'high' | 'medium' | 'low';
  rationale?: string;
  source_keyword_id?: string | null;
};

const KEY = (venueId: string) => ['admin', 'ai-search', 'queries', venueId] as const;
const SOFT_CAP = 15;

function useQueries(venueId: string) {
  return useQuery({
    queryKey: KEY(venueId),
    queryFn: async () => {
      const [q, t] = await Promise.all([
        supabase.from('ai_search_queries').select('*').eq('venue_id', venueId).order('priority').order('query'),
        supabase.from('ai_search_trigger_log').select('last_triggered_at').eq('venue_id', venueId).maybeSingle(),
      ]);
      if (q.error) throw q.error;
      return {
        queries: (q.data ?? []) as QueryRow[],
        lastTriggeredAt: t.data?.last_triggered_at ?? null,
      };
    },
    staleTime: 15_000,
  });
}

const priorityBadge = (p: QueryRow['priority']) => {
  const cls = p === 'high'
    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
    : p === 'medium'
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-muted text-muted-foreground border-border';
  return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{p}</Badge>;
};

const SuggestDialog = ({
  venueId, venueName, open, onOpenChange, onAccept,
}: {
  venueId: string;
  venueName: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onAccept: (rows: Suggestion[]) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchSuggestions = async () => {
    setLoading(true); setSuggestions([]); setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('ai-search-suggest-queries', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const items = ((data as any)?.queries ?? []) as Suggestion[];
      setSuggestions(items);
      setSelected(new Set(items.map((_, i) => i)));
    } catch (e) {
      toast.error('Suggestion failed', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b && suggestions.length === 0) fetchSuggestions(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI search query suggestions · {venueName}</DialogTitle>
          <DialogDescription>
            Real-sounding questions a customer might ask ChatGPT/Claude/Gemini. Pulled from this venue's GBP, keywords, and review themes.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Generating…
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground text-center">No suggestions returned.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {suggestions.map((s, i) => (
              <label key={i} className="flex items-start gap-3 p-2 rounded border border-border hover:bg-muted/40 cursor-pointer">
                <Checkbox
                  checked={selected.has(i)}
                  onCheckedChange={(c) => {
                    const next = new Set(selected);
                    if (c) next.add(i); else next.delete(i);
                    setSelected(next);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.query}</span>
                    {priorityBadge(s.priority)}
                  </div>
                  {s.rationale && <p className="text-xs text-muted-foreground mt-0.5">{s.rationale}</p>}
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={selected.size === 0 || loading}
            onClick={() => {
              const picks = [...selected].map((i) => suggestions[i]).filter(Boolean);
              onAccept(picks);
              onOpenChange(false);
            }}
          >
            Add {selected.size} quer{selected.size === 1 ? 'y' : 'ies'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const VenuePanel = ({ venueId, venueName }: { venueId: string; venueName: string }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQueries(venueId);
  const [newQuery, setNewQuery] = useState('');
  const [newPriority, setNewPriority] = useState<QueryRow['priority']>('medium');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const queries = data?.queries ?? [];
  const overCap = queries.length >= SOFT_CAP;

  const upsert = useMutation({
    mutationFn: async (payload: { queries?: any[]; delete_ids?: string[] }) => {
      const { data: res, error } = await supabase.functions.invoke('ai-search-queries-upsert', {
        body: { venue_id: venueId, ...payload },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(venueId) }),
    onError: (e) => toast.error('Save failed', { description: (e as Error).message }),
  });

  const addQuery = () => {
    const trimmed = newQuery.trim();
    if (!trimmed) return;
    upsert.mutate({ queries: [{ query: trimmed, priority: newPriority }] });
    setNewQuery('');
  };

  const updateRow = (id: string, patch: Partial<QueryRow>) => upsert.mutate({ queries: [{ id, ...patch }] });
  const removeRow = (id: string) => upsert.mutate({ delete_ids: [id] });

  const trigger = async () => {
    setTriggering(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-search-run', {
        body: { venue_id: venueId, trigger_source: 'manual' },
      });
      if (error) {
        toast.warning((error as any)?.message || 'Trigger failed');
      } else if ((res as any)?.error) {
        toast.warning((res as any).error);
      } else {
        const r = res as any;
        toast.success(`Tested ${r.queries_tested} engine call${r.queries_tested === 1 ? '' : 's'} — ${r.mentions_found} mention${r.mentions_found === 1 ? '' : 's'}`);
        qc.invalidateQueries({ queryKey: KEY(venueId) });
      }
    } catch (e) {
      toast.error('Trigger failed', { description: (e as Error).message });
    } finally {
      setTriggering(false);
    }
  };

  const lastTriggeredMins = data?.lastTriggeredAt
    ? Math.floor((Date.now() - Date.parse(data.lastTriggeredAt)) / 60_000) : null;
  const triggerBlocked = lastTriggeredMins !== null && lastTriggeredMins < 60;
  const triggerHint = triggerBlocked
    ? `Wait ${60 - (lastTriggeredMins ?? 0)}m before retriggering`
    : 'Re-test all queries now';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{venueName}</h4>
          <p className="text-[11px] text-muted-foreground">
            {queries.length} / {SOFT_CAP} queries
            {overCap && <span className="ml-2 text-orange-600">· soft cap reached</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setSuggestOpen(true)} className="gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggest queries
          </Button>
          <Button size="sm" variant="outline" onClick={trigger}
            disabled={triggering || triggerBlocked || queries.length === 0}
            className="gap-1.5" title={triggerHint}>
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
            Trigger now
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-3 text-center">
          <Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Loading…
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {queries.map((q) => (
              <div key={q.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs px-2 py-1.5 rounded border border-border bg-card">
                <Input
                  defaultValue={q.query}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== q.query) updateRow(q.id, { query: v });
                  }}
                  className="h-7 text-xs"
                />
                <Select value={q.priority} onValueChange={(v) => updateRow(q.id, { priority: v as any })}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground min-w-[60px] text-right">
                  {q.last_checked_at
                    ? `${Math.round((Date.now() - Date.parse(q.last_checked_at)) / 86_400_000)}d ago`
                    : 'never'}
                </span>
                <div className="flex items-center gap-1">
                  {q.consecutive_failures >= 3 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1" title={`${q.consecutive_failures} consecutive failures`}>
                      <AlertTriangle className="w-3 h-3" />
                    </Badge>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRow(q.id)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            {queries.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No queries yet — click <span className="font-medium">Suggest queries</span> or add one below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-3">
            <Input
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder='e.g. "Best marketing agency in San Diego?"'
              className="h-8 text-xs"
              disabled={overCap}
              onKeyDown={(e) => { if (e.key === 'Enter') addQuery(); }}
            />
            <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addQuery} disabled={overCap || !newQuery.trim()} className="gap-1.5">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </>
      )}

      <SuggestDialog
        venueId={venueId} venueName={venueName}
        open={suggestOpen} onOpenChange={setSuggestOpen}
        onAccept={(rows) => {
          if (!rows.length) return;
          const existing = new Set(queries.map((q) => q.query.toLowerCase()));
          const fresh = rows.filter((r) => !existing.has(r.query.toLowerCase()));
          const room = Math.max(0, SOFT_CAP - queries.length);
          const toAdd = fresh.slice(0, room);
          if (toAdd.length < fresh.length) {
            toast.warning(`Soft cap of ${SOFT_CAP} reached — only added ${toAdd.length} of ${fresh.length}.`);
          }
          if (toAdd.length) upsert.mutate({ queries: toAdd });
        }}
      />
    </Card>
  );
};

export const AISearchQueriesPanel = () => {
  const { bars } = useApp();
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (bars ?? [])
      .filter((b) => !f || b.bar_name.toLowerCase().includes(f))
      .sort((a, b) => a.bar_name.localeCompare(b.bar_name));
  }, [bars, filter]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">AI Search Queries</h3>
          <p className="text-xs text-muted-foreground">
            Track whether ChatGPT, Claude, Gemini, and Perplexity recommend each venue. Weekly cron + on-demand trigger (1h cooldown). Perplexity activates automatically when the API key is added.
          </p>
        </div>
        <Input placeholder="Filter venues…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>

      <div className="space-y-3">
        {rows.map((b) => (
          <VenuePanel key={b.id} venueId={b.id} venueName={b.bar_name} />
        ))}
      </div>
    </Card>
  );
};

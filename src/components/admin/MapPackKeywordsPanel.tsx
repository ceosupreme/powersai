// Admin: per-venue Map Pack ranking keyword editor.
// Lists each venue, shows tracked keywords with priority/rank/trend, and
// supports AI suggestion + manual editing + Trigger Now (rate-limited 1h).

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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, Loader2, Plus, Trash2, Sparkles, PlayCircle, ArrowUp, ArrowDown, Minus, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

type KeywordRow = {
  id: string;
  venue_id: string;
  keyword: string;
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  last_checked_at: string | null;
  consecutive_failures: number;
};

type LatestSnap = {
  keyword_id: string | null;
  rank: number | null;
  checked_at: string;
};

type Suggestion = { keyword: string; priority: 'high' | 'medium' | 'low'; rationale?: string };

const KW_KEY = (venueId: string) => ['admin', 'map-pack', 'keywords', venueId] as const;
const SOFT_CAP = 20;

function useKeywords(venueId: string) {
  return useQuery({
    queryKey: KW_KEY(venueId),
    queryFn: async () => {
      const [k, s, t] = await Promise.all([
        supabase.from('map_pack_keywords').select('*').eq('venue_id', venueId).order('priority').order('keyword'),
        supabase.from('map_pack_snapshots')
          .select('keyword_id, rank, checked_at')
          .eq('venue_id', venueId)
          .order('checked_at', { ascending: false })
          .limit(500),
        supabase.from('map_pack_trigger_log').select('last_triggered_at').eq('venue_id', venueId).maybeSingle(),
      ]);
      if (k.error) throw k.error;
      if (s.error) throw s.error;

      // Group snapshots into latest + previous per keyword
      const latest = new Map<string, LatestSnap>();
      const prev = new Map<string, LatestSnap>();
      for (const row of (s.data ?? []) as LatestSnap[]) {
        const id = row.keyword_id;
        if (!id) continue;
        if (!latest.has(id)) latest.set(id, row);
        else if (!prev.has(id)) prev.set(id, row);
      }

      return {
        keywords: (k.data ?? []) as KeywordRow[],
        latest, prev,
        lastTriggeredAt: t.data?.last_triggered_at ?? null,
      };
    },
    staleTime: 15_000,
  });
}

const trendIcon = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (current < previous) return <ArrowUp className="w-3 h-3 text-emerald-600" />;
  if (current > previous) return <ArrowDown className="w-3 h-3 text-orange-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const priorityBadge = (p: KeywordRow['priority']) => {
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
    setLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('map-pack-suggest-keywords', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const items = ((data as any)?.keywords ?? []) as Suggestion[];
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
          <DialogTitle>AI keyword suggestions · {venueName}</DialogTitle>
          <DialogDescription>
            Pulled from this venue's GBP categories and positive review themes. Select the ones to add.
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
                    <span className="text-sm font-medium">{s.keyword}</span>
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
            Add {selected.size} keyword{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const VenuePanel = ({ venueId, venueName }: { venueId: string; venueName: string }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useKeywords(venueId);
  const [newKeyword, setNewKeyword] = useState('');
  const [newPriority, setNewPriority] = useState<KeywordRow['priority']>('medium');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const keywords = data?.keywords ?? [];
  const overCap = keywords.length >= SOFT_CAP;

  const upsert = useMutation({
    mutationFn: async (payload: { keywords?: any[]; delete_ids?: string[] }) => {
      const { data: res, error } = await supabase.functions.invoke('map-pack-keywords-upsert', {
        body: { venue_id: venueId, ...payload },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KW_KEY(venueId) });
    },
    onError: (e) => toast.error('Save failed', { description: (e as Error).message }),
  });

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    upsert.mutate({ keywords: [{ keyword: trimmed, priority: newPriority }] });
    setNewKeyword('');
  };

  const updateRow = (id: string, patch: Partial<KeywordRow>) => {
    upsert.mutate({ keywords: [{ id, ...patch }] });
  };

  const removeRow = (id: string) => upsert.mutate({ delete_ids: [id] });

  const trigger = async () => {
    setTriggering(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('map-pack-run', {
        body: { venue_id: venueId, trigger_source: 'manual' },
      });
      if (error) {
        // 429 from edge function — message is in error
        const msg = (error as any)?.message || 'Trigger failed';
        toast.warning(msg);
      } else if ((res as any)?.error) {
        toast.warning((res as any).error);
      } else {
        const r = res as any;
        toast.success(`Queried ${r.keywords_queried} keyword${r.keywords_queried === 1 ? '' : 's'}`);
        qc.invalidateQueries({ queryKey: KW_KEY(venueId) });
      }
    } catch (e) {
      toast.error('Trigger failed', { description: (e as Error).message });
    } finally {
      setTriggering(false);
    }
  };

  const lastTriggeredMins = data?.lastTriggeredAt
    ? Math.floor((Date.now() - Date.parse(data.lastTriggeredAt)) / 60_000)
    : null;
  const triggerBlocked = lastTriggeredMins !== null && lastTriggeredMins < 60;
  const triggerHint = triggerBlocked
    ? `Wait ${60 - (lastTriggeredMins ?? 0)}m before retriggering`
    : 'Re-query all keywords now';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{venueName}</h4>
          <p className="text-[11px] text-muted-foreground">
            {keywords.length} / {SOFT_CAP} keywords
            {overCap && (
              <span className="ml-2 text-orange-600">
                · soft cap reached
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setSuggestOpen(true)} className="gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggest keywords
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={trigger}
            disabled={triggering || triggerBlocked || keywords.length === 0}
            className="gap-1.5"
            title={triggerHint}
          >
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
            {keywords.map((k) => {
              const latest = data?.latest.get(k.id);
              const prev = data?.prev.get(k.id);
              const rankLabel = latest?.rank == null ? '—' : `#${latest.rank}`;
              return (
                <div key={k.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center text-xs px-2 py-1.5 rounded border border-border bg-card">
                  <Input
                    value={k.keyword}
                    onChange={(e) => {
                      const v = e.target.value;
                      // local optimistic update via cache mutate is overkill; debounce via onBlur
                      (e.target as HTMLInputElement).dataset.next = v;
                    }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== k.keyword) updateRow(k.id, { keyword: v });
                    }}
                    className="h-7 text-xs"
                  />
                  <Select value={k.priority} onValueChange={(v) => updateRow(k.id, { priority: v as any })}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 min-w-[72px] justify-center">
                    <span className={`font-mono ${latest?.rank != null && latest.rank <= 3 ? 'text-emerald-600 font-semibold' : ''}`}>
                      {rankLabel}
                    </span>
                    {trendIcon(latest?.rank ?? null, prev?.rank ?? null)}
                  </div>
                  <span className="text-[10px] text-muted-foreground min-w-[60px] text-right">
                    {k.last_checked_at
                      ? `${Math.round((Date.now() - Date.parse(k.last_checked_at)) / 86_400_000)}d ago`
                      : 'never'}
                  </span>
                  <div className="flex items-center gap-1">
                    {k.consecutive_failures >= 3 && (
                      <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1" title={`${k.consecutive_failures} consecutive failures`}>
                        <AlertTriangle className="w-3 h-3" />
                      </Badge>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRow(k.id)}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {keywords.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No keywords yet — click <span className="font-medium">Suggest keywords</span> or add one below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-3">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. marketing agency san diego"
              className="h-8 text-xs"
              disabled={overCap}
              onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }}
            />
            <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addKeyword} disabled={overCap || !newKeyword.trim()} className="gap-1.5">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </>
      )}

      <SuggestDialog
        venueId={venueId}
        venueName={venueName}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        onAccept={(rows) => {
          if (!rows.length) return;
          // Filter dupes and respect soft cap
          const existing = new Set(keywords.map((k) => k.keyword.toLowerCase()));
          const fresh = rows.filter((r) => !existing.has(r.keyword.toLowerCase()));
          const room = Math.max(0, SOFT_CAP - keywords.length);
          const toAdd = fresh.slice(0, room);
          if (toAdd.length < fresh.length) {
            toast.warning(`Soft cap of ${SOFT_CAP} reached — only added ${toAdd.length} of ${fresh.length}.`);
          }
          if (toAdd.length) upsert.mutate({ keywords: toAdd });
        }}
      />
    </Card>
  );
};

export const MapPackKeywordsPanel = () => {
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
        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
          <Search className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Map Pack Keywords</h3>
          <p className="text-xs text-muted-foreground">
            Track each venue's Google local search rank for high-intent keywords. Weekly cron + on-demand trigger (1h cooldown).
          </p>
        </div>
        <Input
          placeholder="Filter venues…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-3">
        {rows.map((b) => (
          <VenuePanel key={b.id} venueId={b.id} venueName={b.bar_name} />
        ))}
      </div>
    </Card>
  );
};

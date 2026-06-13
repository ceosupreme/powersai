// Admin: per-venue programming context configuration. Edits flow through
// the venue_programming_context table; "AI Suggest" calls the
// context-programming-suggest edge function which writes the suggestion
// (admin must review + Save to confirm).

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Save, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useVenues } from '@/hooks/useVenueData';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  'sports_bar','music_venue','cocktail_lounge','dive_bar','brunch_spot',
  'neighborhood_pub','family_friendly','late_night','other',
] as const;

type Row = {
  venue_id: string;
  primary_category: string | null;
  audience_demographics: string[];
  programming_features: string[];
  themes: string[];
  ai_suggestion: any | null;
  ai_suggested_at: string | null;
  confirmed_at: string | null;
};

const empty = (vid: string): Row => ({
  venue_id: vid, primary_category: null,
  audience_demographics: [], programming_features: [], themes: [],
  ai_suggestion: null, ai_suggested_at: null, confirmed_at: null,
});

export const VenueProgrammingContextPanel = () => {
  const { toast } = useToast();
  const { data: venues = [] } = useVenues();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('venue_programming_context')
        .select('venue_id, primary_category, audience_demographics, programming_features, themes, ai_suggestion, ai_suggested_at, confirmed_at');
      if (error) { console.error(error); return; }
      const map: Record<string, Row> = {};
      for (const r of (data ?? []) as any[]) map[r.venue_id] = r;
      setRows(map);
    })();
  }, []);

  const get = (vid: string): Row => rows[vid] ?? empty(vid);

  const update = (vid: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [vid]: { ...get(vid), ...patch } }));

  const save = async (vid: string) => {
    setBusy(vid);
    const r = get(vid);
    const { error } = await supabase
      .from('venue_programming_context')
      .upsert({
        venue_id: vid,
        primary_category: r.primary_category,
        audience_demographics: r.audience_demographics,
        programming_features: r.programming_features,
        themes: r.themes,
        confirmed_at: new Date().toISOString(),
      }, { onConflict: 'venue_id' });
    setBusy(null);
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Programming context saved' });
  };

  const aiSuggest = async (vid: string) => {
    setAiBusy(vid);
    try {
      const { data, error } = await supabase.functions.invoke('context-programming-suggest', {
        body: { venue_id: vid },
      });
      if (error) throw error;
      const s = (data as any)?.suggestion;
      if (s) {
        update(vid, {
          primary_category: s.primary_category,
          audience_demographics: s.audience_demographics ?? [],
          programming_features: s.programming_features ?? [],
          themes: s.themes ?? [],
          ai_suggestion: s,
          ai_suggested_at: new Date().toISOString(),
        });
        toast({ title: 'AI suggestion ready', description: 'Review and Save to confirm.' });
      }
    } catch (e: any) {
      toast({ title: 'AI suggest failed', description: e?.message ?? 'Unknown', variant: 'destructive' });
    } finally {
      setAiBusy(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/15 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Venue Programming Context</h3>
          <p className="text-xs text-muted-foreground">
            Drives the Local Context analyzer's relevance matching. Set the primary category and
            tag features/themes that describe what this venue actually programs.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {venues.map((v) => {
          const r = get(v.id);
          return (
            <div key={v.id} className="border border-border/40 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-foreground">{v.name}</div>
                <div className="flex items-center gap-2">
                  {r.confirmed_at && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Confirmed
                    </Badge>
                  )}
                  {r.ai_suggested_at && !r.confirmed_at && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                      AI suggested — review
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => aiSuggest(v.id)} disabled={aiBusy === v.id} className="gap-1.5">
                    {aiBusy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Suggest
                  </Button>
                  <Button size="sm" onClick={() => save(v.id)} disabled={busy === v.id} className="gap-1.5">
                    {busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Primary category</Label>
                  <Select value={r.primary_category ?? ''} onValueChange={(val) => update(v.id, { primary_category: val })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <TagField label="Audience demographics" value={r.audience_demographics}
                  onChange={(v2) => update(v.id, { audience_demographics: v2 })} />
                <TagField label="Programming features" value={r.programming_features}
                  onChange={(v2) => update(v.id, { programming_features: v2 })} />
                <TagField label="Themes" value={r.themes}
                  onChange={(v2) => update(v.id, { themes: v2 })} />
              </div>

              {r.ai_suggestion?.rationale && (
                <div className="text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                  AI rationale: {r.ai_suggestion.rationale}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const TagField = ({
  label, value, onChange,
}: { label: string; value: string[]; onChange: (v: string[]) => void }) => {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1.5">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add and press +" className="text-xs" />
        <Button
          type="button" size="icon" variant="outline"
          onClick={() => { if (draft.trim()) { onChange([...value, draft.trim()]); setDraft(''); } }}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map((t, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1">
              {t}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

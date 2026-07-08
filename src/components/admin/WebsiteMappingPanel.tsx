// Admin: per-venue website URL mapping editor.
// Lists every venue, shows current URL + last crawl freshness, allows
// manually setting a URL, marking manual-only, or triggering resolve/crawl.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe, Loader2, RefreshCw, Save, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

type Mapping = {
  venue_id: string;
  website_url: string | null;
  canonical_url: string | null;
  cms_detected: string | null;
  js_heavy: boolean;
  manual_only: boolean;
  consecutive_fetch_failures: number;
  last_resolved_at: string | null;
  last_resolve_error: string | null;
};

type SnapMeta = { venue_id: string; captured_at: string; scope: string; fetch_error: string | null };

const KEY = ['admin', 'website', 'mappings'] as const;

function useMappings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [m, s] = await Promise.all([
        supabase.from('website_mappings').select(
          'venue_id, website_url, canonical_url, cms_detected, js_heavy, manual_only, consecutive_fetch_failures, last_resolved_at, last_resolve_error',
        ),
        supabase.from('website_snapshots').select('venue_id, captured_at, scope, fetch_error')
          .eq('scope', 'weekly_full')
          .order('captured_at', { ascending: false }).limit(500),
      ]);
      if (m.error) throw m.error;
      if (s.error) throw s.error;
      const latestByVenue = new Map<string, SnapMeta>();
      for (const row of (s.data ?? []) as SnapMeta[]) {
        if (!latestByVenue.has(row.venue_id)) latestByVenue.set(row.venue_id, row);
      }
      return {
        mappings: (m.data ?? []) as Mapping[],
        latestSnapByVenue: latestByVenue,
      };
    },
    staleTime: 30_000,
  });
}

const VenueRow = ({
  venueId, venueName, mapping, snap,
}: {
  venueId: string;
  venueName: string;
  mapping: Mapping | undefined;
  snap: SnapMeta | undefined;
}) => {
  const qc = useQueryClient();
  const [url, setUrl] = useState(mapping?.website_url ?? '');
  const [manualOnly, setManualOnly] = useState(mapping?.manual_only ?? false);
  const [resolving, setResolving] = useState(false);
  const [crawling, setCrawling] = useState(false);

  const dirty =
    (url.trim() || null) !== (mapping?.website_url ?? null) ||
    manualOnly !== (mapping?.manual_only ?? false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('website_mappings').upsert({
        venue_id: venueId,
        website_url: url.trim() || null,
        manual_only: manualOnly,
        consecutive_fetch_failures: 0,
        last_resolve_error: null,
      } as any, { onConflict: 'venue_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapping saved');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e) => toast.error('Save failed', { description: (e as Error).message }),
  });

  const resolve = async () => {
    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('website-resolve-url', {
        body: { venue_id: venueId, website_url: url.trim() || undefined },
      });
      if (error) throw error;
      const canonical = (data as any)?.canonical_url;
      if (canonical) {
        toast.success(`Resolved: ${canonical}`);
      } else {
        toast.warning('Could not resolve URL', {
          description: (data as any)?.error ?? 'Enter a URL above and try again.',
        });
      }
      qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error('Resolve failed', { description: (e as Error).message });
    } finally {
      setResolving(false);
    }
  };

  const crawl = async () => {
    setCrawling(true);
    try {
      const { error } = await supabase.functions.invoke('website-crawl-weekly', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      toast.success('Crawl dispatched');
      qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error('Crawl failed', { description: (e as Error).message });
    } finally {
      setCrawling(false);
    }
  };

  const failures = mapping?.consecutive_fetch_failures ?? 0;
  const ageDays = snap ? Math.round((Date.now() - Date.parse(snap.captured_at)) / 86_400_000) : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground">{venueName}</h4>
            {mapping?.canonical_url ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Mapped
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <AlertTriangle className="w-3 h-3" /> Unmapped
              </Badge>
            )}
            {mapping?.manual_only && (
              <Badge variant="outline" className="text-[10px]">Manual only</Badge>
            )}
            {mapping?.cms_detected && (
              <Badge variant="outline" className="text-[10px]">{mapping.cms_detected}</Badge>
            )}
            {mapping?.js_heavy && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                JS-heavy
              </Badge>
            )}
            {snap && (
              <Badge variant="outline" className="text-[10px] bg-muted/40">
                Crawl {snap.fetch_error ? 'errored' : 'OK'} · {ageDays}d ago
              </Badge>
            )}
            {failures >= 3 && (
              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                {failures} failures
              </Badge>
            )}
          </div>
          {mapping?.canonical_url && (
            <p className="text-[11px] text-muted-foreground mt-1 font-mono truncate">
              canonical: {mapping.canonical_url}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Website URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://venue.com"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2 rounded border border-border px-3 py-2">
          <Switch checked={manualOnly} onCheckedChange={setManualOnly} />
          <Label className="text-xs whitespace-nowrap">Manual only</Label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" disabled={resolving} onClick={resolve} className="gap-1.5">
            {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Resolve
          </Button>
          <Button size="sm" variant="outline" disabled={crawling || !mapping?.canonical_url} onClick={crawl} className="gap-1.5">
            {crawling ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
            Crawl
          </Button>
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="gap-1.5">
            {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
        </div>
      </div>

      {mapping?.last_resolve_error && (
        <p className="text-[11px] text-orange-600 mt-2">
          Last error: {mapping.last_resolve_error}
        </p>
      )}
    </Card>
  );
};

export const WebsiteMappingPanel = () => {
  const { bars } = useApp();
  const { data, isLoading } = useMappings();
  const [filter, setFilter] = useState('');

  const byVenue = useMemo(() => {
    const m = new Map<string, Mapping>();
    for (const row of data?.mappings ?? []) m.set(row.venue_id, row);
    return m;
  }, [data]);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (bars ?? [])
      .filter((b) => !f || b.bar_name.toLowerCase().includes(f))
      .sort((a, b) => a.bar_name.localeCompare(b.bar_name));
  }, [bars, filter]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
          <Globe className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Website Mappings</h3>
          <p className="text-xs text-muted-foreground">
            Map each project to a website URL. Crawler runs weekly; PageSpeed runs daily.
          </p>
        </div>
        <Input
          placeholder="Filter projects…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading mappings…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No projects match.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <VenueRow
              key={b.id}
              venueId={b.id}
              venueName={b.bar_name}
              mapping={byVenue.get(b.id)}
              snap={data?.latestSnapByVenue.get(b.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

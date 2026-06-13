// Admin: per-venue Google Business Profile place mapping editor.
// Lists every venue, shows current mapping + freshness, allows manually
// setting a place_id, marking manual-only, or triggering automated resolution.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, RefreshCw, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

type Mapping = {
  venue_id: string;
  place_id: string | null;
  manual_only: boolean;
  consecutive_fetch_failures: number;
  last_resolved_at: string | null;
  last_resolve_error: string | null;
};

type SnapMeta = { venue_id: string; captured_at: string; source: string };

const MAPPINGS_KEY = ['admin', 'gbp', 'mappings'] as const;

function useMappings() {
  return useQuery({
    queryKey: MAPPINGS_KEY,
    queryFn: async () => {
      const [m, s] = await Promise.all([
        supabase
          .from('gbp_place_mappings')
          .select('venue_id, place_id, manual_only, consecutive_fetch_failures, last_resolved_at, last_resolve_error'),
        supabase
          .from('gbp_snapshots')
          .select('venue_id, captured_at, source')
          .order('captured_at', { ascending: false })
          .limit(500),
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
  const [placeId, setPlaceId] = useState(mapping?.place_id ?? '');
  const [manualOnly, setManualOnly] = useState(mapping?.manual_only ?? false);
  const [resolving, setResolving] = useState(false);

  const dirty =
    (placeId.trim() || null) !== (mapping?.place_id ?? null) ||
    manualOnly !== (mapping?.manual_only ?? false);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gbp-admin-upsert-mapping', {
        body: {
          venue_id: venueId,
          place_id: placeId.trim() || null,
          manual_only: manualOnly,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast.success('Mapping saved');
      qc.invalidateQueries({ queryKey: MAPPINGS_KEY });
    },
    onError: (e) => toast.error('Save failed', { description: (e as Error).message }),
  });

  const resolve = async () => {
    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('gbp-resolve-place', {
        body: { venue_id: venueId, query: venueName },
      });
      if (error) throw error;
      const resolved = (data as any)?.place_id;
      if (resolved) {
        setPlaceId(resolved);
        toast.success(`Resolved: ${resolved}`);
      } else {
        toast.warning('No place ID resolved', {
          description: 'Try entering a Google Maps URL manually below.',
        });
      }
      qc.invalidateQueries({ queryKey: MAPPINGS_KEY });
    } catch (e) {
      toast.error('Resolve failed', { description: (e as Error).message });
    } finally {
      setResolving(false);
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
            {mapping?.place_id ? (
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
            {snap && (
              <Badge variant="outline" className="text-[10px] bg-muted/40">
                Snapshot {snap.source} · {ageDays}d ago
              </Badge>
            )}
            {failures >= 3 && (
              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                {failures} failures
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
            venue: {venueId}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Google Place ID</Label>
          <Input
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="ChIJ…"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2 rounded border border-border px-3 py-2">
          <Switch checked={manualOnly} onCheckedChange={setManualOnly} />
          <Label className="text-xs whitespace-nowrap">Manual only</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={resolving} onClick={resolve} className="gap-1.5">
            {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Resolve
          </Button>
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="gap-1.5">
            {save.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
        </div>
      </div>

      {mapping?.last_resolve_error && (
        <p className="text-[11px] text-orange-600 mt-2">
          Last resolve error: {mapping.last_resolve_error}
        </p>
      )}
    </Card>
  );
};

export const GbpPlaceMappingPanel = () => {
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
        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">GBP Place Mappings</h3>
          <p className="text-xs text-muted-foreground">
            Map each venue to a Google Place ID. Unmapped venues fall back to manual snapshots.
          </p>
        </div>
        <Input
          placeholder="Filter venues…"
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
        <p className="text-sm text-muted-foreground py-6 text-center">No venues match.</p>
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

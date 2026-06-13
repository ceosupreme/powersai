// Admin: per-venue Asana adapter configuration. The live_writes_enabled
// flag in venue_execution_adapters is the SINGLE source of truth — toggle
// reads/writes the DB row directly.

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plug, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useVenues } from '@/hooks/useVenueData';

type AdapterRow = {
  venue_id: string;
  adapter_type: string;
  asana_project_gid: string | null;
  asana_workspace_gid: string | null;
  asana_section_gid: string | null;
  asana_custom_field_map: Record<string, string> | null;
  live_writes_enabled: boolean;
  last_field_setup_at: string | null;
};

const isValidGid = (s: string) => /^[0-9]{10,20}$/.test(s);

export const VenueAdapterConfig = () => {
  const { toast } = useToast();
  const { data: venues = [] } = useVenues();
  const [rows, setRows] = useState<Record<string, AdapterRow>>({});
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('venue_execution_adapters').select('*');
      if (error) { console.error(error); return; }
      const map: Record<string, AdapterRow> = {};
      for (const r of data as any[]) map[r.venue_id] = r;
      setRows(map);
    })();
  }, []);

  const upsertLocal = (venueId: string, patch: Partial<AdapterRow>) => {
    setRows(prev => ({
      ...prev,
      [venueId]: {
        venue_id: venueId, adapter_type: 'asana',
        asana_project_gid: null, asana_workspace_gid: null, asana_section_gid: null,
        asana_custom_field_map: {}, live_writes_enabled: false,
        last_field_setup_at: null,
        ...prev[venueId], ...patch,
      },
    }));
  };

  const saveProjectGid = async (venueId: string, project_gid: string) => {
    const { error } = await supabase
      .from('venue_execution_adapters')
      .upsert({ venue_id: venueId, adapter_type: 'asana', asana_project_gid: project_gid });
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    upsertLocal(venueId, { asana_project_gid: project_gid });
    toast({ title: 'Project GID saved' });
  };

  const saveWorkspaceGid = async (venueId: string, workspace_gid: string) => {
    if (!isValidGid(workspace_gid)) {
      toast({ title: 'Invalid workspace GID', description: 'Must be a 10–20 digit numeric string.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('venue_execution_adapters')
      .upsert({ venue_id: venueId, adapter_type: 'asana', asana_workspace_gid: workspace_gid });
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    upsertLocal(venueId, { asana_workspace_gid: workspace_gid });
    toast({ title: 'Workspace GID saved' });
  };

  const runSetup = async (venueId: string) => {
    const row = rows[venueId];
    if (!row?.asana_project_gid || !row?.asana_workspace_gid) {
      toast({ title: 'Project GID and Workspace GID required', variant: 'destructive' }); return;
    }
    setLoading(venueId);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-asana-setup', {
        body: { venue_id: venueId, project_gid: row.asana_project_gid, workspace_gid: row.asana_workspace_gid },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      upsertLocal(venueId, {
        asana_section_gid: data.section_gid,
        asana_custom_field_map: data.custom_field_map,
        last_field_setup_at: new Date().toISOString(),
      });
      toast({
        title: 'Setup complete',
        description: data.created_fields?.length ? `Created: ${data.created_fields.join(', ')}` : 'All fields already exist.',
      });
    } catch (e: any) {
      toast({ title: 'Setup failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setLoading(null); }
  };

  const toggleLive = async (venueId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('venue_execution_adapters')
      .update({ live_writes_enabled: enabled })
      .eq('venue_id', venueId);
    if (error) { toast({ title: 'Toggle failed', description: error.message, variant: 'destructive' }); return; }
    upsertLocal(venueId, { live_writes_enabled: enabled });
    toast({ title: enabled ? 'Live writes ENABLED' : 'Live writes disabled' });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Plug className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold">Per-venue execution adapter</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Asana is the only adapter for now. The <code>live_writes_enabled</code> flag is the single
        source of truth for whether Supreme Team Media can create real Asana tasks for that venue. Run a dry-run
        preview from a campaign first; only flip this on after the dry-run looks correct.
      </p>

      <div className="space-y-3">
        {venues.map(v => {
          const row = rows[v.id];
          const setupOk = !!row?.asana_section_gid && !!row?.asana_custom_field_map && Object.keys(row.asana_custom_field_map).length >= 10;
          return (
            <div key={v.id} className="border border-border/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{v.name}</span>
                  {setupOk
                    ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" />Fields ready</Badge>
                    : <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1 text-[10px]"><AlertTriangle className="w-3 h-3" />Setup required</Badge>}
                  {row?.live_writes_enabled && <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Live writes ON</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-[11px]">Asana project GID</Label>
                  <Input
                    defaultValue={row?.asana_project_gid ?? ''}
                    placeholder="1212864048654137"
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val && val !== (row?.asana_project_gid ?? '')) saveProjectGid(v.id, val);
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Asana workspace GID</Label>
                  <Input
                    defaultValue={row?.asana_workspace_gid ?? ''}
                    placeholder="1199848756891234"
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val && val !== (row?.asana_workspace_gid ?? '')) saveWorkspaceGid(v.id, val);
                    }}
                    className={`h-8 text-xs ${row?.asana_workspace_gid && !isValidGid(row.asana_workspace_gid) ? 'border-destructive' : ''}`}
                  />
                </div>
                <Button
                  size="sm" variant="outline" onClick={() => runSetup(v.id)}
                  disabled={!row?.asana_project_gid || !row?.asana_workspace_gid || loading === v.id}
                >
                  {loading === v.id ? 'Setting up…' : setupOk ? 'Re-detect fields' : 'Detect / Create fields'}
                </Button>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-muted-foreground">
                  Section: <code>{row?.asana_section_gid ?? '—'}</code> · Last setup: {row?.last_field_setup_at ? new Date(row.last_field_setup_at).toLocaleString() : '—'}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`live-${v.id}`} className="text-xs">Enable live writes</Label>
                  <Switch
                    id={`live-${v.id}`}
                    checked={row?.live_writes_enabled ?? false}
                    onCheckedChange={c => toggleLive(v.id, c)}
                    disabled={!setupOk}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

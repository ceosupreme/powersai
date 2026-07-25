import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Trash2, Loader2, ListTree } from 'lucide-react';
import { toast } from 'sonner';

function toSnakeCase(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, '_$1');
}

export function ProjectTypesManagerCard() {
  const { data: types = [], isLoading, refetch } = useProjectTypes();
  const qc = useQueryClient();

  const [dupOpen, setDupOpen] = useState(false);
  const [dupSource, setDupSource] = useState<{ id: string; label: string; is_vertical: boolean } | null>(null);
  const [dupLabel, setDupLabel] = useState('');
  const [dupId, setDupId] = useState('');
  const [dupVertical, setDupVertical] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const idTaken = types.some((t) => t.id === dupId.trim());
  const idValid = /^[a-z][a-z0-9_]*$/.test(dupId.trim());

  const openDuplicate = (t: { id: string; label: string; is_vertical: boolean }) => {
    setDupSource(t);
    const suggestedLabel = `${t.label} Copy`;
    setDupLabel(suggestedLabel);
    setDupId(toSnakeCase(suggestedLabel));
    setDupVertical(!!t.is_vertical);
    setDupOpen(true);
  };

  const submitDuplicate = async () => {
    if (!dupSource) return;
    if (!dupLabel.trim()) { toast.error('Label required'); return; }
    if (!idValid) { toast.error('Id must be snake_case (letters, digits, underscores)'); return; }
    if (idTaken) { toast.error('That id is already taken'); return; }
    setDupBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('duplicate-project-type', {
        body: {
          source_id: dupSource.id,
          new_id: dupId.trim(),
          new_label: dupLabel.trim(),
          is_vertical: dupVertical,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const copied = (data as any)?.copied ?? {};
      toast.success(
        `Duplicated as "${dupLabel.trim()}" — copied ${copied.pillar_templates || 0} pillars, ${copied.project_type_leak_vectors || 0} leak vectors, ${copied.project_type_qualifier_fields || 0} qualifier fields, ${copied.project_type_qualifier_config || 0} config rows.`,
      );
      setDupOpen(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['project-types'] }),
        refetch(),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Duplicate failed');
    } finally {
      setDupBusy(false);
    }
  };

  const deleteType = async (t: { id: string; label: string; project_count: number }) => {
    if (t.id === 'client') {
      toast.error('system default type');
      return;
    }
    if (t.project_count > 0) {
      toast.error(`In use by ${t.project_count} project${t.project_count === 1 ? '' : 's'}`);
      return;
    }
    if (!confirm(`Delete project type "${t.label}"? This removes its pillar, leak-vector, and qualifier templates. Existing projects using it must be reassigned first.`)) return;
    setBusyId(t.id);
    try {
      const { data, error } = await supabase.functions.invoke('delete-project-type', {
        body: { id: t.id },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error === 'system_default_type') { toast.error('system default type'); return; }
      if (d?.error === 'in_use') { toast.error(`In use by ${d.count} project${d.count === 1 ? '' : 's'}`); return; }
      if (d?.error) throw new Error(d.error);
      toast.success(`Removed "${t.label}"`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['project-types'] }),
        refetch(),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTree className="h-4 w-4 text-primary" />
            Project Types
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Duplicate an existing type to spin up a new vertical with its pillars, leak vectors,
            and qualifier fields pre-copied. Delete a type only when no project uses it.
            The <code>client</code> type is the system default and cannot be deleted.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ProjectTypesRows
              types={types}
              busyId={busyId}
              onDuplicate={openDuplicate}
              onDelete={deleteType}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dupOpen} onOpenChange={(o) => !dupBusy && setDupOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate project type</DialogTitle>
            <DialogDescription>
              Copying <span className="font-medium text-foreground">{dupSource?.label}</span> and all its templates into a new type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                value={dupLabel}
                onChange={(e) => {
                  const v = e.target.value;
                  setDupLabel(v);
                  // Live-suggest the id from the label until the user edits the id manually.
                  setDupId((prev) =>
                    prev === toSnakeCase(dupLabel) || prev === '' ? toSnakeCase(v) : prev,
                  );
                }}
                placeholder="e.g. Fitness Studios"
              />
            </div>
            <div className="space-y-1">
              <Label>Id (snake_case)</Label>
              <Input
                value={dupId}
                onChange={(e) => setDupId(e.target.value)}
                className="font-mono text-xs"
                placeholder="fitness_studios"
              />
              {!idValid && dupId.length > 0 && (
                <p className="text-xs text-destructive">Use lowercase letters, digits, and underscores; must start with a letter.</p>
              )}
              {idTaken && (
                <p className="text-xs text-destructive">That id already exists.</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 p-2">
              <div>
                <Label className="text-sm">Vertical</Label>
                <p className="text-xs text-muted-foreground">Show at <code>/qualify/&lt;slug&gt;</code> as a public lander.</p>
              </div>
              <Switch checked={dupVertical} onCheckedChange={setDupVertical} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDupOpen(false)} disabled={dupBusy}>Cancel</Button>
            <Button onClick={submitDuplicate} disabled={dupBusy || !idValid || idTaken || !dupLabel.trim()}>
              {dupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectTypesRows({
  types,
  busyId,
  onDuplicate,
  onDelete,
}: {
  types: Array<{ id: string; label: string; is_vertical: boolean; slug: string }>;
  busyId: string | null;
  onDuplicate: (t: { id: string; label: string; is_vertical: boolean }) => void;
  onDelete: (t: { id: string; label: string; project_count: number }) => void;
}) {
  // Fetch per-type usage counts once.
  const [counts, setCounts] = useCountsFetch(types.map((t) => t.id));
  return (
    <div className="space-y-1">
      {types.map((t) => {
        const inUse = counts[t.id] ?? 0;
        const isClient = t.id === 'client';
        const canDelete = !isClient && inUse === 0;
        return (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{t.label}</span>
                {t.is_vertical && <Badge variant="outline" className="text-[10px]">vertical</Badge>}
                {isClient && <Badge variant="secondary" className="text-[10px]">system default</Badge>}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {t.id} · {inUse} project{inUse === 1 ? '' : 's'}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(t)}
              className="gap-1"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!canDelete || busyId === t.id}
              title={
                isClient
                  ? 'system default type'
                  : inUse > 0
                  ? `in use by ${inUse} project${inUse === 1 ? '' : 's'}`
                  : 'Delete type'
              }
              onClick={() => onDelete({ id: t.id, label: t.label, project_count: inUse })}
            >
              {busyId === t.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className={`h-4 w-4 ${canDelete ? 'text-destructive' : 'text-muted-foreground/40'}`} />}
            </Button>
          </div>
        );
      })}
      {!setCounts /* silence unused warning */ && null}
    </div>
  );
}

// Small internal hook — counts venues per project_type in one grouped read.
import { useEffect, useState as useReactState } from 'react';
function useCountsFetch(ids: string[]): [Record<string, number>, () => void] {
  const [counts, setCounts] = useReactState<Record<string, number>>({});
  const key = ids.slice().sort().join(',');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (ids.length === 0) { setCounts({}); return; }
      const { data } = await supabase
        .from('venues')
        .select('project_type')
        .in('project_type', ids);
      if (cancelled) return;
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const k = r.project_type as string | null;
        if (!k) return;
        c[k] = (c[k] ?? 0) + 1;
      });
      setCounts(c);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const refresh = () => setCounts({});
  return [counts, refresh];
}
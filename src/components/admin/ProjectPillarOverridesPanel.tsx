import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectType } from '@/lib/effectivePillars';

interface Row {
  id?: string;
  pillar_key: string;
  pillar_label: string;
  weight: number;
  sort_order: number;
  data_source: string | null;
}

interface Props {
  projectId: string;
  projectType: ProjectType;
}

export const ProjectPillarOverridesPanel = ({ projectId, projectType }: Props) => {
  const [overrides, setOverrides] = useState<Row[]>([]);
  const [templateRows, setTemplateRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ov, tp] = await Promise.all([
      supabase
        .from('project_pillar_overrides')
        .select('id,pillar_key,pillar_label,weight,sort_order,data_source')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('pillar_templates')
        .select('pillar_key,pillar_label,weight,sort_order,data_source')
        .eq('project_type', projectType)
        .order('sort_order', { ascending: true }),
    ]);
    setOverrides((ov.data || []) as Row[]);
    setTemplateRows((tp.data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId, projectType]);

  const hasOverrides = overrides.length > 0;
  const visibleRows = hasOverrides ? overrides : templateRows;

  const customize = async () => {
    setBusy(true);
    try {
      const payload = templateRows.map((r) => ({
        project_id: projectId,
        pillar_key: r.pillar_key,
        pillar_label: r.pillar_label,
        weight: r.weight,
        sort_order: r.sort_order,
        data_source: r.data_source,
      }));
      const { error } = await supabase.from('project_pillar_overrides').insert(payload);
      if (error) throw error;
      toast.success('Customization started — edit below');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setBusy(false); }
  };

  const resetToDefault = async () => {
    if (!confirm('Reset pillars to type default? Override rows will be deleted.')) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('project_pillar_overrides')
        .delete()
        .eq('project_id', projectId);
      if (error) throw error;
      toast.success('Reset to default');
      load();
    } finally { setBusy(false); }
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setOverrides((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = async (id?: string) => {
    if (!id) return;
    if (!confirm('Remove this pillar override?')) return;
    const { error } = await supabase.from('project_pillar_overrides').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    load();
  };

  const addRow = async () => {
    const key = prompt('New pillar key (snake_case)')?.trim().toLowerCase().replace(/\s+/g, '_');
    const label = prompt('New pillar label')?.trim();
    if (!key || !label) return;
    const { error } = await supabase.from('project_pillar_overrides').insert({
      project_id: projectId,
      pillar_key: key,
      pillar_label: label,
      weight: 25,
      sort_order: overrides.length,
      data_source: null,
    });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const r of overrides) {
        if (!r.id) continue;
        const { error } = await supabase
          .from('project_pillar_overrides')
          .update({
            pillar_label: r.pillar_label,
            weight: r.weight,
            sort_order: r.sort_order,
            data_source: r.data_source,
          })
          .eq('id', r.id);
        if (error) throw error;
      }
      toast.success('Saved');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {hasOverrides ? 'Using project-specific pillars' : `Inheriting "${projectType}" template`}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasOverrides
              ? 'Edits below apply only to this project.'
              : 'Customize to diverge from the template; reset to re-inherit.'}
          </p>
        </div>
        <div className="flex gap-2">
          {hasOverrides ? (
            <Button size="sm" variant="outline" onClick={resetToDefault} disabled={busy} className="gap-1">
              <RotateCcw className="h-4 w-4" /> Reset to default
            </Button>
          ) : (
            <Button size="sm" onClick={customize} disabled={busy} className="gap-1">
              <Plus className="h-4 w-4" /> Customize for this project
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {visibleRows.map((r, idx) => (
          <div key={r.id ?? r.pillar_key} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
            <Input
              className="col-span-3 h-9"
              value={r.pillar_label}
              disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { pillar_label: e.target.value })}
            />
            <Input
              className="col-span-3 h-9 font-mono text-xs"
              value={r.pillar_key}
              disabled
            />
            <Input
              className="col-span-2 h-9"
              type="number"
              value={r.weight}
              disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { weight: Number(e.target.value) })}
            />
            <Input
              className="col-span-1 h-9"
              type="number"
              value={r.sort_order}
              disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { sort_order: Number(e.target.value) })}
            />
            <Input
              className="col-span-2 h-9 text-xs"
              placeholder="data_source"
              value={r.data_source ?? ''}
              disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { data_source: e.target.value || null })}
            />
            {hasOverrides && (
              <Button size="icon" variant="ghost" onClick={() => removeRow(r.id)} className="col-span-1">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {hasOverrides && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
            <Plus className="h-4 w-4" /> Add pillar
          </Button>
          <Button size="sm" onClick={saveAll} disabled={busy} className="gap-1">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      )}
    </div>
  );
};
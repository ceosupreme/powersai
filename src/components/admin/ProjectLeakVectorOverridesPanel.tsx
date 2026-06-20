import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectType } from '@/lib/effectivePillars';

interface Row {
  id?: string;
  name: string;
  detect_signal: string | null;
  dollarize_formula: string | null;
  benchmark: string | null;
  severity: 'headline' | 'supporting';
  sort_order: number;
}

interface Props { projectId: string; projectType: ProjectType; }

export const ProjectLeakVectorOverridesPanel = ({ projectId, projectType }: Props) => {
  const [overrides, setOverrides] = useState<Row[]>([]);
  const [templateRows, setTemplateRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ov, tp] = await Promise.all([
      (supabase as any)
        .from('project_leak_vector_overrides')
        .select('id,name,detect_signal,dollarize_formula,benchmark,severity,sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
      (supabase as any)
        .from('project_type_leak_vectors')
        .select('name,detect_signal,dollarize_formula,benchmark,severity,sort_order')
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
        name: r.name,
        detect_signal: r.detect_signal,
        dollarize_formula: r.dollarize_formula,
        benchmark: r.benchmark,
        severity: r.severity,
        sort_order: r.sort_order,
      }));
      const { error } = await (supabase as any).from('project_leak_vector_overrides').insert(payload);
      if (error) throw error;
      toast.success('Customization started — edit below'); load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const resetToDefault = async () => {
    if (!confirm('Reset leak vectors to type default? Override rows will be deleted.')) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from('project_leak_vector_overrides').delete().eq('project_id', projectId);
      if (error) throw error;
      toast.success('Reset to default'); load();
    } finally { setBusy(false); }
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setOverrides((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = async (id?: string) => {
    if (!id || !confirm('Remove this leak vector override?')) return;
    const { error } = await (supabase as any).from('project_leak_vector_overrides').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    load();
  };

  const addRow = async () => {
    const name = prompt('New leak vector name')?.trim();
    if (!name) return;
    const { error } = await (supabase as any).from('project_leak_vector_overrides').insert({
      project_id: projectId,
      name,
      severity: 'supporting',
      sort_order: overrides.length * 10,
    });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const r of overrides) {
        if (!r.id) continue;
        const { error } = await (supabase as any)
          .from('project_leak_vector_overrides')
          .update({
            name: r.name,
            detect_signal: r.detect_signal,
            dollarize_formula: r.dollarize_formula,
            benchmark: r.benchmark,
            severity: r.severity,
            sort_order: r.sort_order,
          })
          .eq('id', r.id);
        if (error) throw error;
      }
      toast.success('Saved'); load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {hasOverrides ? 'Using project-specific leak vectors' : `Inheriting "${projectType}" template`}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasOverrides ? 'Edits below apply only to this project.' : 'Customize to diverge; reset to re-inherit.'}
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
          <div key={r.id ?? r.name} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
            <Input className="col-span-2 h-9" value={r.name} disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { name: e.target.value })} />
            <Input className="col-span-3 h-9 text-xs" value={r.detect_signal ?? ''} disabled={!hasOverrides}
              placeholder="detect_signal"
              onChange={(e) => updateRow(idx, { detect_signal: e.target.value || null })} />
            <Input className="col-span-3 h-9 text-xs" value={r.dollarize_formula ?? ''} disabled={!hasOverrides}
              placeholder="dollarize_formula"
              onChange={(e) => updateRow(idx, { dollarize_formula: e.target.value || null })} />
            <Input className="col-span-2 h-9 text-xs" value={r.benchmark ?? ''} disabled={!hasOverrides}
              placeholder="benchmark"
              onChange={(e) => updateRow(idx, { benchmark: e.target.value || null })} />
            <Select value={r.severity} disabled={!hasOverrides}
              onValueChange={(v) => updateRow(idx, { severity: v as Row['severity'] })}>
              <SelectTrigger className="col-span-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="headline">headline</SelectItem>
                <SelectItem value="supporting">supporting</SelectItem>
              </SelectContent>
            </Select>
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
            <Plus className="h-4 w-4" /> Add leak vector
          </Button>
          <Button size="sm" onClick={saveAll} disabled={busy} className="gap-1">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      )}
    </div>
  );
};
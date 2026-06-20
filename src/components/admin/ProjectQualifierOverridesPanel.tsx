import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectType } from '@/lib/effectivePillars';

const FIELD_TYPES = ['text', 'select', 'number', 'boolean'] as const;
const CHANNELS = ['web_voice', 'phone', 'chat', 'sms', 'form'] as const;

interface Row {
  id?: string;
  field_key: string;
  field_label: string;
  field_type: typeof FIELD_TYPES[number];
  is_shared: boolean;
  channel: typeof CHANNELS[number] | null;
  sort_order: number;
}

interface Props { projectId: string; projectType: ProjectType; }

export const ProjectQualifierOverridesPanel = ({ projectId, projectType }: Props) => {
  const [overrides, setOverrides] = useState<Row[]>([]);
  const [templateRows, setTemplateRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ov, tp] = await Promise.all([
      (supabase as any)
        .from('project_qualifier_field_overrides')
        .select('id,field_key,field_label,field_type,is_shared,channel,sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true }),
      (supabase as any)
        .from('project_type_qualifier_fields')
        .select('field_key,field_label,field_type,is_shared,channel,sort_order')
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
        field_key: r.field_key,
        field_label: r.field_label,
        field_type: r.field_type,
        is_shared: r.is_shared,
        channel: r.channel,
        sort_order: r.sort_order,
      }));
      const { error } = await (supabase as any).from('project_qualifier_field_overrides').insert(payload);
      if (error) throw error;
      toast.success('Customization started — edit below'); load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const resetToDefault = async () => {
    if (!confirm('Reset qualifier fields to type default? Override rows will be deleted.')) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from('project_qualifier_field_overrides').delete().eq('project_id', projectId);
      if (error) throw error;
      toast.success('Reset to default'); load();
    } finally { setBusy(false); }
  };

  const updateRow = (idx: number, patch: Partial<Row>) =>
    setOverrides((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = async (id?: string) => {
    if (!id || !confirm('Remove this qualifier override?')) return;
    const { error } = await (supabase as any).from('project_qualifier_field_overrides').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    load();
  };

  const addRow = async () => {
    const key = prompt('New field key (snake_case)')?.trim().toLowerCase().replace(/\s+/g, '_');
    const label = prompt('New field label')?.trim();
    if (!key || !label) return;
    const { error } = await (supabase as any).from('project_qualifier_field_overrides').insert({
      project_id: projectId,
      field_key: key,
      field_label: label,
      field_type: 'text',
      is_shared: false,
      channel: null,
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
          .from('project_qualifier_field_overrides')
          .update({
            field_label: r.field_label,
            field_type: r.field_type,
            is_shared: r.is_shared,
            channel: r.channel,
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
            {hasOverrides ? 'Using project-specific qualifier fields' : `Inheriting "${projectType}" template`}
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
          <div key={r.id ?? r.field_key} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
            <Input className="col-span-3 h-9" value={r.field_label} disabled={!hasOverrides}
              onChange={(e) => updateRow(idx, { field_label: e.target.value })} />
            <Input className="col-span-3 h-9 font-mono text-xs" value={r.field_key} disabled />
            <Select value={r.field_type} disabled={!hasOverrides}
              onValueChange={(v) => updateRow(idx, { field_type: v as Row['field_type'] })}>
              <SelectTrigger className="col-span-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={r.channel ?? ''} disabled={!hasOverrides}
              onValueChange={(v) => updateRow(idx, { channel: (v || null) as any })}>
              <SelectTrigger className="col-span-2 h-9 text-xs"><SelectValue placeholder="channel" /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={r.is_shared} disabled={!hasOverrides}
                onCheckedChange={(v) => updateRow(idx, { is_shared: v })} />
              <span className="text-xs text-muted-foreground">shared</span>
            </div>
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
            <Plus className="h-4 w-4" /> Add field
          </Button>
          <Button size="sm" onClick={saveAll} disabled={busy} className="gap-1">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      )}
    </div>
  );
};
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectType } from '@/lib/effectivePillars';

const FIELD_TYPES = ['text', 'select', 'number', 'boolean'] as const;
const CHANNELS = ['web_voice', 'phone', 'chat', 'sms', 'form'] as const;

interface Row {
  id: string;
  project_type: ProjectType;
  field_key: string;
  field_label: string;
  field_type: typeof FIELD_TYPES[number];
  is_shared: boolean;
  channel: typeof CHANNELS[number] | null;
  sort_order: number;
}

interface Props { projectType: ProjectType; }

export const SettingsQualifierFieldsTab = ({ projectType }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const [readyDef, setReadyDef] = useState('');
  const [primaryChannel, setPrimaryChannel] = useState<typeof CHANNELS[number] | ''>('');

  const load = async () => {
    setLoading(true);
    const [fields, cfg] = await Promise.all([
      (supabase as any)
        .from('project_type_qualifier_fields')
        .select('*')
        .eq('project_type', projectType)
        .order('sort_order', { ascending: true }),
      (supabase as any)
        .from('project_type_qualifier_config')
        .select('ready_definition,primary_channel')
        .eq('project_type', projectType)
        .maybeSingle(),
    ]);
    setRows((fields.data || []) as Row[]);
    setReadyDef((cfg.data?.ready_definition as string) || '');
    setPrimaryChannel(((cfg.data?.primary_channel as any) || '') as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectType]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = async (id: string) => {
    if (!confirm('Remove this qualifier field from the template?')) return;
    const { error } = await (supabase as any).from('project_type_qualifier_fields').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Removed'); load();
  };

  const addRow = async () => {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    const label = newLabel.trim();
    if (!key || !label) { toast.error('Key and label required'); return; }
    const { error } = await (supabase as any).from('project_type_qualifier_fields').insert({
      project_type: projectType,
      field_key: key,
      field_label: label,
      field_type: 'text',
      is_shared: false,
      channel: primaryChannel || null,
      sort_order: rows.length * 10,
    });
    if (error) { toast.error(error.message); return; }
    setNewKey(''); setNewLabel(''); load();
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const { error } = await (supabase as any)
          .from('project_type_qualifier_fields')
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
      const { error: cfgErr } = await (supabase as any)
        .from('project_type_qualifier_config')
        .upsert({
          project_type: projectType,
          ready_definition: readyDef || null,
          primary_channel: primaryChannel || null,
        });
      if (cfgErr) throw cfgErr;
      toast.success('Qualifier fields saved'); load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-md p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Ready definition (per type)</Label>
          <Textarea
            rows={2}
            value={readyDef}
            onChange={(e) => setReadyDef(e.target.value)}
            placeholder='e.g. "in-area job of a type the operator wants, with urgency + contactable"'
          />
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Primary channel</Label>
          <Select value={primaryChannel || ''} onValueChange={(v) => setPrimaryChannel(v as any)}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
            <Input className="col-span-3 h-9" value={r.field_label}
              onChange={(e) => update(r.id, { field_label: e.target.value })} />
            <Input className="col-span-3 h-9 font-mono text-xs" value={r.field_key} disabled />
            <Select value={r.field_type} onValueChange={(v) => update(r.id, { field_type: v as any })}>
              <SelectTrigger className="col-span-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={r.channel ?? ''} onValueChange={(v) => update(r.id, { channel: (v || null) as any })}>
              <SelectTrigger className="col-span-2 h-9 text-xs"><SelectValue placeholder="channel" /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={r.is_shared} onCheckedChange={(v) => update(r.id, { is_shared: v })} />
              <span className="text-xs text-muted-foreground">shared</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="col-span-1">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-center border-t pt-3">
        <Input className="col-span-3 h-9" placeholder="Label" value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)} />
        <Input className="col-span-3 h-9 font-mono text-xs" placeholder="field_key (snake_case)"
          value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <Button size="sm" onClick={addRow} className="col-span-2 gap-1">
          <Plus className="h-4 w-4" /> Add field
        </Button>
        <div className="col-span-4 flex justify-end">
          <Button size="sm" onClick={saveAll} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectType } from '@/lib/effectivePillars';

interface PillarTemplate {
  id: string;
  project_type: ProjectType;
  pillar_key: string;
  pillar_label: string;
  weight: number;
  sort_order: number;
  data_source: string | null;
}

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'content_channel', label: 'Content Channel' },
  { value: 'internal_brand', label: 'Internal Brand' },
  { value: 'app_build', label: 'App Build' },
  { value: 'service_offer', label: 'Service Offer' },
];

export const SettingsPillarsTab = () => {
  const [projectType, setProjectType] = useState<ProjectType>('client');
  const [rows, setRows] = useState<PillarTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const load = async (pt: ProjectType) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pillar_templates')
      .select('id,project_type,pillar_key,pillar_label,weight,sort_order,data_source')
      .eq('project_type', pt)
      .order('sort_order', { ascending: true });
    if (error) toast.error('Failed to load templates');
    setRows((data || []) as PillarTemplate[]);
    setLoading(false);
  };

  useEffect(() => { load(projectType); }, [projectType]);

  const update = (id: string, patch: Partial<PillarTemplate>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = async (id: string) => {
    if (!confirm('Remove this pillar from the template? Existing project overrides are not affected.')) return;
    const { error } = await supabase.from('pillar_templates').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Removed');
    load(projectType);
  };

  const addRow = async () => {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    const label = newLabel.trim();
    if (!key || !label) { toast.error('Key and label required'); return; }
    const sort = rows.length;
    const { error } = await supabase.from('pillar_templates').insert({
      project_type: projectType,
      pillar_key: key,
      pillar_label: label,
      weight: 25,
      sort_order: sort,
      data_source: null,
    });
    if (error) { toast.error(error.message); return; }
    setNewKey(''); setNewLabel('');
    load(projectType);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const { error } = await supabase
          .from('pillar_templates')
          .update({
            pillar_label: r.pillar_label,
            weight: r.weight,
            sort_order: r.sort_order,
            data_source: r.data_source,
          })
          .eq('id', r.id);
        if (error) throw error;
      }
      toast.success('Templates saved');
      load(projectType);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const weightSum = rows.reduce((s, r) => s + Number(r.weight || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Pillar Templates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Defaults for each project type. Projects inherit these unless overridden in Project Settings.
            Editing a template affects every project of that type without a per-project override.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Project type</Label>
            <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              Weight sum: <span className={weightSum === 100 ? 'text-signal-green' : 'text-amber-500'}>{weightSum}</span>
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
                  <Input
                    className="col-span-3 h-9"
                    value={r.pillar_label}
                    onChange={(e) => update(r.id, { pillar_label: e.target.value })}
                  />
                  <Input
                    className="col-span-3 h-9 font-mono text-xs"
                    value={r.pillar_key}
                    disabled
                    title="Pillar key is immutable; remove and re-add to change."
                  />
                  <Input
                    className="col-span-2 h-9"
                    type="number"
                    value={r.weight}
                    onChange={(e) => update(r.id, { weight: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-1 h-9"
                    type="number"
                    value={r.sort_order}
                    onChange={(e) => update(r.id, { sort_order: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-2 h-9 text-xs"
                    placeholder="data_source (or blank for manual)"
                    value={r.data_source ?? ''}
                    onChange={(e) => update(r.id, { data_source: e.target.value || null })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="col-span-1">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-12 gap-2 items-center border-t pt-3">
            <Input
              className="col-span-3 h-9"
              placeholder="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Input
              className="col-span-3 h-9 font-mono text-xs"
              placeholder="pillar_key (snake_case)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <Button size="sm" onClick={addRow} className="col-span-2 gap-1">
              <Plus className="h-4 w-4" /> Add pillar
            </Button>
            <div className="col-span-4 flex justify-end">
              <Button size="sm" onClick={saveAll} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
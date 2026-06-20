import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectType } from '@/lib/effectivePillars';

interface Row {
  id: string;
  project_type: ProjectType;
  name: string;
  detect_signal: string | null;
  dollarize_formula: string | null;
  benchmark: string | null;
  severity: 'headline' | 'supporting';
  sort_order: number;
}

interface Props { projectType: ProjectType; }

export const SettingsLeakVectorsTab = ({ projectType }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('project_type_leak_vectors')
      .select('*')
      .eq('project_type', projectType)
      .order('sort_order', { ascending: true });
    if (error) toast.error('Failed to load leak vectors');
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectType]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = async (id: string) => {
    if (!confirm('Remove this leak vector from the template?')) return;
    const { error } = await (supabase as any).from('project_type_leak_vectors').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Removed'); load();
  };

  const addRow = async () => {
    const name = newName.trim();
    if (!name) { toast.error('Name required'); return; }
    const { error } = await (supabase as any).from('project_type_leak_vectors').insert({
      project_type: projectType,
      name,
      severity: 'supporting',
      sort_order: rows.length * 10,
    });
    if (error) { toast.error(error.message); return; }
    setNewName(''); load();
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const { error } = await (supabase as any)
          .from('project_type_leak_vectors')
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
      toast.success('Leak vectors saved'); load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
            <Input className="col-span-2 h-9" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} />
            <Input className="col-span-3 h-9 text-xs" placeholder="detect_signal"
              value={r.detect_signal ?? ''} onChange={(e) => update(r.id, { detect_signal: e.target.value || null })} />
            <Input className="col-span-3 h-9 text-xs" placeholder="dollarize_formula"
              value={r.dollarize_formula ?? ''} onChange={(e) => update(r.id, { dollarize_formula: e.target.value || null })} />
            <Input className="col-span-2 h-9 text-xs" placeholder="benchmark"
              value={r.benchmark ?? ''} onChange={(e) => update(r.id, { benchmark: e.target.value || null })} />
            <Select value={r.severity} onValueChange={(v) => update(r.id, { severity: v as Row['severity'] })}>
              <SelectTrigger className="col-span-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="headline">headline</SelectItem>
                <SelectItem value="supporting">supporting</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="col-span-1">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-2 items-center border-t pt-3">
        <Input className="col-span-4 h-9" placeholder="New leak vector name"
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button size="sm" onClick={addRow} className="col-span-2 gap-1">
          <Plus className="h-4 w-4" /> Add leak vector
        </Button>
        <div className="col-span-6 flex justify-end">
          <Button size="sm" onClick={saveAll} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};
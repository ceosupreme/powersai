import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LogSource {
  id?: string;
  venue_id: string;
  label: string;
  source_type: 'project' | 'section' | 'task';
  asana_gid: string;
  log_type: 'gm' | 'lead' | 'manager' | 'shift';
  is_active: boolean;
  sort_order: number;
  _testing?: boolean;
  _testResult?: { success: boolean; name?: string; task_name?: string; error?: string } | null;
  _dirty?: boolean;
}

interface Props {
  venueId: string;
}

const LOG_TYPES: Array<{ value: LogSource['log_type']; label: string }> = [
  { value: 'gm', label: 'GM Log' },
  { value: 'lead', label: 'Lead Log' },
  { value: 'manager', label: 'Manager Log' },
  { value: 'shift', label: 'Shift Log' },
];

const SOURCE_TYPES: Array<{ value: LogSource['source_type']; label: string; hint: string }> = [
  { value: 'task', label: 'Task', hint: 'Single Asana task — logs are its comments' },
  { value: 'section', label: 'Section', hint: 'All tasks in an Asana section' },
  { value: 'project', label: 'Project', hint: 'All tasks across an Asana project' },
];

export const AsanaLogSourcesEditor = ({ venueId }: Props) => {
  const [sources, setSources] = useState<LogSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('venue_asana_log_sources')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order', { ascending: true });
    if (error) {
      toast.error('Failed to load Asana log sources');
    } else {
      setSources((data || []) as LogSource[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (venueId) fetchSources();
  }, [venueId]);

  const addSource = () => {
    if (sources.filter(s => s.is_active).length >= 4) {
      toast.error('Maximum of 4 active log sources per project');
      return;
    }
    setSources(prev => [
      ...prev,
      {
        venue_id: venueId,
        label: 'New Log Source',
        source_type: 'task',
        asana_gid: '',
        log_type: 'gm',
        is_active: true,
        sort_order: prev.length + 1,
        _dirty: true,
      },
    ]);
  };

  const updateSource = (idx: number, patch: Partial<LogSource>) => {
    setSources(prev => prev.map((s, i) => i === idx ? { ...s, ...patch, _dirty: true, _testResult: null } : s));
  };

  const removeSource = async (idx: number) => {
    const src = sources[idx];
    if (src.id) {
      const { error } = await supabase.from('venue_asana_log_sources').delete().eq('id', src.id);
      if (error) { toast.error('Failed to remove'); return; }
    }
    setSources(prev => prev.filter((_, i) => i !== idx));
    toast.success('Source removed');
  };

  const testSource = async (idx: number) => {
    const src = sources[idx];
    if (!src.asana_gid.trim()) { toast.error('Enter a GID first'); return; }
    setSources(prev => prev.map((s, i) => i === idx ? { ...s, _testing: true, _testResult: null } : s));
    try {
      const body = src.source_type === 'task'
        ? { task_gid: src.asana_gid.trim() }
        : { type: src.source_type, gid: src.asana_gid.trim() };
      const { data, error } = await supabase.functions.invoke('test-asana-connection', { body });
      if (error) throw error;
      setSources(prev => prev.map((s, i) => i === idx ? { ...s, _testing: false, _testResult: data } : s));
    } catch {
      setSources(prev => prev.map((s, i) => i === idx ? { ...s, _testing: false, _testResult: { success: false, error: 'Connection failed' } } : s));
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const dirty = sources.filter(s => s._dirty);
      for (const src of dirty) {
        const payload = {
          venue_id: venueId,
          label: src.label.trim() || 'Log Source',
          source_type: src.source_type,
          asana_gid: src.asana_gid.trim(),
          log_type: src.log_type,
          is_active: src.is_active,
          sort_order: src.sort_order,
        };
        if (!payload.asana_gid) continue;
        if (src.id) {
          const { error } = await supabase.from('venue_asana_log_sources').update(payload).eq('id', src.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('venue_asana_log_sources').insert(payload);
          if (error) throw error;
        }
      }
      toast.success('Log sources saved');
      fetchSources();
    } catch (e: any) {
      toast.error(`Save failed: ${e.message || 'unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  const activeCount = sources.filter(s => s.is_active).length;
  const hasDirty = sources.some(s => s._dirty);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Add up to 4 Asana sources where logs live. Each can be a project, section, or single task.
          </p>
          <Badge variant="secondary" className="mt-1 text-[10px]">
            {activeCount} / 4 active
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addSource}
          disabled={activeCount >= 4}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Source
        </Button>
      </div>

      {sources.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No log sources configured. Click "Add Source" to start.
        </div>
      )}

      {sources.map((src, idx) => (
        <div key={src.id ?? `new-${idx}`} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Input
              value={src.label}
              onChange={e => updateSource(idx, { label: e.target.value })}
              placeholder="Label (e.g. Bar Manager Daily)"
              className="text-sm font-medium"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={src.is_active}
                onCheckedChange={v => updateSource(idx, { is_active: v })}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => removeSource(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Source Type</Label>
              <Select
                value={src.source_type}
                onValueChange={(v: any) => updateSource(idx, { source_type: v })}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="text-sm">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.hint}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Log Type</Label>
              <Select
                value={src.log_type}
                onValueChange={(v: any) => updateSource(idx, { log_type: v })}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Asana GID</Label>
            <div className="flex gap-2">
              <Input
                value={src.asana_gid}
                onChange={e => updateSource(idx, { asana_gid: e.target.value })}
                placeholder="e.g. 1234567890123456"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 shrink-0"
                onClick={() => testSource(idx)}
                disabled={src._testing}
              >
                {src._testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            {src._testResult && (
              src._testResult.success ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="truncate">Connected: {src._testResult.name || src._testResult.task_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{src._testResult.error}</span>
                </div>
              )
            )}
          </div>
        </div>
      ))}

      {hasDirty && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={saveAll} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Log Sources
          </Button>
        </div>
      )}
    </div>
  );
};

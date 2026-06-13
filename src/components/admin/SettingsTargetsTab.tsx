import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Plus, AlertTriangle, DollarSign, Users, Briefcase, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Bar { id: string; name: string; }

interface PeriodConfig {
  id: string;
  bar_id: string;
  name: string | null;
  effective_start: string;
  effective_end: string | null;
  weekly_net_sales_target: number | null;
  weekly_orders_target: number | null;
  weekly_aov_target: number | null;
  discount_pct_target: number | null;
  labor_pct_target: number | null;
  splh_target: number | null;
  schedule_variance_target: number | null;
  overtime_rate_target: number | null;
  task_completion_target: number | null;
  turn_time_target_min: number | null;
  ticket_time_over_20_pct_target: number | null;
  void_rate_target: number | null;
  unpaid_amount_target: number | null;
  weekly_guests_target: number | null;
  tip_pct_target: number | null;
  refund_pct_target: number | null;
  google_rating_target: number | null;
  weight_guest: number | null;
  weight_revenue: number | null;
  weight_labor: number | null;
  weight_operations: number | null;
}

const FIELD_GROUPS = [
  {
    label: 'Revenue Targets', icon: DollarSign,
    fields: [
      { key: 'weekly_net_sales_target', label: 'Weekly Net Sales ($)', type: 'currency' },
      { key: 'weekly_orders_target', label: 'Weekly Orders', type: 'number' },
      { key: 'weekly_aov_target', label: 'Avg Order Value ($)', type: 'currency' },
      { key: 'discount_pct_target', label: 'Discount %', type: 'percent' },
    ],
  },
  {
    label: 'Labor Targets', icon: Briefcase,
    fields: [
      { key: 'labor_pct_target', label: 'Labor %', type: 'percent' },
      { key: 'splh_target', label: 'Sales Per Labor Hour ($)', type: 'currency' },
      { key: 'schedule_variance_target', label: 'Schedule Variance %', type: 'percent' },
      { key: 'overtime_rate_target', label: 'Overtime Rate %', type: 'percent' },
    ],
  },
  {
    label: 'Operations Targets', icon: Briefcase,
    fields: [
      { key: 'task_completion_target', label: 'Task Completion %', type: 'percent' },
      { key: 'turn_time_target_min', label: 'Turn Time (min)', type: 'number' },
      { key: 'ticket_time_over_20_pct_target', label: 'KDS Tickets >20min %', type: 'percent' },
      { key: 'void_rate_target', label: 'Void Rate %', type: 'percent' },
      { key: 'unpaid_amount_target', label: 'Unpaid Amount ($)', type: 'currency' },
    ],
  },
  {
    label: 'Client Experience Targets', icon: Star,
    fields: [
      { key: 'weekly_guests_target', label: 'Weekly Guests', type: 'number' },
      { key: 'tip_pct_target', label: 'Tip %', type: 'percent' },
      { key: 'refund_pct_target', label: 'Refund %', type: 'percent' },
      { key: 'google_rating_target', label: 'Online Reputation Target', type: 'number' },
    ],
  },
];

const WEIGHT_KEYS = ['weight_guest', 'weight_revenue', 'weight_labor', 'weight_operations'] as const;

export const SettingsTargetsTab = () => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<PeriodConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<PeriodConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    supabase.from('venues').select('id, name').order('name').then(({ data }) => setBars(data || []));
  }, []);

  useEffect(() => {
    if (!selectedBarId) { setConfigs([]); setActiveConfig(null); return; }
    setIsLoading(true);
    supabase.from('period_config').select('*').eq('bar_id', selectedBarId)
      .order('effective_start', { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load configs'); return; }
        const items = (data || []) as unknown as PeriodConfig[];
        setConfigs(items);
        if (items.length > 0) { setActiveConfig(items[0]); setFormData(items[0]); }
        else { setActiveConfig(null); setFormData({}); }
        setIsLoading(false);
      });
  }, [selectedBarId]);

  const weightSum = useMemo(() =>
    WEIGHT_KEYS.reduce((s, k) => s + (Number(formData[k]) || 0), 0), [formData]);
  const weightsValid = weightSum === 100;

  const set = (key: string, val: string) => {
    const num = val === '' ? null : Number(val);
    setFormData(p => ({ ...p, [key]: num }));
  };

  const handleSave = async () => {
    if (!selectedBarId) return;
    if (!weightsValid) { toast.error('Pillar weights must sum to 100'); return; }
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      [...FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key)), ...WEIGHT_KEYS].forEach(k => {
        payload[k] = formData[k] ?? null;
      });
      payload.effective_start = formData.effective_start;
      payload.effective_end = formData.effective_end || null;

      if (activeConfig) {
        const { error } = await supabase.from('period_config').update(payload).eq('id', activeConfig.id);
        if (error) throw error;
        toast.success('Targets saved');
      }
    } catch (e: any) { toast.error('Failed to save'); console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleCreateNew = async () => {
    if (!selectedBarId) return;
    setIsCreating(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      // Close previous period
      if (configs.length > 0) {
        await supabase.from('period_config').update({ effective_end: today })
          .eq('id', configs[0].id).is('effective_end', null);
      }
      const { data, error } = await supabase.from('period_config')
        .insert({ bar_id: selectedBarId, effective_start: today })
        .select().single();
      if (error) throw error;
      toast.success('New period created');
      // Refresh
      setSelectedBarId(prev => { setSelectedBarId(null); setTimeout(() => setSelectedBarId(prev), 50); return prev; });
    } catch (e: any) { toast.error('Failed to create period'); console.error(e); }
    finally { setIsCreating(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Period Config Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label>Select Project</Label>
              <Select value={selectedBarId || ''} onValueChange={v => setSelectedBarId(v)}>
                <SelectTrigger><SelectValue placeholder="Choose a bar..." /></SelectTrigger>
                <SelectContent>
                  {bars.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedBarId && (
              <Button variant="outline" className="gap-2 self-end" onClick={handleCreateNew} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New Period
              </Button>
            )}
          </div>

          {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

          {!isLoading && selectedBarId && configs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No period configs. Create one to set targets.</p>
          )}

          {/* Config history */}
          {!isLoading && configs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {configs.map(c => (
                  <Badge key={c.id} variant={c.id === activeConfig?.id ? 'default' : 'outline'}
                  className="cursor-pointer text-xs" onClick={() => { setActiveConfig(c); setFormData(c); }}>
                  {c.name || format(new Date(c.effective_start), 'MMM d, yyyy')}
                  {!c.effective_end && ' → Current'}
                </Badge>
              ))}
            </div>
          )}

          {!isLoading && activeConfig && (
            <>
              {/* Period name */}
              <div className="space-y-1.5">
                <Label>Period Name</Label>
                <Input placeholder="e.g. BASELINE, Q1-2026" value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value || null }))} />
              </div>

              {/* Effective dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Effective Start</Label>
                  <Input type="date" value={formData.effective_start || ''} onChange={e => setFormData(p => ({ ...p, effective_start: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Effective End</Label>
                  <Input type="date" value={formData.effective_end || ''} onChange={e => setFormData(p => ({ ...p, effective_end: e.target.value || null }))} />
                </div>
              </div>

              {/* Target groups */}
              {FIELD_GROUPS.map(group => (
                <div key={group.label} className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <group.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{group.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {group.fields.map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs">{f.label}</Label>
                        <Input type="number" step={f.type === 'percent' ? '0.01' : '1'}
                          value={formData[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pillar Weights */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Pillar Weights</span>
                  </div>
                  <Badge variant={weightsValid ? 'default' : 'destructive'} className="text-xs">
                    {!weightsValid && <AlertTriangle className="h-3 w-3 mr-1" />}
                    Sum: {weightSum}/100
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'weight_guest', label: 'Guest' },
                    { key: 'weight_revenue', label: 'Revenue' },
                    { key: 'weight_labor', label: 'Labor' },
                    { key: 'weight_operations', label: 'Delivery' },
                  ].map(w => (
                    <div key={w.key} className="space-y-1.5">
                      <Label className="text-xs">{w.label}</Label>
                      <Input type="number" value={formData[w.key] ?? ''} onChange={e => set(w.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving || !weightsValid}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Targets
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

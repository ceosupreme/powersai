import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, Save, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectType } from '@/lib/effectivePillars';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { SettingsLeakVectorsTab } from './SettingsLeakVectorsTab';
import { SettingsQualifierFieldsTab } from './SettingsQualifierFieldsTab';
import { ProjectTypesManagerCard } from './ProjectTypesManagerCard';
import { HelpTip } from '@/components/help/HelpTip';
import { HELP_KEYS } from '@/config/helpKeys';

interface PillarTemplate {
  id: string;
  project_type: ProjectType;
  pillar_key: string;
  pillar_label: string;
  weight: number;
  sort_order: number;
  data_source: string | null;
}

const INNER_TABS = ['pillars', 'leak_vectors', 'qualifier_fields'] as const;
type InnerTab = (typeof INNER_TABS)[number];

/** How many active projects use each type, and how many of those already carry their own pillar list. */
function useTypeUsage() {
  return useQuery({
    queryKey: ['admin-type-usage'],
    staleTime: 60_000,
    queryFn: async () => {
      const [venuesRes, overridesRes] = await Promise.all([
        supabase.from('venues').select('id,project_type,is_active,is_prospect_shell'),
        supabase.from('project_pillar_overrides').select('project_id'),
      ]);
      if (venuesRes.error) throw venuesRes.error;
      if (overridesRes.error) throw overridesRes.error;
      const overridden = new Set((overridesRes.data ?? []).map((r: any) => r.project_id as string));
      const usage = new Map<string, { projects: number; ownPillars: number }>();
      for (const v of (venuesRes.data ?? []) as any[]) {
        if (v.is_active === false || v.is_prospect_shell) continue;
        const t = (v.project_type as string) ?? 'client';
        const cur = usage.get(t) ?? { projects: 0, ownPillars: 0 };
        cur.projects += 1;
        if (overridden.has(v.id)) cur.ownPillars += 1;
        usage.set(t, cur);
      }
      return usage;
    },
  });
}

export const SettingsPillarsTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: usage } = useTypeUsage();

  // The address can name the inner tab (?subtab=qualifier_fields) and the type (?type=hvac), so
  // links from the tour, the checklist and the guide land on the exact editor they describe.
  const urlSubtab = searchParams.get('subtab');
  const innerTab: InnerTab = (INNER_TABS as readonly string[]).includes(urlSubtab ?? '')
    ? (urlSubtab as InnerTab)
    : 'pillars';
  const setInnerTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'pillars');
    if (value === 'pillars') next.delete('subtab');
    else next.set('subtab', value);
    setSearchParams(next, { replace: true });
  };

  // Open on the type the address names, else the type most of the active projects use.
  const mostUsedType = useMemo(() => {
    if (!usage || usage.size === 0) return null;
    return [...usage.entries()].sort((a, b) => b[1].projects - a[1].projects)[0][0];
  }, [usage]);
  const [projectType, setProjectTypeState] = useState<ProjectType | null>(searchParams.get('type'));
  useEffect(() => {
    if (projectType || !projectTypes.length) return;
    const fallback = projectTypes.find((pt) => pt.id === mostUsedType)?.id ?? projectTypes[0]?.id ?? 'client';
    setProjectTypeState(fallback);
  }, [projectType, projectTypes, mostUsedType]);
  const setProjectType = (value: ProjectType) => {
    setProjectTypeState(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'pillars');
    next.set('type', value);
    setSearchParams(next, { replace: true });
  };

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

  useEffect(() => { if (projectType) load(projectType); }, [projectType]);

  const update = (id: string, patch: Partial<PillarTemplate>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = async (id: string) => {
    if (!confirm('Remove this pillar from the starting settings? Projects that already have their own pillar list are not affected.')) return;
    const { error } = await supabase.from('pillar_templates').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Removed');
    if (projectType) load(projectType);
  };

  const addRow = async () => {
    if (!projectType) return;
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    const label = newLabel.trim();
    if (!key || !label) { toast.error('Name and ID are both required'); return; }
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
    if (!projectType) return;
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
      toast.success('Starting settings saved');
      load(projectType);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const weightSum = rows.reduce((s, r) => s + Number(r.weight || 0), 0);
  const selected = projectTypes.find((pt) => pt.id === projectType) ?? null;
  const selectedUsage = projectType ? usage?.get(projectType) : undefined;
  const typeLabel = selected?.label ?? projectType ?? '';

  const usageLine = (() => {
    if (!selectedUsage || selectedUsage.projects === 0) {
      return `No active project uses the ${typeLabel} type right now, so changes here only affect projects created later.`;
    }
    const { projects, ownPillars } = selectedUsage;
    const inherit = projects - ownPillars;
    const parts = [`${projects} active project${projects === 1 ? '' : 's'} use${projects === 1 ? 's' : ''} the ${typeLabel} type.`];
    if (ownPillars > 0) parts.push(`${ownPillars} of them ${ownPillars === 1 ? 'has' : 'have'} ${ownPillars === 1 ? 'its' : 'their'} own scorecard and ignore${ownPillars === 1 ? 's' : ''} the pillars below.`);
    if (inherit > 0) parts.push(`${inherit} ${inherit === 1 ? 'follows' : 'follow'} these pillars.`);
    return parts.join(' ');
  })();

  return (
    <div className="space-y-4">
      <HelpTip helpKey={HELP_KEYS.configEditor} title="What this screen is for">
        Every project in HQ has a type, such as Internal Brand, Content Channel, Plumbing or HVAC.
        This screen holds the starting settings a new project of each type begins with: the{' '}
        <strong>pillars</strong> it is scored on, the <strong>leak checks</strong> the Growth Audit runs
        for client businesses, and the <strong>lead quiz questions</strong> the public qualifier page
        asks for client trade types. Your own brands already carry their own scorecards (set on each
        brand's Edit form, Pillars tab), so nothing here changes them.
      </HelpTip>
      <ProjectTypesManagerCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Starting settings by project type
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a type, then edit its pillars, leak checks or lead quiz questions. A project that has
            been given its own list on its Edit form keeps that list and is not affected by changes here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Project type</Label>
            <Select value={projectType ?? ''} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Choose a type" /></SelectTrigger>
              <SelectContent>
                {projectTypes.map((pt) => {
                  const n = usage?.get(pt.id)?.projects ?? 0;
                  return (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.label}{pt.is_vertical ? ' · vertical' : ''} · {n} project{n === 1 ? '' : 's'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {projectType && (
            <p className="text-sm text-muted-foreground">{usageLine}</p>
          )}

          <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
            <TabsList>
              <TabsTrigger value="pillars">Pillars</TabsTrigger>
              <TabsTrigger value="leak_vectors">Leak checks</TabsTrigger>
              <TabsTrigger value="qualifier_fields">Lead quiz questions</TabsTrigger>
            </TabsList>

            <TabsContent value="pillars" className="space-y-4 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground max-w-2xl">
                  A pillar is one scored category, such as Revenue or Brand Presence. Its weight is the
                  share of the overall score it carries, so the weights should add up to 100. A pillar
                  with nothing in "Fills itself from" is scored by hand each week.
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Weights add up to: <span className={weightSum === 100 ? 'text-signal-green' : 'text-amber-500'}>{weightSum}</span>
                  {weightSum !== 100 && ' (should be 100)'}
                </span>
              </div>
              {loading || !projectType ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                    <span className="col-span-3">Pillar name</span>
                    <span className="col-span-3">ID (set once)</span>
                    <span className="col-span-2">Weight %</span>
                    <span className="col-span-1">Order</span>
                    <span className="col-span-2">Fills itself from</span>
                    <span className="col-span-1" />
                  </div>
                  {rows.length === 0 && (
                    <p className="px-2 py-4 text-sm text-muted-foreground">No pillars yet for this type. Add the first one below.</p>
                  )}
                  {rows.map((r) => (
                    <div key={r.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-md p-2">
                      <Input
                        className="col-span-3 h-9"
                        aria-label="Pillar name"
                        value={r.pillar_label}
                        onChange={(e) => update(r.id, { pillar_label: e.target.value })}
                      />
                      <Input
                        className="col-span-3 h-9 font-mono text-xs"
                        aria-label="Pillar ID"
                        value={r.pillar_key}
                        disabled
                        title="The ID is fixed once a pillar exists. To change it, remove the pillar and add it again."
                      />
                      <Input
                        className="col-span-2 h-9"
                        aria-label="Weight percent"
                        type="number"
                        value={r.weight}
                        onChange={(e) => update(r.id, { weight: Number(e.target.value) })}
                      />
                      <Input
                        className="col-span-1 h-9"
                        aria-label="Display order"
                        type="number"
                        value={r.sort_order}
                        onChange={(e) => update(r.id, { sort_order: Number(e.target.value) })}
                      />
                      <Input
                        className="col-span-2 h-9 text-xs"
                        aria-label="Fills itself from"
                        placeholder="blank = scored by hand"
                        title="A data source such as weekly_scorecard.revenue fills this pillar automatically. Leave blank to score it by hand."
                        value={r.data_source ?? ''}
                        onChange={(e) => update(r.id, { data_source: e.target.value || null })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="col-span-1" aria-label="Remove pillar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 items-center border-t pt-3">
                <Input
                  className="col-span-3 h-9"
                  placeholder="New pillar name"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
                <Input
                  className="col-span-3 h-9 font-mono text-xs"
                  placeholder="new_pillar_id"
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
            </TabsContent>

            <TabsContent value="leak_vectors" className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground max-w-2xl">
                A leak check is one known place a business of this type loses money, such as missed
                calls or unanswered reviews. The Growth Audit and Leak Stack run these for client
                businesses and turn each one into a dollar estimate. Your own brands do not use them.
              </p>
              {projectType && <SettingsLeakVectorsTab projectType={projectType} />}
            </TabsContent>

            <TabsContent value="qualifier_fields" className="pt-4 space-y-4">
              {selected?.is_vertical ? (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  These are the questions the public lead quiz asks a visitor at /qualify/{selected.slug ?? selected.id}.
                  Edit them here and the live quiz changes right away. The "Ready definition" tells the
                  quiz what counts as a lead worth calling.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground max-w-2xl">
                  The {typeLabel} type has no public lead quiz, so these questions are not asked
                  anywhere. Only types marked "vertical" (the client trades, such as Plumbing and HVAC)
                  have a quiz page. Pick one of those types above to edit its questions.
                </p>
              )}
              {projectType && <SettingsQualifierFieldsTab projectType={projectType} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

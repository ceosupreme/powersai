import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  composePipeline, methodKey, parseKeyPoints, platformToDestination, recipeVersionString, type JobKind,
} from '@/lib/pipelineComposer';

import { TrafficNotice } from './TrafficNotice';
import { useProjectKpis } from '@/hooks/useProjectKpis';

const T = (t: string) => (supabase as any).from(t);

export interface PipelineRequest {
  newContent?: { title: string; summary: string };
  projectId: string;
  kind: JobKind;
  title: string;
  targetType?: 'content_items' | 'channel_products' | null;
  targetId?: string | null;
  targetKey?: string | null;
  productType?: string | null;
  destinations?: string[];
  monetization?: string[];
  promotion?: string[];
  laneItemKey?: string | null;
  channelMethodId?: string | null;
  goalText?: string | null;
}

interface MethodOpt {
  id: string; title: string; status: string | null; subcategory: string; key: string;
  /** Incomplete guides must not generate fake production steps. */
  available?: boolean;
}

function useMethodOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['pipeline-composer', 'methods'],
    enabled,
    queryFn: async (): Promise<MethodOpt[]> => {
      const { data, error } = await T('knowledge_base').select('id,title,status,subcategory,tags,key_points')
        .in('subcategory', ['product_type', 'destination', 'monetization', 'promotion'])
        .in('status', ['active', 'draft']).order('title');
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => {
        const instructions = parseKeyPoints(r.key_points);
        const hasSteps = ['product_type', 'destination'].includes(r.subcategory)
          ? (instructions.steps?.length ?? 0) > 0
          : (instructions.adds?.length ?? 0) > 0;
        return { ...r, key: methodKey(r) ?? '', available: r.status === 'active' && instructions.planned !== true && hasSteps };
      }).filter((r) => r.key);
    },
  });
}

function MultiPick({ label, options, value, onChange }: { label: string; options: MethodOpt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      {options.length === 0 ? <p className="text-xs text-muted-foreground">None on the shelf.</p> : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = value.includes(o.key);
            const available = o.available !== false;
            return (
              <button key={o.id} type="button" aria-pressed={on} disabled={!available}
                onClick={() => onChange(on ? value.filter((k) => k !== o.key) : [...value, o.key])}
                title={!available ? 'Guide coming: instructions must be finished before this can be included in a plan.' : undefined}
                className={cn('rounded-full border px-3 py-1 text-xs min-h-8',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
                  !available && 'opacity-50 cursor-not-allowed')}>
                {on ? '✓ ' : ''}{o.title}{!available ? ' (guide coming)' : ''}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

export function CreatePipelineDialog({ request, onClose, onCreated }: {
  request: PipelineRequest | null;
  onClose: () => void;
  onCreated?: (jobId: string) => void;
}) {
  const open = !!request;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const methods = useMethodOptions(open);
  const kpis = useProjectKpis(request?.projectId ?? null);
  const brandGoal = useQuery({
    queryKey: ['pipeline-composer', 'brand-goal', request?.projectId],
    enabled: open && !!request?.projectId,
    queryFn: async () => {
      const { data, error } = await T('venues')
        .select('name,north_star').eq('id', request!.projectId).maybeSingle();
      if (error) throw error;
      return data as { name: string; north_star: string | null } | null;
    },
  });
  const channels = useQuery({
    queryKey: ['pipeline-composer', 'channels', request?.projectId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await T('brand_channels').select('platform,status').eq('project_id', request!.projectId);
      if (error) throw error;
      return (data ?? []) as { platform: string; status: string }[];
    },
  });

  const [title, setTitle] = useState('');
  const [productType, setProductType] = useState('');
  const [dest, setDest] = useState<string[]>([]);
  const [mon, setMon] = useState<string[]>([]);
  const [pro, setPro] = useState<string[]>([]);
  const [level, setLevel] = useState('2');
  const [money, setMoney] = useState('');
  const [goalChoice, setGoalChoice] = useState('brand');
  const [goalFree, setGoalFree] = useState('');
  const [nicheIds, setNicheIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!request) { setSeeded(false); return; }
    setTitle(request.title); setProductType(request.productType ?? ''); setLevel('2'); setMoney('');
    setGoalChoice(request.goalText ? 'custom' : 'brand');
    setGoalFree(request.goalText ?? '');
    // Do not silently add a sales channel or monetization playbook to product plans.
    setMon(request.monetization ?? []);
    setPro(request.promotion ?? []);
    setDest(request.destinations ?? []);
  }, [request]);

  useEffect(() => {
    if (!request || seeded || !channels.data || request.destinations?.length || request.kind === 'product') return;
    const keys = channels.data.filter((c) => c.status === 'live')
      .map((c) => platformToDestination(c.platform)).filter(Boolean) as string[];
    setDest([...new Set(keys)]);
    setSeeded(true);
  }, [request, channels.data, seeded]);

  const niches = useQuery({
    queryKey: ['pipeline-composer', 'niches', request?.projectId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await T('knowledge_base').select('id,title,status,tags,key_points')
        .eq('subcategory', 'niche').in('status', ['active', 'draft'])
        .contains('tags', [`venue:${request!.projectId}`]).order('title');
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; status: string | null; tags: string[] | null; key_points: string | null }[];
    },
  });
  const nicheOpts: MethodOpt[] = useMemo(() => (niches.data ?? []).map((n) => ({ id: n.id, title: n.title, status: n.status, subcategory: 'niche', key: n.id })), [niches.data]);
  useEffect(() => {
    if (!request || !niches.data) return;
    const core = niches.data.filter((n) => {
      try {
        const b = JSON.parse(n.key_points ?? '{}')?.brands;
        return Array.isArray(b) && b.some((x: any) => x?.venue_id === request.projectId && x?.role === 'core');
      } catch { return false; }
    }).map((n) => n.id);
    setNicheIds(core);
  }, [request, niches.data]);

  const by = useMemo(() => {
    const g: Record<string, MethodOpt[]> = { product_type: [], destination: [], monetization: [], promotion: [] };
    for (const m of methods.data ?? []) g[m.subcategory]?.push(m);
    return g;
  }, [methods.data]);

  const fixedSteps = request?.kind === 'lane' || request?.kind === 'channel_setup';

  const validProduct = by.product_type.some(m => m.key === productType && m.available !== false);
  const submit = async () => {
    if (!request) return;
    if (!fixedSteps && !validProduct) return toast.error('Choose a product type with a completed how-to guide.');
    if (!fixedSteps) {
      const selectedMethods = [...by.destination.filter(m => dest.includes(m.key)),
        ...by.monetization.filter(m => mon.includes(m.key)),
        ...by.promotion.filter(m => pro.includes(m.key))];
      const unavailable = selectedMethods.filter(m => m.available === false);
      if (unavailable.length) return toast.error(`Complete these guides before building the plan: ${unavailable.map(m => m.title).join(', ')}`);
    }
    setBusy(true);
    try {
      const selectedKpi = (kpis.data ?? []).find(k => goalChoice === 'kpi:' + k.pillar_key + ':' + k.kpi_key);
      const chosenGoal = selectedKpi
        ? 'Improve ' + selectedKpi.kpi_label + (selectedKpi.target == null ? '' : ' toward ' + selectedKpi.target.toLocaleString())
        : goalChoice === 'brand' ? brandGoal.data?.north_star ?? null
          : goalChoice === 'custom' ? goalFree.trim() || null : null;
      if (!chosenGoal?.trim()) {
        toast.error('Choose a business goal, a scorecard target, or describe the result this plan should achieve.');
        setBusy(false);
        return;
      }
      const keep = (ks: string[], opts: MethodOpt[]) => ks.filter((k) => opts.some((o) => o.key === k));
      const { jobId, recipe } = await composePipeline({
        new_content: request.newContent,
        project_id: request.projectId, kind: request.kind, title: title.trim() || request.title,
        target_type: request.targetType ?? null, target_id: request.targetId ?? null, target_key: request.targetKey ?? null,
        product_type: fixedSteps ? null : productType || null,
        destinations: fixedSteps ? [] : keep(dest, by.destination),
        monetization: fixedSteps ? [] : keep(mon, by.monetization),
        promotion: fixedSteps ? [] : keep(pro, by.promotion),
        level: Number(level), money_destination: money.trim() || null,
        goal_text: chosenGoal,
        goal_pillar_key: selectedKpi?.pillar_key ?? null,
        goal_kpi_key: selectedKpi?.kpi_key ?? null,
        lane_item_key: request.laneItemKey ?? null, channel_method_id: request.channelMethodId ?? null,
        niche_ids: nicheIds.filter((id) => nicheOpts.some((o) => o.id === id)),
      });
      if (request.targetType === 'content_items' && request.targetId) {
        const { error } = await T('content_items').update({ recipe_version: recipeVersionString(recipe) }).eq('id', request.targetId);
        if (error) toast.error('Pipeline created, but the recipe could not be saved on the item.');
      }
      qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      qc.invalidateQueries({ queryKey: ['brand-goal-plans', request.projectId] });
      qc.invalidateQueries({ queryKey: ['radar'] });
      qc.invalidateQueries({ queryKey: ['pain-pipelines'] });
      toast.success('Pipeline ready');
      onCreated?.(jobId);
      onClose();
      navigate(`/project/${request.projectId}/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create the pipeline');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Make a work plan</DialogTitle>
          <DialogDescription>
            Choose what you want to accomplish. HQ saves the steps and opens the first one.
            {fixedSteps ? ' This setup uses a fixed sequence.' : ' The finished how-to guides determine the steps.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-title">Title</Label>
            <Input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>What business result should this plan support?</Label>
            <Select value={goalChoice} onValueChange={setGoalChoice}>
              <SelectTrigger aria-label="Business result"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand goal: {brandGoal.data?.north_star || 'Not set yet'}</SelectItem>
                {(kpis.data ?? []).map(k => (
                  <SelectItem key={k.pillar_key + ':' + k.kpi_key} value={'kpi:' + k.pillar_key + ':' + k.kpi_key}>
                    {k.kpi_label}{k.target == null ? '' : ' · Target ' + k.target.toLocaleString()}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Describe another measurable result</SelectItem>
                <SelectItem value="none">No result selected yet</SelectItem>
              </SelectContent>
            </Select>
            {goalChoice === 'custom' && <Input value={goalFree} onChange={e => setGoalFree(e.target.value)}
              placeholder="e.g. Get three qualified event inquiries this month" />}
            <p className="text-xs text-muted-foreground">This states what the plan aims to improve. Actual results are recorded separately.</p>
          </div>
          <MultiPick label="Audience or niche" options={nicheOpts} value={nicheIds} onChange={setNicheIds} />
          {methods.isLoading && !fixedSteps ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : !fixedSteps && (
            <>
              <div className="space-y-1.5">
                <Label>What are you making?</Label>
                {productType && !validProduct && !methods.isLoading && <p role="alert" className="text-sm text-destructive">This product type needs a finished how-to guide. Choose an available type below.</p>}
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue placeholder="Choose a product type" /></SelectTrigger>
                  <SelectContent>
                    {by.product_type.map((m) => (
                      <SelectItem key={m.id} value={m.key} disabled={m.available === false}>{m.title}{m.available === false ? ' (guide coming)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MultiPick label={request?.kind === 'product' ? 'Where will you sell this?' : 'Where will this go?'} options={by.destination} value={dest} onChange={setDest} />
              {request?.kind === 'product' && (
                <p className="text-xs text-muted-foreground">
                  Choose only the selling outlets you want included. Nothing is selected automatically.
                  If you choose none, the plan will cover creating the product, without listing it on a sales outlet.
                </p>
              )}
              <MultiPick label="How should this make money? (optional)" options={by.monetization} value={mon} onChange={setMon} />
              <MultiPick label="How will you promote it? (optional)" options={by.promotion} value={pro} onChange={setPro} />
              {request && <TrafficNotice projectId={request.projectId}
                methods={[...by.monetization.filter((o) => mon.includes(o.key)), ...by.promotion.filter((o) => pro.includes(o.key))]} />}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>How detailed should the work be?</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 · Lightweight</SelectItem>
                  <SelectItem value="2">2 · Standard</SelectItem>
                  <SelectItem value="3">3 · Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-money">Where should sales or leads go?</Label>
              <Input id="pl-money" value={money} onChange={(e) => setMoney(e.target.value)} placeholder="e.g. Etsy shop" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || methods.isLoading || methods.isError || (!fixedSteps && !validProduct)}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create plan & open first step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Prepare a request only. The content item is created with the job after confirmation. */
export async function contentItemFromPain(projectId: string, painText: string, painId?: string): Promise<PipelineRequest> {
  const title = `Answer: ${painText.slice(0, 80)}`;
  return { projectId, kind: 'content', title, targetType: 'content_items',
    targetKey: painId ? `pain:${painId}` : `pain:${painText}`, productType: 'social_piece',
    newContent: { title, summary: painText } };
}

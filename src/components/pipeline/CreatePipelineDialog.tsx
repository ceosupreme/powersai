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
  composePipeline, methodKey, platformToDestination, recipeVersionString, type JobKind,
} from '@/lib/pipelineComposer';

const T = (t: string) => (supabase as any).from(t);

export interface PipelineRequest {
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
}

interface MethodOpt { id: string; title: string; status: string | null; subcategory: string; key: string }

function useMethodOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['pipeline-composer', 'methods'],
    enabled,
    queryFn: async (): Promise<MethodOpt[]> => {
      const { data, error } = await T('knowledge_base').select('id,title,status,subcategory,tags')
        .in('subcategory', ['product_type', 'destination', 'monetization', 'promotion'])
        .in('status', ['active', 'draft']).order('title');
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, key: methodKey(r) ?? '' })).filter((r) => r.key);
    },
  });
}

function MultiPick({ label, options, value, onChange }: { label: string; options: MethodOpt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      {options.length === 0 ? <p className="text-xs text-muted-foreground">None in the library.</p> : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = value.includes(o.key);
            return (
              <button key={o.id} type="button" aria-pressed={on}
                onClick={() => onChange(on ? value.filter((k) => k !== o.key) : [...value, o.key])}
                className={cn('rounded-full border px-3 py-1 text-xs min-h-8',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground')}>
                {on ? '✓ ' : ''}{o.title}{o.status === 'draft' ? ' (planned)' : ''}
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
  const [busy, setBusy] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!request) { setSeeded(false); return; }
    setTitle(request.title); setProductType(request.productType ?? ''); setLevel('2'); setMoney('');
    setMon(request.monetization ?? (request.kind === 'product' ? ['direct_sale'] : request.kind === 'content' ? ['lead_magnet', 'affiliate'] : []));
    setPro(request.promotion ?? (request.kind === 'product' ? ['video_to_product'] : request.kind === 'content' ? ['post_to_lead_magnet'] : []));
    setDest(request.destinations ?? []);
  }, [request]);

  useEffect(() => {
    if (!request || seeded || !channels.data || request.destinations?.length) return;
    const keys = channels.data.filter((c) => ['live', 'dormant', 'planned'].includes(c.status))
      .map((c) => platformToDestination(c.platform)).filter(Boolean) as string[];
    setDest([...new Set(keys)]);
    setSeeded(true);
  }, [request, channels.data, seeded]);

  const by = useMemo(() => {
    const g: Record<string, MethodOpt[]> = { product_type: [], destination: [], monetization: [], promotion: [] };
    for (const m of methods.data ?? []) g[m.subcategory]?.push(m);
    return g;
  }, [methods.data]);

  const fixedSteps = request?.kind === 'lane' || request?.kind === 'channel_setup';

  const submit = async () => {
    if (!request) return;
    setBusy(true);
    try {
      const keep = (ks: string[], opts: MethodOpt[]) => ks.filter((k) => opts.some((o) => o.key === k));
      const { jobId, recipe } = await composePipeline({
        project_id: request.projectId, kind: request.kind, title: title.trim() || request.title,
        target_type: request.targetType ?? null, target_id: request.targetId ?? null, target_key: request.targetKey ?? null,
        product_type: fixedSteps ? null : productType || null,
        destinations: fixedSteps ? [] : keep(dest, by.destination),
        monetization: fixedSteps ? [] : keep(mon, by.monetization),
        promotion: fixedSteps ? [] : keep(pro, by.promotion),
        level: Number(level), money_destination: money.trim() || null,
        lane_item_key: request.laneItemKey ?? null, channel_method_id: request.channelMethodId ?? null,
      });
      if (request.targetType === 'content_items' && request.targetId) {
        const { error } = await T('content_items').update({ recipe_version: recipeVersionString(recipe) }).eq('id', request.targetId);
        if (error) toast.error('Pipeline created, but the recipe could not be saved on the item.');
      }
      qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      qc.invalidateQueries({ queryKey: ['radar'] });
      toast.success('Pipeline created');
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
          <DialogTitle>Create pipeline</DialogTitle>
          <DialogDescription>
            {fixedSteps ? 'This kind of job uses a fixed five-step plan.' : 'Pick the methods. Steps are built from them in order.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-title">Title</Label>
            <Input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {methods.isLoading && !fixedSteps ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : !fixedSteps && (
            <>
              <div className="space-y-1.5">
                <Label>Product type</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue placeholder="Choose a product type" /></SelectTrigger>
                  <SelectContent>
                    {by.product_type.map((m) => (
                      <SelectItem key={m.id} value={m.key}>{m.title}{m.status === 'draft' ? ' (planned)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MultiPick label="Destinations" options={by.destination} value={dest} onChange={setDest} />
              <MultiPick label="Monetization" options={by.monetization} value={mon} onChange={setMon} />
              <MultiPick label="Promotion" options={by.promotion} value={pro} onChange={setPro} />
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['1', '2', '3'].map((l) => <SelectItem key={l} value={l}>Level {l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-money">Money destination</Label>
              <Input id="pl-money" value={money} onChange={(e) => setMoney(e.target.value)} placeholder="e.g. Etsy shop" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!fixedSteps && !productType)}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Answer Bank → content item, then a content pipeline request. */
export async function contentItemFromPain(projectId: string, painText: string): Promise<PipelineRequest> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const title = `Answer: ${painText.slice(0, 80)}`;
  const { data, error } = await T('content_items').insert({
    project_id: projectId, title, stage: 'idea', purpose_type: 'teach', purpose: `From Answer Bank ${today}`,
  }).select('id').single();
  if (error) throw error;
  return { projectId, kind: 'content', title, targetType: 'content_items', targetId: data.id, productType: 'social_piece' };
}

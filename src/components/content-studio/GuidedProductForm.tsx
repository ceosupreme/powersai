import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { assertProductRecipe } from '@/lib/productRecipes';
import { composePipeline } from '@/lib/pipelineComposer';
import { useBrandProjects } from '@/hooks/useContentProduction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function GuidedProductForm({ projectId, productId, title, type, requestKey, onClose, onCreated }: { projectId: string; productId?: string | null; title: string; type?: string | null; requestKey?: string; onClose: () => void; onCreated?: (id: string) => void }) {
  const brands = useBrandProjects();
  const navigate = useNavigate(); const qc = useQueryClient();
  const [brand, setBrand] = useState(projectId); const [name, setName] = useState(title);
  const [slug, setSlug] = useState(type ?? ''); const [busy, setBusy] = useState(false);
  const [stableKey] = useState(requestKey ?? crypto.randomUUID());
  const templates = useQuery({ queryKey: ['product-run-templates'], queryFn: async () => {
    const { data, error } = await supabase.from('content_templates').select('id,slug,title,version,recipe').eq('recipe->>kind', 'product').eq('status', 'ready').is('project_id', null).order('version', { ascending: false });
    if (error) throw error;
    const seen = new Set<string>(); return (data ?? []).filter(t => { assertProductRecipe(t.recipe); if (seen.has(t.slug)) return false; seen.add(t.slug); return true; });
  } });
  const start = async () => {
    if (!brand || !name.trim() || !templates.data?.some(t => t.slug === slug)) return;
    setBusy(true);
    try {
      const { jobId } = await composePipeline({ project_id: brand, kind: 'product', title: name.trim(), product_type: slug, target_type: 'channel_products', target_id: productId, new_product: productId ? undefined : { name: name.trim(), request_key: stableKey }, level: 2, destinations: [] });
      await qc.invalidateQueries({ queryKey: ['product-run-entry'] });
      await qc.invalidateQueries({ queryKey: ['brand-workspace'] });
      onCreated?.(jobId); onClose(); navigate(`/content-studio/run/${jobId}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'The run could not be started.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={v => { if (!v && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Make a product</DialogTitle><DialogDescription>{productId ? 'Choose the guided recipe for this product.' : 'Choose the brand, product type and name.'}</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="space-y-2"><Label>Brand</Label><Select value={brand} onValueChange={setBrand} disabled={!!productId || !!requestKey}><SelectTrigger><SelectValue placeholder="Choose a brand" /></SelectTrigger><SelectContent>{brands.data?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Product type</Label><Select value={slug} onValueChange={setSlug}><SelectTrigger><SelectValue placeholder="Choose a product type" /></SelectTrigger><SelectContent>{templates.data?.map(t => <SelectItem key={t.id} value={t.slug}>{t.slug.replace(/_/g, ' ')} · v{t.version}</SelectItem>)}</SelectContent></Select></div>
      {templates.isError && <p role="alert" className="text-sm text-destructive">Recipes could not be loaded. <Button variant="link" onClick={() => templates.refetch()}>Try again</Button></p>}
      <div className="space-y-2"><Label htmlFor="product-run-name">Product name</Label><Input id="product-run-name" value={name} onChange={e => setName(e.target.value)} disabled={!!productId} /></div>
      <Button className="min-h-12 w-full" disabled={busy || !brand || !name.trim() || !templates.data?.some(t => t.slug === slug)} onClick={start}>{busy ? 'Saving…' : 'Start guided run'}</Button>
    </div>
  </DialogContent></Dialog>;
}
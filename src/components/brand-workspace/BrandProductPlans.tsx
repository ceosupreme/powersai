import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Package } from 'lucide-react';
import { useProjectJobs, useProjectProducts, jobByTarget } from '@/hooks/useBrandWorkspace';
import { CreatePipelineDialog, type PipelineRequest } from '@/components/pipeline/CreatePipelineDialog';
import { productTypeForName } from '@/lib/pipelineComposer';
import { pipelineHref } from '@/lib/ownerWork';
import { formatCurrency } from '@/utils/formatting';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

export function BrandProductPlans({ projectId, readOnly = false }: { projectId: string; readOnly?: boolean }) {
  const products = useProjectProducts(projectId);
  const jobs = useProjectJobs(projectId);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [request, setRequest] = useState<PipelineRequest | null>(null);
  // A parked or finished job must not block a new production plan.
  const byProduct = jobByTarget(
    (jobs.data ?? []).filter(job => job.status !== 'parked' && job.status !== 'finished'),
    'channel_products',
  );
  const items = products.data ?? [];
  const displayed = expanded ? items : items.slice(0, 6);

  if (readOnly) return items.length ? <section className="space-y-3"><h2 className="text-xl font-semibold">What it sells</h2>
    {displayed.map(p => <div key={p.id} className="border-b py-3"><p className="font-medium">{p.name}</p><p className="text-muted-foreground">{p.status || 'Not started'}{p.price != null ? ` · ${formatCurrency(Number(p.price))}` : ''}</p></div>)}
    {items.length > 6 && <Button variant="ghost" className="min-h-11" onClick={() => setExpanded(v => !v)}>{expanded ? 'Show fewer' : 'Show all products'}</Button>}
  </section> : null;

  return <Card>
    <CardContent className="p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left gap-3">
          <span className="flex gap-2 items-start">
            <Package className="h-5 w-5 text-primary shrink-0"/>
            <span><strong className="block">Products and services to launch</strong>
              <span className="block text-xs text-muted-foreground">See what your brand sells and start or resume the work to create it.</span></span>
          </span>
          <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}/>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-3">
          {products.isLoading || jobs.isLoading ? <p className="text-sm text-muted-foreground">Loading your products and plans…</p> :
          products.isError || jobs.isError ? <div className="space-y-2"><p className="text-sm text-destructive">Could not load the brand's products.</p>
            <Button variant="outline" size="sm" onClick={() => { products.refetch(); jobs.refetch(); }}>Try again</Button></div> :
          !items.length ? <p className="text-sm text-muted-foreground">No products are linked to this brand yet. Ask your administrator to add the first offer.</p> :
          <>
            <div className="space-y-2">
              {displayed.map(p => {
                const job = byProduct.get(p.id);
                return <div key={p.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{p.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{p.status || 'Not started'}</span>
                  </div>
                  {p.price != null && <p className="text-xs text-muted-foreground">Price recorded: {formatCurrency(Number(p.price))}</p>}
                  {job ? <Button size="sm" variant="outline" asChild>
                    <Link to={pipelineHref(projectId, job)}>Open production plan</Link>
                  </Button> : <Button size="sm" onClick={() => setRequest({
                    projectId, kind: 'product', title: p.name,
                    targetType: 'channel_products', targetId: p.id,
                    productType: productTypeForName(p.name ?? ''),
                    destinations: [],
                  })}>Make a plan to create this</Button>}
                </div>;
              })}
            </div>
            {items.length > 6 && <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)}>
              {expanded ? 'Show fewer products' : 'Show all ' + items.length + ' products'}
            </Button>}
            <p className="text-xs text-muted-foreground">Production plans include only selling outlets you select. A missing or incomplete how-to guide will be identified instead of creating pretend steps.</p>
          </>}
        </CollapsibleContent>
      </Collapsible>
      <CreatePipelineDialog request={request} onClose={() => setRequest(null)} onCreated={() => void jobs.refetch()} />
    </CardContent>
  </Card>;
}

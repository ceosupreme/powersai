import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ServiceOffer, useServiceOffers, useServiceOfferMutations } from '@/hooks/useServiceOffers';
import { ServiceOfferDialog } from '@/components/offers/ServiceOfferDialog';
import { CollectionToolbar } from '@/components/shared/CollectionToolbar';
import { sortCollection } from '@/lib/collectionSort';
import { toast } from 'sonner';

export default function OffersPage() {
  const { selectedBar, accessibleBars } = useApp();
  const [shared, setShared] = useState(false);
  const scope = shared ? 'shared' : selectedBar?.id;
  const { data: items = [], isLoading, isError, refetch } = useServiceOffers(scope);
  const { remove } = useServiceOfferMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOffer | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  useEffect(() => { setShared(false); setOpen(false); setEditing(null); }, [selectedBar?.id]);
  const filtered = sortCollection(items.filter(o => `${o.name} ${o.description ?? ''} ${o.who_its_for ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())).map(o => ({ ...o, title:o.name, value:o.starter_price })), sort);
  const label = shared ? 'Shared library · no brand assigned' : selectedBar?.bar_name ?? 'All brands & client projects';
  const onDelete = async (id:string) => {
    if (!confirm('Delete this offer?')) return;
    try { await remove.mutateAsync(id); toast.success('Offer deleted'); }
    catch(e:any) { toast.error(e?.message ?? 'Could not delete the offer'); }
  };
  const price = (n:number|null) => n == null ? '—' : Number(n).toLocaleString(undefined,{style:'currency',currency:'USD'});
  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between items-start gap-3"><div><h1 className="text-3xl font-bold">Offers</h1><p className="text-muted-foreground mt-2">{label}</p></div><Button onClick={()=>{setEditing(null);setOpen(true)}}><Plus className="h-4 w-4 mr-2"/>New offer</Button></header>
    <section className="hq-section space-y-3"><h2 className="font-bold">Choose where each offer belongs</h2><p>Offers assigned to a brand follow the main selector. Existing offers without an assignment are in the shared library. Edit an offer to assign it to a brand or client.</p><Button variant="outline" aria-pressed={shared} onClick={()=>setShared(!shared)}>{shared?'Back to selected brands':'View shared library'}</Button></section>
    <CollectionToolbar query={query} onQuery={setQuery} placeholder="Find an offer or audience…" sort={sort} onSort={setSort} count={filtered.length} total={items.length} options={[{value:'name',label:'Name · A to Z'},{value:'newest',label:'Newest first'},{value:'value',label:'Starter price · highest first'}]}/>
    {isError?<section className="hq-section space-y-3" role="alert"><h2 className="font-bold">Offers could not be loaded</h2><p>Your offers are safe. Refresh the page or try again in a moment.</p><Button onClick={()=>refetch()}>Try again</Button></section>:<div className="rounded-lg border bg-card"><Table><TableHeader><TableRow><TableHead>Offer</TableHead><TableHead>Brand / client</TableHead><TableHead>Audience</TableHead><TableHead>Starter</TableHead><TableHead>Premium</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
    {isLoading?<TableRow><TableCell colSpan={7} className="py-8 text-center">Loading offers…</TableCell></TableRow>:filtered.length===0?<TableRow><TableCell colSpan={7} className="py-8 text-center">{query?'No offers match your search.':'No offers in this selection. Create an offer or assign one from the shared library.'}</TableCell></TableRow>:filtered.map(o=><TableRow key={o.id}><TableCell className="font-semibold">{o.name}</TableCell><TableCell>{o.project_id?(accessibleBars.find(b=>b.id===o.project_id)?.bar_name??'Assigned project'):'Shared library'}</TableCell><TableCell className="max-w-xs">{o.who_its_for||'—'}</TableCell><TableCell>{price(o.starter_price)}</TableCell><TableCell>{price(o.premium_price)}</TableCell><TableCell><Badge variant="outline">{o.status==='active'?'Active':'Draft'}</Badge></TableCell><TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${o.name}`} onClick={()=>{setEditing(o);setOpen(true)}}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" disabled={remove.isPending} aria-label={`Delete ${o.name}`} onClick={()=>onDelete(o.id)}><Trash2 className="h-4 w-4"/></Button></div></TableCell></TableRow>)}
    </TableBody></Table></div>}
    <ServiceOfferDialog open={open} onOpenChange={setOpen} offer={editing} defaultProjectId={shared?null:selectedBar?.id}/>
  </div>;
}

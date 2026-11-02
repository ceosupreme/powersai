import { useApp } from "@/context/AppContext";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChannelProduct,
  useChannelProducts,
  useChannelProductMutations,
  useAllProductBrands,
  PRODUCT_STATUSES,
} from "@/hooks/useChannelProducts";
import { ProductDialog } from "@/components/products/ProductDialog";
import { OUTLETS, useAllProductListings } from "@/hooks/useProductListings";
import { formatUSD } from "@/hooks/useChannelRevenue";
import { toast } from "sonner";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";
import { CollectionToolbar } from "@/components/shared/CollectionToolbar";
import { sortCollection } from "@/lib/collectionSort";
import { Label } from "@/components/ui/label";

const ALL = "__all__";

export default function ProductsPage() {
  const { data: items = [], isLoading } = useChannelProducts();
  const { data: brandsByProduct = {} } = useAllProductBrands();
  const { data: listingsByProduct = {} } = useAllProductListings();
  const { remove } = useChannelProductMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelProduct | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { selectedBar, accessibleBars, setSelectedBar, clearSelectedBar } = useApp();
  const linkedProject = searchParams.get("project");
  useEffect(() => {
    if (!linkedProject || accessibleBars.length === 0) return;
    const bar = accessibleBars.find(b => b.id === linkedProject);
    if (bar) setSelectedBar(bar);
    const next = new URLSearchParams(searchParams); next.delete("project");
    setSearchParams(next, { replace: true });
  }, [linkedProject, accessibleBars, setSelectedBar, searchParams, setSearchParams]);
  const brandFilter = selectedBar?.id ?? ALL;
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [outletFilter, setOutletFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');

  const brandOptions = [...accessibleBars].sort((a,b)=>a.bar_name.localeCompare(b.bar_name)).map(b=>[b.id,b.bar_name]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>(PRODUCT_STATUSES as readonly string[]);
    for (const p of items) if (p.status) set.add(p.status);
    return [...set];
  }, [items]);

  const filtered = useMemo(
    () =>
      sortCollection(items.filter((p) => {
        if (!`${p.name} ${p.notes ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
        if (statusFilter !== ALL && (p.status ?? "") !== statusFilter) return false;
        if (brandFilter !== ALL) {
          const brands = brandsByProduct[p.id] ?? [];
          if (!brands.some((b) => b.id === brandFilter)) return false;
        }
        if (outletFilter !== ALL) {
          const listings = listingsByProduct[p.id] ?? [];
          if (!listings.some((l) => l.outlet === outletFilter)) return false;
        }
        return true;
      }).map(p => ({ ...p, title: p.name, value: p.price })), sort),
    [items, statusFilter, brandFilter, brandsByProduct, outletFilter, listingsByProduct, query, sort],
  );

  const setBrandFilter = (value: string) => {
    if(value === ALL) clearSelectedBar();
    else { const bar = accessibleBars.find(b=>b.id===value); if(bar) setSelectedBar(bar); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this product? Linked content items and revenue entries will keep their data but lose the product link.")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products &amp; Courses</h1>
          <p className="text-sm text-muted-foreground">{selectedBar?.bar_name ?? 'All brands & clients'} · products linked to this selection</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Product
        </Button>
      </div>

      <HelpTip helpKey={HELP_KEYS.products} title="Products follow your brand selection">
        The main selector filters products by their linked brands. Choose All brands to see the full catalog, including unassigned products. A product can be linked to more than one brand through its channels.
      </HelpTip>

      <CollectionToolbar query={query} onQuery={setQuery} placeholder="Find a product or course…" sort={sort} onSort={setSort} count={filtered.length} total={items.length}
        options={[{value:'name',label:'Name · A to Z'},{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'value',label:'Price · highest first'}]} />
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px]">
          <Label htmlFor="product-brand">Brand</Label>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger id="product-brand"><SelectValue placeholder="All brands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All brands</SelectItem>
              {brandOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="product-status">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="product-status"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="product-outlet">Outlet</Label>
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger id="product-outlet"><SelectValue placeholder="All outlets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All outlets</SelectItem>
              {OUTLETS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brands</TableHead>
              <TableHead>Outlets</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monthly Sales</TableHead>
              <TableHead>Sales Page</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No products match this brand and these filters. Choose All brands to find unassigned products.</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(brandsByProduct[p.id] ?? []).length === 0
                      ? "—"
                      : (brandsByProduct[p.id] ?? []).map((b) => b.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    {(listingsByProduct[p.id] ?? []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(listingsByProduct[p.id] ?? []).map((l) => (
                          <Badge
                            key={l.id}
                            variant={l.status === "listed" ? "default" : "outline"}
                            className="text-[10px]"
                            title={`${l.outlet} · ${l.status}`}
                          >
                            {l.outlet}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{p.price != null ? formatUSD(p.price) : "—"}</TableCell>
                  <TableCell>{p.funnel_stage || "—"}</TableCell>
                  <TableCell>{p.status ? <Badge variant="outline">{p.status}</Badge> : "—"}</TableCell>
                  <TableCell>{p.monthly_sales != null ? p.monthly_sales : "—"}</TableCell>
                  <TableCell>
                    {p.sales_page_url ? (
                      <a href={p.sales_page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductDialog open={open} onOpenChange={setOpen} product={editing} />
    </div>
  );
}

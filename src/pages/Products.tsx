import { useMemo, useState } from "react";
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

const ALL = "__all__";

export default function ProductsPage() {
  const { data: items = [], isLoading } = useChannelProducts();
  const { data: brandsByProduct = {} } = useAllProductBrands();
  const { data: listingsByProduct = {} } = useAllProductListings();
  const { remove } = useChannelProductMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelProduct | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const brandFilter = searchParams.get("project") || ALL;
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [outletFilter, setOutletFilter] = useState<string>(ALL);

  // Distinct brands across all links, for the filter options
  const brandOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of Object.values(brandsByProduct)) {
      for (const b of list) map.set(b.id, b.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [brandsByProduct]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>(PRODUCT_STATUSES as readonly string[]);
    for (const p of items) if (p.status) set.add(p.status);
    return [...set];
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((p) => {
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
      }),
    [items, statusFilter, brandFilter, brandsByProduct, outletFilter, listingsByProduct],
  );

  const setBrandFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === ALL) next.delete("project");
    else next.set("project", value);
    setSearchParams(next, { replace: true });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products &amp; Courses</h1>
          <p className="text-sm text-muted-foreground">Shared library; tag channels that promote each product</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Product
        </Button>
      </div>

      <HelpTip helpKey={HELP_KEYS.products} title="Account-wide library">
        Products & Courses is shared across all projects — switching projects does NOT change
        this list. Tag the channels that promote each product so you can connect content and
        revenue back to the catalog entry.
      </HelpTip>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px]">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue placeholder="All brands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All brands</SelectItem>
              {brandOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
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
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No products yet.</TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(brandsByProduct[p.id] ?? []).length === 0
                      ? "—"
                      : (brandsByProduct[p.id] ?? []).map((b) => b.name).join(", ")}
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

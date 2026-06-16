import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChannelProduct,
  useChannelProducts,
  useChannelProductMutations,
} from "@/hooks/useChannelProducts";
import { ProductDialog } from "@/components/products/ProductDialog";
import { formatUSD } from "@/hooks/useChannelRevenue";
import { toast } from "sonner";

export default function ProductsPage() {
  const { data: items = [], isLoading } = useChannelProducts();
  const { remove } = useChannelProductMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelProduct | null>(null);

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
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
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No products yet.</TableCell></TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
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
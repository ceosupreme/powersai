import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ChannelProduct,
  FUNNEL_STAGES,
  PRODUCT_STATUSES,
  useChannelProductMutations,
  useContentChannels,
  useProductChannels,
} from "@/hooks/useChannelProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: ChannelProduct | null;
}

const empty = {
  name: "",
  price: "",
  funnel_stage: "core",
  lead_magnet: "",
  sales_page_url: "",
  status: "draft",
  monthly_sales: "",
  notes: "",
};

export function ProductDialog({ open, onOpenChange, product }: Props) {
  const { create, update, setChannels } = useChannelProductMutations();
  const { data: channels = [] } = useContentChannels();
  const { data: existingChannels = [] } = useProductChannels(product?.id);
  const [form, setForm] = useState<any>(empty);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? "",
        price: product.price != null ? String(product.price) : "",
        funnel_stage: product.funnel_stage ?? "core",
        lead_magnet: product.lead_magnet ?? "",
        sales_page_url: product.sales_page_url ?? "",
        status: product.status ?? "draft",
        monthly_sales: product.monthly_sales != null ? String(product.monthly_sales) : "",
        notes: product.notes ?? "",
      });
    } else {
      setForm(empty);
      setSelectedChannels([]);
    }
  }, [product, open]);

  useEffect(() => {
    if (product) setSelectedChannels(existingChannels);
  }, [existingChannels, product]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const toggleChannel = (id: string) =>
    setSelectedChannels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const priceNum = form.price ? parseFloat(form.price) : null;
    const monthlyNum = form.monthly_sales ? parseFloat(form.monthly_sales) : null;
    const payload: any = {
      name: form.name.trim(),
      price: priceNum,
      funnel_stage: form.funnel_stage || null,
      lead_magnet: form.lead_magnet || null,
      sales_page_url: form.sales_page_url || null,
      status: form.status || null,
      monthly_sales: monthlyNum,
      notes: form.notes || null,
    };
    try {
      let productId = product?.id;
      if (product) {
        await update.mutateAsync({ id: product.id, patch: payload });
      } else {
        const created = await create.mutateAsync(payload);
        productId = created.id;
      }
      if (productId) {
        await setChannels.mutateAsync({ productId, projectIds: selectedChannels });
      }
      toast.success(product ? "Product updated" : "Product added");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Price (USD)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div>
              <Label>Funnel Stage</Label>
              <Select value={form.funnel_stage} onValueChange={(v) => set("funnel_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead Magnet</Label>
              <Input value={form.lead_magnet} onChange={(e) => set("lead_magnet", e.target.value)} />
            </div>
            <div>
              <Label>Monthly Sales (manual)</Label>
              <Input type="number" step="1" value={form.monthly_sales} onChange={(e) => set("monthly_sales", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Sales Page URL</Label>
            <Input type="url" value={form.sales_page_url} onChange={(e) => set("sales_page_url", e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div>
            <Label>Channels promoting this product</Label>
            <div className="mt-2 rounded-md border p-3 max-h-48 overflow-y-auto space-y-2">
              {channels.length === 0 ? (
                <p className="text-xs text-muted-foreground">No content channels yet.</p>
              ) : (
                channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedChannels.includes(c.id)}
                      onCheckedChange={() => toggleChannel(c.id)}
                    />
                    {c.bar_name}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending || setChannels.isPending}>
            {product ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
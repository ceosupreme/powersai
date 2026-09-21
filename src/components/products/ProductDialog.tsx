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

import {
  LISTING_STATUSES,
  OUTLETS,
  useProductListingMutations,
  useProductListings,
} from "@/hooks/useProductListings";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: ChannelProduct | null;
}

/** Add, edit and remove outlet listings for a saved product. */
function OutletsEditor({ productId }: { productId: string }) {
  const { data: listings = [], isLoading } = useProductListings(productId);
  const { upsert, remove } = useProductListingMutations();
  const [draft, setDraft] = useState({
    outlet: OUTLETS[0] as string,
    status: "planned" as string,
    url: "",
    price: "",
    listed_at: "",
    notes: "",
  });

  const save = async (row: {
    outlet: string;
    status: string;
    url: string;
    price: string;
    listed_at: string;
    notes: string;
  }) => {
    try {
      await upsert.mutateAsync({
        product_id: productId,
        outlet: row.outlet,
        status: row.status,
        url: row.url || null,
        price: row.price ? parseFloat(row.price) : null,
        listed_at: row.listed_at || null,
        notes: row.notes || null,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save outlet");
    }
  };

  return (
    <div>
      <Label>Outlets</Label>
      <div className="mt-2 rounded-md border divide-y">
        {isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Loading outlets…</p>
        ) : listings.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No outlet listings yet.</p>
        ) : (
          listings.map((l) => (
            <div key={l.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{l.outlet}</span>
                  <Badge variant={l.status === "listed" ? "default" : "outline"} className="text-[10px]">
                    {l.status}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${l.outlet} listing`}
                  onClick={() => remove.mutate({ id: l.id, product_id: productId })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Select
                  value={l.status}
                  onValueChange={(v) =>
                    save({
                      outlet: l.outlet,
                      status: v,
                      url: l.url ?? "",
                      price: l.price != null ? String(l.price) : "",
                      listed_at: l.listed_at ?? "",
                      notes: l.notes ?? "",
                    })
                  }
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-9"
                  placeholder="URL"
                  defaultValue={l.url ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (l.url ?? "") &&
                    save({
                      outlet: l.outlet,
                      status: l.status,
                      url: e.target.value,
                      price: l.price != null ? String(l.price) : "",
                      listed_at: l.listed_at ?? "",
                      notes: l.notes ?? "",
                    })
                  }
                />
                <Input
                  className="h-9"
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  defaultValue={l.price != null ? String(l.price) : ""}
                  onBlur={(e) =>
                    e.target.value !== (l.price != null ? String(l.price) : "") &&
                    save({
                      outlet: l.outlet,
                      status: l.status,
                      url: l.url ?? "",
                      price: e.target.value,
                      listed_at: l.listed_at ?? "",
                      notes: l.notes ?? "",
                    })
                  }
                />
                <Input
                  className="h-9"
                  type="date"
                  aria-label={`${l.outlet} listed date`}
                  defaultValue={l.listed_at ?? ""}
                  onChange={(e) =>
                    save({
                      outlet: l.outlet,
                      status: l.status,
                      url: l.url ?? "",
                      price: l.price != null ? String(l.price) : "",
                      listed_at: e.target.value,
                      notes: l.notes ?? "",
                    })
                  }
                />
              </div>
              <Input
                className="h-9"
                placeholder="Notes"
                defaultValue={l.notes ?? ""}
                onBlur={(e) =>
                  e.target.value !== (l.notes ?? "") &&
                  save({
                    outlet: l.outlet,
                    status: l.status,
                    url: l.url ?? "",
                    price: l.price != null ? String(l.price) : "",
                    listed_at: l.listed_at ?? "",
                    notes: e.target.value,
                  })
                }
              />
            </div>
          ))
        )}
        <div className="p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={draft.outlet} onValueChange={(v) => setDraft((d) => ({ ...d, outlet: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTLETS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LISTING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-9"
              placeholder="URL"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            />
            <Input
              className="h-9"
              type="number"
              step="0.01"
              placeholder="Price"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-9"
              type="date"
              aria-label="Listed date"
              value={draft.listed_at}
              onChange={(e) => setDraft((d) => ({ ...d, listed_at: e.target.value }))}
            />
            <Input
              className="h-9"
              placeholder="Notes"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={upsert.isPending}
            onClick={async () => {
              await save(draft);
              setDraft({ outlet: OUTLETS[0], status: "planned", url: "", price: "", listed_at: "", notes: "" });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add outlet
          </Button>
        </div>
      </div>
    </div>
  );
}

const empty = {
  name: "",
  price: "",
  funnel_stage: "core",
  lead_magnet: "",
  sales_page_url: "",
  status: "idea",
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
                  {[...new Set([...PRODUCT_STATUSES, ...(form.status ? [form.status] : [])])].map((s) => (
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
          {product ? (
            <OutletsEditor productId={product.id} />
          ) : (
            <div>
              <Label>Outlets</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Save the product first, then reopen it to add outlet listings.
              </p>
            </div>
          )}
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
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Trash2, Pencil, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  useServicePackages, useServicePackageMutations,
  TIERS, PRIMARY_CHANNELS,
  type ServicePackage,
} from "@/hooks/useServicePackages";
import { useAutomationBundles } from "@/hooks/useAutomationBundles";

export function SettingsServiceCatalogTab() {
  const { data: pkgs = [], isLoading } = useServicePackages();
  const { data: bundles = [] } = useAutomationBundles({ includeInactive: false });
  const m = useServicePackageMutations();
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, ServicePackage[]>();
    for (const tier of TIERS) map.set(tier, []);
    map.set("Other", []);
    for (const p of pkgs) {
      const t = p.tier && (TIERS as readonly string[]).includes(p.tier) ? p.tier : "Other";
      map.get(t)!.push(p);
    }
    return map;
  }, [pkgs]);

  const bundleName = (id: string | null) =>
    id ? (bundles.find((b) => b.id === id)?.name ?? "Unknown bundle") : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Service Catalog</h3>
          <p className="text-xs text-muted-foreground">
            The packages you sell to clients. Group: tier. Link a package to an Automation Bundle to
            define what gets enrolled when the client is assigned.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New package
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {[...TIERS, "Other"].map((tier) => {
        const rows = grouped.get(tier) ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={tier} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{tier}</h4>
            <div className="space-y-2">
              {rows.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-md p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.name}</span>
                      {p.primary_channel && (
                        <Badge variant="outline" className="text-xs">{p.primary_channel}</Badge>
                      )}
                      {p.fulfillment_bundle_id && (
                        <Badge variant="secondary" className="text-xs">
                          bundle: {bundleName(p.fulfillment_bundle_id)}
                        </Badge>
                      )}
                      {!p.is_active && (
                        <Badge variant="outline" className="text-xs">inactive</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.price_note ?? `${p.one_time_price ? `$${p.one_time_price} one-time` : ""}${
                        p.monthly_price ? `${p.one_time_price ? " + " : ""}$${p.monthly_price}/mo` : ""
                      }`}
                    </div>
                    {(p.items?.length ?? 0) > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc ml-4">
                        {p.items!.map((it) => <li key={it.id}>{it.label}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) =>
                        m.updatePackage.mutate({ id: p.id, patch: { is_active: v } })
                      }
                    />
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete "${p.name}"? Items will be removed.`)) return;
                        try {
                          await m.deletePackage.mutateAsync(p.id);
                          toast.success("Deleted");
                        } catch (e: any) { toast.error(e.message ?? "Failed"); }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <PackageEditor
        open={!!editing || creating}
        pkg={editing}
        onClose={() => { setEditing(null); setCreating(false); }}
      />
    </Card>
  );
}

function PackageEditor({
  open, pkg, onClose,
}: { open: boolean; pkg: ServicePackage | null; onClose: () => void }) {
  const { data: bundles = [] } = useAutomationBundles({ includeInactive: false });
  const m = useServicePackageMutations();
  const isNew = !pkg;
  const [form, setForm] = useState<Partial<ServicePackage>>(
    pkg ?? {
      name: "", tier: "Tier 1", primary_channel: "email",
      one_time_price: 0, monthly_price: 0, currency: "USD",
      price_note: "", description: "", fulfillment_bundle_id: null,
      is_active: true, sort_order: 0,
    },
  );
  const [newItem, setNewItem] = useState("");

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    try {
      if (isNew) {
        await m.createPackage.mutateAsync(form as any);
      } else if (pkg) {
        await m.updatePackage.mutateAsync({ id: pkg.id, patch: form });
      }
      toast.success("Saved");
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "New package" : "Edit package"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 pt-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tier</Label>
              <Select value={form.tier ?? ""} onValueChange={(v) => setForm({ ...form, tier: v })}>
                <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Primary channel</Label>
              <Select
                value={form.primary_channel ?? ""}
                onValueChange={(v) => setForm({ ...form, primary_channel: v as any })}
              >
                <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  {PRIMARY_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>One-time</Label>
              <Input
                type="number"
                value={form.one_time_price ?? 0}
                onChange={(e) => setForm({ ...form, one_time_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Monthly</Label>
              <Input
                type="number"
                value={form.monthly_price ?? 0}
                onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input
                value={form.currency ?? "USD"}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Price note</Label>
            <Input
              value={form.price_note ?? ""}
              onChange={(e) => setForm({ ...form, price_note: e.target.value })}
              placeholder="$1,500–$3,500 setup + $750–$1,500/mo"
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Fulfillment bundle</Label>
            <Select
              value={form.fulfillment_bundle_id ?? "__none"}
              onValueChange={(v) =>
                setForm({ ...form, fulfillment_bundle_id: v === "__none" ? null : v })
              }
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {bundles.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                className="w-24"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Items — only on existing packages */}
          {!isNew && pkg && (
            <div className="space-y-2 pt-3 border-t">
              <Label>Line items</Label>
              <div className="space-y-1">
                {(pkg.items ?? []).map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <Input
                      className="flex-1"
                      defaultValue={it.label}
                      onBlur={(e) => {
                        if (e.target.value !== it.label) {
                          m.updateItem.mutate({ id: it.id, patch: { label: e.target.value } });
                        }
                      }}
                    />
                    <Input
                      type="number"
                      className="w-20"
                      defaultValue={it.sort_order}
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (n !== it.sort_order) {
                          m.updateItem.mutate({ id: it.id, patch: { sort_order: n } });
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => m.deleteItem.mutate(it.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add line item…"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim()) {
                      m.addItem.mutate({
                        package_id: pkg.id,
                        label: newItem.trim(),
                        sort_order: (pkg.items?.length ?? 0) * 10 + 10,
                      });
                      setNewItem("");
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    if (!newItem.trim()) return;
                    m.addItem.mutate({
                      package_id: pkg.id,
                      label: newItem.trim(),
                      sort_order: (pkg.items?.length ?? 0) * 10 + 10,
                    });
                    setNewItem("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
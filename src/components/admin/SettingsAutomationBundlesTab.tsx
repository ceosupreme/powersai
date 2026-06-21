import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save, Package } from "lucide-react";
import { toast } from "sonner";

type AutoKey = "followup_sequence" | "reactivation" | "review_request";
const AUTO_KEYS: AutoKey[] = ["followup_sequence", "reactivation", "review_request"];

interface BundleItem {
  id: string;
  bundle_id: string;
  automation_key: AutoKey;
  default_config: Record<string, unknown>;
  sort_order: number;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  tier: string | null;
  project_type: string | null;
  sort_order: number;
  is_active: boolean;
  items: BundleItem[];
}

export const SettingsAutomationBundlesTab = () => {
  const qc = useQueryClient();
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["admin-automation-bundles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("automation_bundles")
        .select("*, items:automation_bundle_items(*)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Bundle[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-automation-bundles"] });

  const createBundle = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("automation_bundles")
        .insert({ name: "New bundle", sort_order: bundles.length });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Bundle created"); },
    onError: (e: any) => toast.error(e.message || "Create failed"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" /> Automation Bundles
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reusable sets of fulfillment automations. Operators apply a bundle to a
            client in one step from the project's automations panel.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => createBundle.mutate()} disabled={createBundle.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> New bundle
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : bundles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No bundles yet.</p>
          ) : (
            <div className="space-y-3">
              {bundles.map((b) => <BundleEditor key={b.id} bundle={b} onChanged={refresh} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function BundleEditor({ bundle, onChanged }: { bundle: Bundle; onChanged: () => void }) {
  const [local, setLocal] = useState<Bundle>(bundle);
  const [saving, setSaving] = useState(false);

  const usedKeys = new Set(local.items.map((i) => i.automation_key));
  const availableKeys = AUTO_KEYS.filter((k) => !usedKeys.has(k));
  const [newKey, setNewKey] = useState<AutoKey | "">("");

  const updateField = <K extends keyof Bundle>(k: K, v: Bundle[K]) =>
    setLocal((p) => ({ ...p, [k]: v }));

  const saveBundle = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("automation_bundles")
        .update({
          name: local.name,
          description: local.description,
          tier: local.tier,
          project_type: local.project_type,
          sort_order: local.sort_order,
          is_active: local.is_active,
        })
        .eq("id", local.id);
      if (error) throw error;
      toast.success("Saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  const removeBundle = async () => {
    if (!confirm(`Delete bundle "${local.name}"? This does not affect projects already enrolled.`)) return;
    const { error } = await (supabase as any)
      .from("automation_bundles").delete().eq("id", local.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChanged();
  };

  const addItem = async () => {
    if (!newKey) return;
    const { error } = await (supabase as any)
      .from("automation_bundle_items")
      .insert({
        bundle_id: local.id,
        automation_key: newKey,
        default_config: {},
        sort_order: local.items.length,
      });
    if (error) { toast.error(error.message); return; }
    setNewKey("");
    onChanged();
  };

  const updateItemConfig = async (item: BundleItem, text: string) => {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(text); }
    catch { toast.error("Config is not valid JSON"); return; }
    const { error } = await (supabase as any)
      .from("automation_bundle_items")
      .update({ default_config: parsed })
      .eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item config saved");
    onChanged();
  };

  const removeItem = async (item: BundleItem) => {
    const { error } = await (supabase as any)
      .from("automation_bundle_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  return (
    <Card className="p-4 space-y-3 border-border/70">
      <div className="grid grid-cols-12 gap-2 items-center">
        <Input className="col-span-4 h-9" value={local.name}
          onChange={(e) => updateField("name", e.target.value)} placeholder="Bundle name" />
        <Input className="col-span-2 h-9" value={local.tier ?? ""}
          onChange={(e) => updateField("tier", e.target.value || null)} placeholder="tier (optional)" />
        <Input className="col-span-2 h-9" value={local.project_type ?? ""}
          onChange={(e) => updateField("project_type", e.target.value || null)} placeholder="project_type (optional)" />
        <Input className="col-span-1 h-9" type="number" value={local.sort_order}
          onChange={(e) => updateField("sort_order", Number(e.target.value))} />
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={local.is_active} onCheckedChange={(v) => updateField("is_active", v)} />
          <Label className="text-xs">{local.is_active ? "Active" : "Inactive"}</Label>
        </div>
        <Button size="icon" variant="ghost" onClick={removeBundle} className="col-span-1">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <Textarea rows={2} value={local.description ?? ""}
        onChange={(e) => updateField("description", e.target.value)}
        placeholder="Description (what this bundle is for)" />
      <div className="flex justify-end">
        <Button size="sm" onClick={saveBundle} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save bundle
        </Button>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-medium">Items</p>
        {local.items
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((it) => (
            <ItemRow key={it.id} item={it} onSave={(t) => updateItemConfig(it, t)} onDelete={() => removeItem(it)} />
          ))}
        {availableKeys.length > 0 && (
          <div className="flex gap-2 items-end pt-1">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Add automation</Label>
              <Select value={newKey} onValueChange={(v) => setNewKey(v as AutoKey)}>
                <SelectTrigger><SelectValue placeholder="Pick an automation" /></SelectTrigger>
                <SelectContent>
                  {availableKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addItem} disabled={!newKey} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ItemRow({ item, onSave, onDelete }: {
  item: BundleItem;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(JSON.stringify(item.default_config ?? {}, null, 2));
  return (
    <div className="space-y-1 bg-muted/30 rounded-md p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono">{item.automation_key}</span>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      <Textarea rows={5} className="font-mono text-xs" value={text}
        onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onSave(text)}>Save item</Button>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { STAGES, STAGE_LABELS, FORMATS, FORMAT_LABELS } from "./contentStages";
import { ContentItem, useContentItemMutations } from "@/hooks/useContentItems";
import { ContentItemLinkedTasks } from "./ContentItemLinkedTasks";
import { useChannelProducts } from "@/hooks/useChannelProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | null | undefined;
  item?: ContentItem | null;
}

const empty = {
  title: "",
  format: "long_form",
  stage: "idea",
  hook: "",
  cta: "",
  primary_keyword: "",
  affiliate_link: "",
  product_id: "",
  due_date: "",
  scheduled_at: "",
  published_at: "",
  is_repurposed: false,
  is_monetized: false,
};

export function ContentItemDialog({ open, onOpenChange, projectId, item }: Props) {
  const { create, update } = useContentItemMutations(projectId);
  const { data: products = [] } = useChannelProducts();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title ?? "",
        format: item.format ?? "long_form",
        stage: item.stage ?? "idea",
        hook: item.hook ?? "",
        cta: item.cta ?? "",
        primary_keyword: item.primary_keyword ?? "",
        affiliate_link: item.affiliate_link ?? "",
        product_id: item.product_id ?? "",
        due_date: item.due_date ?? "",
        scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : "",
        published_at: item.published_at ? item.published_at.slice(0, 16) : "",
        is_repurposed: !!item.is_repurposed,
        is_monetized: !!item.is_monetized,
      });
    } else {
      setForm(empty);
    }
  }, [item, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload: any = {
      title: form.title.trim(),
      format: form.format || null,
      stage: form.stage,
      hook: form.hook || null,
      cta: form.cta || null,
      primary_keyword: form.primary_keyword || null,
      affiliate_link: form.affiliate_link || null,
      product_id: form.product_id || null,
      due_date: form.due_date || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      is_repurposed: !!form.is_repurposed,
      is_monetized: !!form.is_monetized,
    };
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, patch: payload });
        toast.success("Content item updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Content item created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Content Item" : "New Content Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => set("format", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Hook</Label>
            <Textarea rows={2} value={form.hook} onChange={(e) => set("hook", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CTA</Label>
              <Input value={form.cta} onChange={(e) => set("cta", e.target.value)} />
            </div>
            <div>
              <Label>Primary Keyword</Label>
              <Input value={form.primary_keyword} onChange={(e) => set("primary_keyword", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Affiliate Link</Label>
            <Input type="url" value={form.affiliate_link} onChange={(e) => set("affiliate_link", e.target.value)} />
          </div>
          <div>
            <Label>Linked Product</Label>
            <Select value={form.product_id || "__none__"} onValueChange={(v) => set("product_id", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div>
              <Label>Scheduled</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} />
            </div>
            <div>
              <Label>Published</Label>
              <Input type="datetime-local" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_repurposed} onCheckedChange={(v) => set("is_repurposed", !!v)} />
              Repurposed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_monetized} onCheckedChange={(v) => set("is_monetized", !!v)} />
              Monetized
            </label>
          </div>
          {item && projectId ? (
            <ContentItemLinkedTasks itemId={item.id} projectId={projectId} />
          ) : (
            <p className="text-xs text-muted-foreground border-t pt-3">Save this content item first to add linked tasks.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending}>
            {item ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
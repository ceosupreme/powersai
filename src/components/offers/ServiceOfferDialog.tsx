import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ServiceOffer,
  OFFER_STATUSES,
  useServiceOfferMutations,
} from "@/hooks/useServiceOffers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offer?: ServiceOffer | null;
}

const empty = {
  name: "",
  description: "",
  who_its_for: "",
  problem_solved: "",
  deliverables: "",
  timeline: "",
  starter_price: "",
  premium_price: "",
  best_target: "",
  status: "active",
};

export function ServiceOfferDialog({ open, onOpenChange, offer }: Props) {
  const { create, update } = useServiceOfferMutations();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (offer) {
      setForm({
        name: offer.name ?? "",
        description: offer.description ?? "",
        who_its_for: offer.who_its_for ?? "",
        problem_solved: offer.problem_solved ?? "",
        deliverables: offer.deliverables ?? "",
        timeline: offer.timeline ?? "",
        starter_price: offer.starter_price?.toString() ?? "",
        premium_price: offer.premium_price?.toString() ?? "",
        best_target: offer.best_target ?? "",
        status: offer.status ?? "active",
      });
    } else {
      setForm(empty);
    }
  }, [offer, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const payload: any = {
      name: form.name.trim(),
      description: form.description || null,
      who_its_for: form.who_its_for || null,
      problem_solved: form.problem_solved || null,
      deliverables: form.deliverables || null,
      timeline: form.timeline || null,
      starter_price: form.starter_price ? Number(form.starter_price) : null,
      premium_price: form.premium_price ? Number(form.premium_price) : null,
      best_target: form.best_target || null,
      status: form.status || "active",
    };
    try {
      if (offer) {
        await update.mutateAsync({ id: offer.id, patch: payload });
        toast.success("Offer updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Offer added");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit Offer" : "New Offer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFFER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Who it's for</Label>
              <Textarea rows={2} value={form.who_its_for} onChange={(e) => set("who_its_for", e.target.value)} />
            </div>
            <div>
              <Label>Problem solved</Label>
              <Textarea rows={2} value={form.problem_solved} onChange={(e) => set("problem_solved", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Deliverables</Label>
            <Textarea rows={2} value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Timeline</Label>
              <Input placeholder="e.g. 2-4 weeks" value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
            </div>
            <div>
              <Label>Starter price ($)</Label>
              <Input type="number" value={form.starter_price} onChange={(e) => set("starter_price", e.target.value)} />
            </div>
            <div>
              <Label>Premium price ($)</Label>
              <Input type="number" value={form.premium_price} onChange={(e) => set("premium_price", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Best target</Label>
            <Input value={form.best_target} onChange={(e) => set("best_target", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending}>
            {offer ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
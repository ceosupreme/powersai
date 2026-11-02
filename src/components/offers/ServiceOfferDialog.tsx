import { useApp } from "@/context/AppContext";
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
  defaultProjectId?: string | null;
}

const empty = {
  project_id: "shared",
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

export function ServiceOfferDialog({ open, onOpenChange, offer, defaultProjectId }: Props) {
  const { accessibleBars } = useApp();
  const { create, update } = useServiceOfferMutations();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (offer) {
      setForm({
        project_id: offer.project_id ?? "shared",
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
      setForm({ ...empty, project_id: defaultProjectId ?? "shared" });
    }
  }, [offer, open, defaultProjectId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const payload: any = {
      project_id: form.project_id === "shared" ? null : form.project_id,
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
          <div><Label htmlFor="offer-project">Brand or client project</Label><Select value={form.project_id} onValueChange={v => set("project_id", v)}><SelectTrigger id="offer-project"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shared">Shared library · no brand assigned</SelectItem>{[...accessibleBars].sort((a,b)=>a.bar_name.localeCompare(b.bar_name)).map(b=><SelectItem key={b.id} value={b.id}>{b.bar_name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground mt-2">Brand offers follow the main selector. Shared offers stay in the shared library until you assign them.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="offer-name">Name *</Label>
              <Input id="offer-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
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
            <Label htmlFor="offer-description">Description</Label>
            <Textarea id="offer-description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="offer-who_its_for">Who it's for</Label>
              <Textarea id="offer-who_its_for" rows={2} value={form.who_its_for} onChange={(e) => set("who_its_for", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="offer-problem_solved">Problem solved</Label>
              <Textarea id="offer-problem_solved" rows={2} value={form.problem_solved} onChange={(e) => set("problem_solved", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="offer-deliverables">Deliverables</Label>
            <Textarea id="offer-deliverables" rows={2} value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="offer-timeline">Timeline</Label>
              <Input id="offer-timeline" placeholder="e.g. 2-4 weeks" value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="offer-starter_price">Starter price ($)</Label>
              <Input id="offer-starter_price" type="number" value={form.starter_price} onChange={(e) => set("starter_price", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="offer-premium_price">Premium price ($)</Label>
              <Input id="offer-premium_price" type="number" value={form.premium_price} onChange={(e) => set("premium_price", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="offer-best_target">Best target</Label>
            <Input id="offer-best_target" value={form.best_target} onChange={(e) => set("best_target", e.target.value)} />
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
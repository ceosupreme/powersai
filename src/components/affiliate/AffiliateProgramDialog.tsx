import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AffiliateProgram,
  AFFILIATE_STATUSES,
  COMMISSION_TYPES,
  useAffiliateProgramMutations,
} from "@/hooks/useAffiliatePrograms";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program?: AffiliateProgram | null;
}

const empty = {
  name: "",
  niche: "",
  commission_type: "percentage",
  commission_detail: "",
  link: "",
  status: "applied",
  notes: "",
};

export function AffiliateProgramDialog({ open, onOpenChange, program }: Props) {
  const { create, update } = useAffiliateProgramMutations();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name ?? "",
        niche: program.niche ?? "",
        commission_type: program.commission_type ?? "percentage",
        commission_detail: program.commission_detail ?? "",
        link: program.link ?? "",
        status: program.status ?? "applied",
        notes: program.notes ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [program, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const payload: any = {
      name: form.name.trim(),
      niche: form.niche || null,
      commission_type: form.commission_type || null,
      commission_detail: form.commission_detail || null,
      link: form.link || null,
      status: form.status || null,
      notes: form.notes || null,
    };
    try {
      if (program) {
        await update.mutateAsync({ id: program.id, patch: payload });
        toast.success("Program updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Program added");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{program ? "Edit Affiliate Program" : "New Affiliate Program"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Niche</Label>
              <Input value={form.niche} onChange={(e) => set("niche", e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AFFILIATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commission Type</Label>
              <Select value={form.commission_type} onValueChange={(v) => set("commission_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMISSION_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Commission Detail</Label>
              <Input placeholder='e.g. "8%" or "$10/sale"' value={form.commission_detail} onChange={(e) => set("commission_detail", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Link</Label>
            <Input type="url" value={form.link} onChange={(e) => set("link", e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending}>
            {program ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}